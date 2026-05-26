/**
 * Types for the `care_super_batch_be` plug.
 *
 * Mirrors the Pydantic schema in
 * `super_batch_request/api/viewsets/batch_request.py`. Super Batch executes
 * the sub-requests serially inside a single `transaction.atomic()` on the
 * server — if any sub-request returns a status ≥ 300, the whole batch is
 * rolled back and the endpoint responds with HTTP 400. Values from earlier
 * responses can be piped into later requests via `replacements`.
 */

export enum BatchReplacementType {
  body = "body",
  url = "url",
}

export interface BatchResourcePath {
  reference_id: string;
  /** JSONPath into the source response body, or the `{token}` name in a destination URL. */
  path: string;
  type?: BatchReplacementType;
}

export interface BatchReplacement {
  source_path: BatchResourcePath;
  value_path: BatchResourcePath;
}

export interface BatchSubRequest {
  reference_id: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  replacements?: BatchReplacement[];
}

export interface BatchRequest {
  requests: BatchSubRequest[];
}

export interface BatchSubResponse<TData = unknown> {
  reference_id: string;
  status_code: number;
  data: TData;
}

export interface BatchResponse {
  results: BatchSubResponse[];
}
