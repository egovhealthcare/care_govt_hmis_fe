import { HttpMethod, Type } from "@/Utils/request/types";
import {
  EncounterConfigurationRead,
  EncounterConfigurationCreate,
} from "./encounterConfiguration";

export default {
  get: {
    path: "/api/encounter_identifiers/facility/{facility_external_id}/identifier-config/",
    method: HttpMethod.GET,
    TRes: Type<EncounterConfigurationRead>(),
  },
  create: {
    path: "/api/encounter_identifiers/facility/{facility_external_id}/identifier-config/",
    method: HttpMethod.POST,
    TBody: Type<EncounterConfigurationCreate>(),
    TRes: Type<EncounterConfigurationRead>(),
  },
  update: {
    path: "/api/encounter_identifiers/facility/{facility_external_id}/identifier-config/",
    method: HttpMethod.PUT,
    TBody: Type<EncounterConfigurationCreate>(),
    TRes: Type<EncounterConfigurationRead>(),
  },
} as const;
