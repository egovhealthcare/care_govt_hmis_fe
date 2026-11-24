import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { PrintWrapperProps } from "@/components/Print/types";
import type { AccountRead } from "@/types/billing/account/Account";
import accountApi from "@/types/billing/account/accountApi";
import {
  type ChargeItemRead,
  ChargeItemServiceResource,
} from "@/types/billing/chargeItem/chargeItem";
import type { InvoiceRead } from "@/types/billing/invoice/invoice";
import invoiceApi from "@/types/billing/invoice/invoiceApi";
import query from "@/Utils/request/query";

type Item = { title: string; subtitle: string | null };
type Identifier = { label: string; value: string };

/** The fields of the host's `InvoicePrintContent` this transform touches. */
interface InvoiceContent {
  patient: { identifiers: Identifier[] };
  items: Item[];
}


function addServiceResourceAndCategory(
  items: Item[],
  chargeItems: ChargeItemRead[],
  t: TFunction,
): Item[] {
  return items.map((item, i) => {
    const chargeItem = chargeItems[i];
    // Dispensed medicines keep the host's lot and expiry subtitle.
    if (
      chargeItem.service_resource ===
      ChargeItemServiceResource.medication_dispense
    ) {
      return item;
    }
    const subtitle = [
      t(chargeItem.service_resource),
      chargeItem.charge_item_definition?.category?.title,
    ]
      .filter(Boolean)
      .join(" · ");
    return { ...item, subtitle };
  });
}

function addIPNumber(
  identifiers: Identifier[],
  account: AccountRead | undefined,
  t: TFunction,
): Identifier[] {
  const encounter = account?.primary_encounter;
  if (encounter?.encounter_class !== "imp" || !encounter.external_identifier) {
    return identifiers;
  }
  return [
    ...identifiers,
    { label: t("ip_number"), value: encounter.external_identifier },
  ];
}

/**
 * Adds each charge item's origin and category as its subtitle, and the IP
 * number for inpatient accounts. The host builds one content item per charge
 * item, in order. Falls back to the host's content if there are any errors.
 */
function addHmisInvoiceDetails(
  content: InvoiceContent,
  invoice: InvoiceRead,
  account: AccountRead | undefined,
  t: TFunction,
): InvoiceContent {
  try {
    return {
      ...content,
      items: addServiceResourceAndCategory(
        content.items,
        invoice.charge_items,
        t,
      ),
      patient: {
        ...content.patient,
        identifiers: addIPNumber(content.patient.identifiers, account, t),
      },
    };
  } catch (error) {
    console.warn("[care_govt_hmis] invoice print customisation failed", error);
    return content;
  }
}

export function InvoicePrint({ Base, content, ...props }: PrintWrapperProps) {
  const { t } = useTranslation();
  const { facilityId = "", invoiceId = "" } = useParams({ strict: false });

  // Same key and request as the host's PrintInvoice, so this is a cache hit.
  const { data: invoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: query(invoiceApi.retrieveInvoice, {
      pathParams: { facilityId, invoiceId },
    }),
  });

  // The invoice's account is minimal and lacks the primary encounter.
  const accountId = invoice?.account.id;
  const { data: account, isLoading: isAccountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: query(accountApi.retrieveAccount, {
      pathParams: { facilityId, accountId: accountId ?? "" },
    }),
    enabled: !!accountId,
  });

  const patched = useMemo(
    () =>
      content && invoice && !isAccountLoading
        ? addHmisInvoiceDetails(content as InvoiceContent, invoice, account, t)
        : undefined,
    [content, invoice, account, isAccountLoading, t],
  );

  return <Base {...props} content={patched} />;
}
