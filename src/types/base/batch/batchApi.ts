import { HttpMethod, Type } from "@/Utils/request/types";

import { BatchRequestBody, BatchRequestResponse } from "./batch";

export default {
  batchRequest: {
    path: "/api/v1/batch_requests/",
    method: HttpMethod.POST,
    TRes: Type<BatchRequestResponse>(),
    TBody: Type<BatchRequestBody>(),
  },
} as const;
