import { HttpMethod, PaginatedResponse, Type, apiRoutes } from "@/lib/request";

export interface ChargeItemMinimal {
  id: string;
  title?: string;
  status?: string;
}

export default apiRoutes({
  listChargeItems: {
    path: "/api/v1/facility/{facilityId}/charge_item/",
    method: HttpMethod.GET,
    TResponse: Type<PaginatedResponse<ChargeItemMinimal>>(),
  },
});
