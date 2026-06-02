import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
import {
  ENCOUNTER_CLASS,
} from "@/types/emr/encounter/encounter";
import { RESET_PERIOD_CHOICES } from "@/types/emr/encounterConfiguration/encounterConfiguration";
import encounterConfigurationApi from "@/types/emr/encounterConfiguration/encounterConfigurationApi";

const encounterConfigSchema = z.object({
  pattern: z.string().min(1, "Pattern is required").max(128),
  facility_code: z.string().max(16),
  reset_period: z.enum(RESET_PERIOD_CHOICES),
  enabled_encounter_classes: z
    .array(z.enum(ENCOUNTER_CLASS))
    .min(1, "At least one encounter class is required"),
});

type EncounterConfigFormValues = z.infer<typeof encounterConfigSchema>;

interface EncounterExternalIdentifierSettingsProps {
  facilityId: string;
}

export default function EncounterExternalIdentifierSettings({
  facilityId: _facilityId,
}: EncounterExternalIdentifierSettingsProps) {
  const { t } = useTranslation();
  const { facility, facilityId } = useCurrentFacility();
  const [editing, setEditing] = useState(false);

  const queryClient = useQueryClient();

  const { data: encounterConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ["encounter_configuration", facilityId],
    queryFn: query(encounterConfigurationApi.get, {
      pathParams: { facility_external_id: facilityId },
    }),
    enabled: !!facilityId,
  });

  const form = useForm<EncounterConfigFormValues>({
    resolver: zodResolver(encounterConfigSchema),
    defaultValues: {
      pattern: "",
      facility_code: "",
      reset_period: RESET_PERIOD_CHOICES[0],
      enabled_encounter_classes: [...ENCOUNTER_CLASS],
    },
  });

  useEffect(() => {
    if (encounterConfig) {
      form.reset({
        pattern: encounterConfig.pattern || "",
        facility_code: encounterConfig.facility_code || "",
        reset_period: encounterConfig.reset_period || RESET_PERIOD_CHOICES[1],
        enabled_encounter_classes:
          encounterConfig.enabled_encounter_classes?.length
            ? encounterConfig.enabled_encounter_classes
            : [...ENCOUNTER_CLASS],
      });
    }
  }, [encounterConfig, form]);

  const { mutate: saveConfig, isPending } = useMutation({
    mutationFn: mutate(encounterConfigurationApi.create, {
      pathParams: { facility_external_id: facilityId },
    }),
    onSuccess: () => {
      toast.success(t("saved_successfully"));
      queryClient.invalidateQueries({
        queryKey: ["encounter_configuration", facilityId],
      });
      setEditing(false);
    },
  });

  const { mutate: updateConfig, isPending: isUpdatePending } = useMutation({
    mutationFn: mutate(encounterConfigurationApi.update, {
      pathParams: { facility_external_id: facilityId },
    }),
    onSuccess: () => {
      toast.success(t("saved_successfully"));
      queryClient.invalidateQueries({
        queryKey: ["encounter_configuration", facilityId],
      });
      setEditing(false);
    },
  });

  const handleSubmit = (data: EncounterConfigFormValues) => {
    if (encounterConfig?.pattern) {
      updateConfig(data);
    } else {
      saveConfig(data);
    }
  };

  if (!facility || isConfigLoading) {
    return (
      <div className="mx-auto mt-8 w-full max-w-5xl p-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-5xl space-y-3">
      <h3>{t("encounter_settings")}</h3>
      <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t("encounter_series_pattern")}
            </h2>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            <div className="mb-1 font-semibold">{t("supported_variables")}</div>
            <ul className="mb-2 list-inside list-disc">
              <li>{t("encounter_identifier_token_fac_code")}</li>
              <li>{t("encounter_identifier_token_yyyy")}</li>
              <li>{t("encounter_identifier_token_mm")}</li>
              <li>{t("encounter_identifier_token_dd")}</li>
              <li>{t("encounter_identifier_token_seq")}</li>
              <li>{t("encounter_identifier_token_class")}</li>
              <li>{t("encounter_identifier_token_class_text")}</li>
            </ul>
            <div className="mb-1">
              {t("encounter_identifier_other_characters")}
            </div>
            <pre className="overflow-x-auto rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700">
              {t("encounter_identifier_example_value")}
            </pre>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pattern")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full text-base"
                        disabled={!editing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facility_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("facility_code")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full text-base"
                        maxLength={16}
                        disabled={!editing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reset_period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reset_period")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!editing}
                    >
                      <FormControl>
                        <SelectTrigger ref={field.ref} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESET_PERIOD_CHOICES.map((period) => (
                          <SelectItem key={period} value={period}>
                            {t(`reset_period_${period}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enabled_encounter_classes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("enabled_encounter_classes")}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={ENCOUNTER_CLASS.map((value) => ({
                          label: t(`encounter_class__${value}`),
                          value,
                        }))}
                        value={field.value}
                        onValueChange={(values) =>
                          field.onChange(values)
                        }
                        placeholder={t("enabled_encounter_classes")}
                        disabled={!editing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2">
                {editing && (
                  <Button
                    type="submit"
                    disabled={isPending || isUpdatePending}
                    className="w-full sm:w-auto"
                  >
                    {isPending || isUpdatePending ? t("saving") : t("save")}
                  </Button>
                )}
              </div>
            </form>
          </Form>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
              className="w-full sm:w-auto"
            >
              {t("edit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
