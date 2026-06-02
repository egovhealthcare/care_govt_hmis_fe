export const RESET_PERIOD_CHOICES = [
  "none",
  "yearly",
  "monthly",
  "daily",
] as const;

export type ResetPeriod = (typeof RESET_PERIOD_CHOICES)[number];

export interface EncounterConfigurationRead {
  id: string;
  facility: string;
  pattern: string;
  facility_code: string;
  reset_period?: ResetPeriod;
  created_date: string;
  last_updated_date: string;
}

export interface EncounterConfigurationCreate {
  pattern: string;
  facility_code: string;
  reset_period: ResetPeriod;
}
