/**
 * Hook-level override for `care_appointment_plug`.
 *
 * Replaces the host's `useApiMutation(scheduleApi.slots.createAppointment)`
 * options when the user is on the booking page. The plug owns `onSuccess`
 * for the call:
 *
 *   1. Let the host's `mutationFn` create the appointment as usual.
 *   2. Look up charge items linked to that appointment.
 *   3. If there are any → create + issue an invoice and navigate to it
 *      with the payment sheet open.
 *      Otherwise → defer to the host's original `onSuccess`.
 *
 * Either the host runs end-to-end or the plug does — never both.
 *
 * Registered as an import side-effect; the host imports the manifest at
 * load time, which imports this file.
 */
import { navigate } from "raviger";

import { request } from "@/lib/request";
import accountApi from "@/types/api/accountApi";
import appointmentApi, {
  type AppointmentCreate,
  type AppointmentRead,
} from "@/types/api/appointmentApi";
import chargeItemApi from "@/types/api/chargeItemApi";
import invoiceApi from "@/types/api/invoiceApi";

interface OverrideContext {
  pathname: string;
  pathParams: Record<string, string | number | undefined>;
  queryParams: Record<string, string | number | boolean | undefined>;
}

interface MutationOptions<TData = unknown, TVariables = unknown> {
  mutationFn?: (variables: TVariables) => Promise<TData>;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: unknown,
  ) => unknown;
  onError?: (error: Error, variables: TVariables, context: unknown) => unknown;
  [key: string]: unknown;
}

type MutationOverrideFn<TData, TVariables> = (
  hostOptions: MutationOptions<TData, TVariables>,
  ctx: OverrideContext,
) => MutationOptions<TData, TVariables> | null | undefined;

interface CareOverrides {
  addMutation: <TData, TVariables>(
    route: { path: string; method?: string },
    fn: MutationOverrideFn<TData, TVariables>,
  ) => () => void;
}

declare global {
  interface Window {
    __careOverrides?: CareOverrides;
  }
}

// Invoice flow
interface BookingInputs {
  facilityId: string;
  patientId: string;
  appointmentId: string;
}

function readInputs(
  ctx: OverrideContext,
  variables: AppointmentCreate,
  appointment: AppointmentRead,
): BookingInputs | null {
  const facilityId = ctx.pathParams.facilityId;
  if (typeof facilityId !== "string" || !facilityId) return null;
  if (!variables.patient) return null;
  return {
    facilityId,
    patientId: variables.patient,
    appointmentId: appointment.id,
  };
}

async function listAppointmentChargeItemIds({
  facilityId,
  appointmentId,
}: BookingInputs): Promise<string[]> {
  const res = await request(chargeItemApi.listChargeItems, {
    pathParams: { facilityId },
    queryParams: {
      service_resource: "appointment",
      service_resource_id: appointmentId,
      limit: 100,
    },
  });
  return res.results.map((item) => item.id);
}

async function findOpenAccountId({
  facilityId,
  patientId,
}: BookingInputs): Promise<string | null> {
  const res = await request(accountApi.listAccounts, {
    pathParams: { facilityId },
    queryParams: {
      patient: patientId,
      status: "active",
      billing_status: "open",
      limit: 1,
    },
  });
  return res.results[0]?.id ?? null;
}

async function createAndIssueInvoice(
  facilityId: string,
  accountId: string,
  chargeItemIds: string[],
): Promise<string> {
  const draft = await request(invoiceApi.createInvoice, {
    pathParams: { facilityId },
    body: {
      status: "draft",
      account: accountId,
      charge_items: chargeItemIds,
    },
  });
  await request(invoiceApi.updateInvoice, {
    pathParams: { facilityId, invoiceId: draft.id },
    body: {
      status: "issued",
      issue_date: new Date().toISOString(),
      account: accountId,
      charge_items: chargeItemIds,
    },
  });
  return draft.id;
}

function navigateToInvoice(
  { facilityId, patientId, appointmentId }: BookingInputs,
  invoiceId: string,
) {
  const sourceUrl = `/facility/${facilityId}/patient/${patientId}/appointments/${appointmentId}`;
  navigate(
    `/facility/${facilityId}/billing/invoices/${invoiceId}` +
      `?payment=open&sourceUrl=${encodeURIComponent(sourceUrl)}`,
  );
}

// Override
const PATH_PREFIX = "/patients/home";

const appointmentMutationOverride: MutationOverrideFn<
  AppointmentRead,
  AppointmentCreate
> = (hostOptions, ctx) => {
  // Only intercept the booking flow; everywhere else the host runs unchanged.
  if (!ctx.pathname.includes(PATH_PREFIX)) return null;

  return {
    ...hostOptions,
    onSuccess: async (appointment, variables, context) => {
      const inputs = readInputs(ctx, variables, appointment);
      const chargeItemIds = inputs
        ? await listAppointmentChargeItemIds(inputs)
        : [];

      // No charge items → nothing to invoice; let the host's UX run.
      if (!inputs || chargeItemIds.length === 0) {
        return hostOptions.onSuccess?.(appointment, variables, context);
      }

      const accountId = await findOpenAccountId(inputs);
      if (!accountId) {
        return hostOptions.onSuccess?.(appointment, variables, context);
      }

      const invoiceId = await createAndIssueInvoice(
        inputs.facilityId,
        accountId,
        chargeItemIds,
      );

      navigateToInvoice(inputs, invoiceId);
    },
  };
};

// Registration
export function registerApiOverrides(): () => void {
  const api = window.__careOverrides;
  if (!api) {
    console.warn(
      "[care_appointment_plug] __careOverrides unavailable; skipping registration.",
    );
    return () => {};
  }

  return api.addMutation(
    appointmentApi.createAppointment,
    appointmentMutationOverride,
  );
}

registerApiOverrides();
