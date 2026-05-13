/**
 * Invoice flow for the appointment-plug.
 *
 * After the host's `createAppointment` mutation resolves successfully, this
 * helper:
 *   1. Lists charge items linked to the new appointment.
 *   2. Finds an active billable account for the patient.
 *   3. Creates a draft invoice and immediately moves it to `issued`.
 *
 * Returns the invoice id on success, or `null` when there is nothing to bill
 * (no charge items, no open account, or any soft failure). Callers should
 * fall back to the host's default post-create UX in the `null` case.
 */
import accountApi from "@/types/billing/account/accountApi";
import chargeItemApi from "@/types/billing/chargeItem/chargeItemApi";
import invoiceApi from "@/types/billing/invoice/invoiceApi";
import { InvoiceStatus } from "@/types/billing/invoice/invoice";
import { callApi } from "@/Utils/request/query";

export interface InvoiceFlowInputs {
  facilityId: string;
  patientId: string;
  appointmentId: string;
  isPayment?: boolean;
}

async function listAppointmentChargeItemIds({
  facilityId,
  appointmentId,
}: InvoiceFlowInputs): Promise<string[]> {
  const res = await callApi(chargeItemApi.listChargeItem, {
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
}: InvoiceFlowInputs): Promise<string | null> {
  const res = await callApi(accountApi.listAccount, {
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
  const draft = await callApi(invoiceApi.createInvoice, {
    pathParams: { facilityId },
    body: {
      status: InvoiceStatus.draft,
      account: accountId,
      charge_items: chargeItemIds,
    },
  });
  await callApi(invoiceApi.updateInvoice, {
    pathParams: { facilityId, invoiceId: draft.id },
    body: {
      status: InvoiceStatus.issued,
      issue_date: new Date().toISOString(),
      account: accountId,
      charge_items: chargeItemIds,
    },
  });
  return draft.id;
}

/**
 * Run the full appointment → invoice flow. Resolves to the new invoice id, or
 * `null` when the appointment had nothing billable.
 */
export async function runInvoiceFlow(
  inputs: InvoiceFlowInputs,
): Promise<string | null> {
  const chargeItemIds = await listAppointmentChargeItemIds(inputs);
  if (chargeItemIds.length === 0) return null;

  const accountId = await findOpenAccountId(inputs);
  if (!accountId) return null;

  return createAndIssueInvoice(inputs.facilityId, accountId, chargeItemIds);
}

/**
 * Build the URL the user should land on after a successful invoice creation.
 * The `payment=open` flag and `sourceUrl` are consumed by the host's billing
 * page to open the payment sheet and offer a "back to appointment" link.
 */
export function buildInvoiceUrl(
  { facilityId, patientId, appointmentId, isPayment }: InvoiceFlowInputs,
  invoiceId: string,
): string {
  const sourceUrl = `/facility/${facilityId}/patient/${patientId}/appointments/${appointmentId}`;
  return (
    `/facility/${facilityId}/billing/invoices/${invoiceId}` +
    `?${isPayment && "is_payment=true"}&sourceUrl=${encodeURIComponent(sourceUrl)}`
  );
}
