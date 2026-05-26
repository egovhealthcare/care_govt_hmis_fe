import { HttpMethod, Type } from "@/Utils/request/types";

import { BatchRequest, BatchResponse } from "./superBatch";

export default {
  execute: {
    path: "/api/super_batch_request/",
    method: HttpMethod.POST,
    TRes: Type<BatchResponse>(),
    TBody: Type<BatchRequest>(),
  },
} as const;
