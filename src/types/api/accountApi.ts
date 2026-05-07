import { HttpMethod, PaginatedResponse, Type, apiRoutes } from "@/lib/request";

export interface AccountMinimal {
  id: string;
  name?: string;
  status?: string;
  billing_status?: string;
}

export default apiRoutes({
  listAccounts: {
    path: "/api/v1/facility/{facilityId}/account/",
    method: HttpMethod.GET,
    TResponse: Type<PaginatedResponse<AccountMinimal>>(),
  },
});
