/**
 * Invoice flow for the appointment-plug.
 *
 * After the host's `createAppointment` mutation resolves successfully, this
 * helper:
 *   1. Lists charge items linked to the new appointment *and* finds an
 *      active billable account for the patient — both as one normal
 *      `/api/v1/batch_requests/` call.
 *   2. Creates a draft invoice and immediately moves it to `issued`, both
 *      submitted as a single transactional `care_super_batch_be` request.
 *
 * Returns the invoice id on success, or `null` when there is nothing to bill
 * (no charge items, no open account, or any soft failure). Callers should
 * fall back to the host's default post-create UX in the `null` case.
 */
import { AccountBase } from "@/types/billing/account/Account";
import { ChargeItemRead } from "@/types/billing/chargeItem/chargeItem";
import { InvoiceRead, InvoiceStatus } from "@/types/billing/invoice/invoice";
import batchApi from "@/types/base/batch/batchApi";
import { BatchReplacementType } from "@/types/superBatch/superBatch";
import superBatchApi from "@/types/superBatch/superBatchApi";
import { callApi } from "@/Utils/request/query";
import { PaginatedResponse } from "@/Utils/request/types";
import { makeUrl } from "@/Utils/request/utils";

export interface InvoiceFlowInputs {
  facilityId: string;
  patientId: string;
  appointmentId: string;
  isPayment?: boolean;
}

export class InvoiceIssueError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "InvoiceIssueError";
    this.cause = cause;
  }
}

interface ListingsResult {
  chargeItemIds: string[];
  accountId: string | null;
}

async function fetchChargeItemsAndAccount({
  facilityId,
  patientId,
  appointmentId,
}: InvoiceFlowInputs): Promise<ListingsResult> {
  const chargeItemsUrl = makeUrl(
    "/api/v1/facility/{facilityId}/charge_item/",
    {
      service_resource: "appointment",
      service_resource_id: appointmentId,
      limit: 100,
    },
    { facilityId },
  );
  const accountUrl = makeUrl(
    "/api/v1/facility/{facilityId}/account/",
    {
      patient: patientId,
      status: "active",
      billing_status: "open",
      limit: 1,
    },
    { facilityId },
  );

  const batch = await callApi(batchApi.batchRequest, {
    silent: true,
    body: {
      requests: [
        {
          reference_id: "chargeItems",
          url: chargeItemsUrl,
          method: "GET",
          body: {},
        },
        {
          reference_id: "account",
          url: accountUrl,
          method: "GET",
          body: {},
        },
      ],
    },
  });

  const chargeItemsRes = batch.results.find(
    (r) => r.reference_id === "chargeItems",
  )?.data as PaginatedResponse<ChargeItemRead> | undefined;
  const accountRes = batch.results.find((r) => r.reference_id === "account")
    ?.data as PaginatedResponse<AccountBase> | undefined;

  return {
    chargeItemIds: chargeItemsRes?.results.map((item) => item.id) ?? [],
    accountId: accountRes?.results[0]?.id ?? null,
  };
}

async function createAndIssueInvoice(
  facilityId: string,
  accountId: string,
  chargeItemIds: string[],
): Promise<string> {
  const sharedBody = {
    account: accountId,
    charge_items: chargeItemIds,
  };

  // The draft + issue mutations are sent to `care_super_batch_be` as a single
  // transactional batch. The draft's `id` is piped into the issue request's
  // URL via the `{invoiceId}` token (see Super Batch's `find_and_replace_data`
  // for URL-token semantics).
  let batch;
  try {
    batch = await callApi(superBatchApi.execute, {
      silent: true,
      body: {
        requests: [
          {
            reference_id: "draft",
            url: `/api/v1/facility/${facilityId}/invoice/`,
            method: "POST",
            body: { ...sharedBody, status: InvoiceStatus.draft },
          },
          {
            reference_id: "issue",
            url: `/api/v1/facility/${facilityId}/invoice/{invoiceId}/`,
            method: "PUT",
            body: {
              ...sharedBody,
              status: InvoiceStatus.issued,
              issue_date: new Date().toISOString(),
            },
            replacements: [
              {
                source_path: { reference_id: "draft", path: "id" },
                value_path: {
                  reference_id: "issue",
                  path: "invoiceId",
                  type: BatchReplacementType.url,
                },
              },
            ],
          },
        ],
      },
    });
  } catch (err) {
    throw new InvoiceIssueError("Failed to create and issue invoice", err);
  }

  const issued = batch.results.find((r) => r.reference_id === "issue")
    ?.data as InvoiceRead | undefined;
  if (!issued?.id) {
    throw new InvoiceIssueError("Error issuing Invoice");
  }
  return issued.id;
}

/**
 * Run the full appointment → invoice flow. Resolves to the new invoice id, or
 * `null` when the appointment had nothing billable.
 */
export async function runInvoiceFlow(
  inputs: InvoiceFlowInputs,
): Promise<string | null> {
  const { chargeItemIds, accountId } =
    await fetchChargeItemsAndAccount(inputs);
  if (chargeItemIds.length === 0 || !accountId) return null;

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
    `${isPayment && "/pay"}?sourceUrl=${encodeURIComponent(sourceUrl)}`
  );
}
