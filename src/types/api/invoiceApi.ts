import { HttpMethod, Type, apiRoutes } from "@/lib/request";

export interface InvoiceMinimal {
  id: string;
  status: string;
  account: string;
  charge_items: string[];
  issue_date?: string;
}

export interface InvoiceCreateBody {
  status: string;
  account: string;
  charge_items: string[];
  issue_date?: string;
}

export default apiRoutes({
  createInvoice: {
    path: "/api/v1/facility/{facilityId}/invoice/",
    method: HttpMethod.POST,
    TResponse: Type<InvoiceMinimal>(),
    TRequest: Type<InvoiceCreateBody>(),
  },
  updateInvoice: {
    path: "/api/v1/facility/{facilityId}/invoice/{invoiceId}/",
    method: HttpMethod.PUT,
    TResponse: Type<InvoiceMinimal>(),
    TRequest: Type<InvoiceCreateBody>(),
  },
});
