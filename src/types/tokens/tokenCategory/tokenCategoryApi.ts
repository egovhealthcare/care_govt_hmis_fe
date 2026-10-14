import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";

import { TokenCategoryRead } from "@/types/tokens/tokenCategory/tokenCategory";

export default {
  list: {
    path: "/api/v1/facility/{facility_id}/token/category/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<TokenCategoryRead>>(),
  },
} as const;
