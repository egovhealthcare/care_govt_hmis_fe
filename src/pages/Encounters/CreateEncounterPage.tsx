import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { navigate } from "raviger";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

import { TagSelectorPopover } from "@/components/Tags/TagAssignmentSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FacilityOrganizationSelector from "@/pages/Facility/settings/organizations/components/FacilityOrganizationSelector";
import query from "@/Utils/request/query";

import {
  AccountBillingStatus,
  AccountRead,
  AccountStatus,
} from "@/types/billing/account/Account";
import accountApi from "@/types/billing/account/accountApi";
import {
  ENCOUNTER_CLASS,
  ENCOUNTER_CLASS_ICONS,
  ENCOUNTER_PRIORITY,
  EncounterCreate,
  EncounterRead,
  EncounterStatus,
} from "@/types/emr/encounter/encounter";
import encounterApi from "@/types/emr/encounter/encounterApi";
import patientApi from "@/types/emr/patient/patientApi";
import { TagConfig, TagResource } from "@/types/emr/tagConfig/tagConfig";
import useTagConfigs from "@/types/emr/tagConfig/useTagConfig";
import { PaginatedResponse } from "@/Utils/request/types";

interface CreateEncounterPageProps {
  facilityId: string;
  patientId: string;
}

export function CreateEncounterPage({
  facilityId,
  patientId,
}: CreateEncounterPageProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inpatientEncounterClass = "imp";

  const encounterFormSchema = z
    .object({
      status: z.enum([
        EncounterStatus.PLANNED,
        EncounterStatus.IN_PROGRESS,
        EncounterStatus.ON_HOLD,
      ] as const),
      encounter_class: z.enum(ENCOUNTER_CLASS),
      priority: z.enum(ENCOUNTER_PRIORITY),
      organizations: z.array(z.string()).min(1, {
        message: t("at_least_one_department_is_required"),
      }),
      start_date: z.string(),
      tags: z.array(z.string()),
    })
    .refine(
      (data) => {
        if (
          data.status !== EncounterStatus.PLANNED &&
          new Date(data.start_date) > new Date()
        ) {
          return false;
        }
        return true;
      },
      {
        message: t("encounter_future_date_restriction"),
        path: ["start_date"],
      },
    );

  const form = useForm<z.infer<typeof encounterFormSchema>>({
    resolver: zodResolver(encounterFormSchema),
    defaultValues: {
      status: EncounterStatus.IN_PROGRESS,
      encounter_class: inpatientEncounterClass,
      priority: "routine",
      organizations: [],
      start_date: new Date().toISOString(),
      tags: [],
    },
  });

  const selectedStatus = form.watch("status");
  const tagIds = form.watch("tags");

  const patientQuery = useQuery({
    queryKey: ["patient", patientId, facilityId],
    queryFn: query(patientApi.get, {
      pathParams: { id: patientId },
      queryParams: { facility: facilityId },
    }),
  });

  const tagQueries = useTagConfigs({ ids: tagIds, facilityId });
  const selectedTags = tagQueries
    .map((tagQuery) => tagQuery.data)
    .filter(Boolean) as TagConfig[];

  const { mutate: admitPatient, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof encounterFormSchema>) => {
      const existingAccountsResponse = (await query(accountApi.listAccount, {
        pathParams: { facilityId },
        queryParams: {
          patient: patientId,
          status: AccountStatus.active,
          billing_status: AccountBillingStatus.open,
          limit: 1,
        },
        silent: true,
      })({
        signal: new AbortController().signal,
      })) as PaginatedResponse<AccountRead>;

      const existingAccount = existingAccountsResponse.results[0];

      if (existingAccount) {
        await query(accountApi.updateAccount, {
          pathParams: { facilityId, accountId: existingAccount.id },
          body: {
            id: existingAccount.id,
            name: existingAccount.name,
            description: existingAccount.description,
            status: existingAccount.status,
            billing_status: AccountBillingStatus.carecomplete_notbilled,
            service_period: {
              start:
                existingAccount.service_period?.start ||
                new Date().toISOString(),
              ...(existingAccount.service_period?.end && {
                end: existingAccount.service_period.end,
              }),
            },
            patient: patientId,
            extensions: existingAccount.extensions,
            primary_encounter: existingAccount.primary_encounter?.id,
          },
          silent: true,
        })({ signal: new AbortController().signal });
      }

      const encounterRequest: EncounterCreate = {
        ...data,
        patient: patientId,
        facility: facilityId,
        period: {
          start: data.start_date,
        },
        tags: data.tags,
      };

      const encounter = (await query(encounterApi.create, {
        body: encounterRequest,
      })({ signal: new AbortController().signal })) as EncounterRead;

      const account = (await query(accountApi.createAccount, {
        pathParams: { facilityId },
        body: {
          name: patientQuery.data?.name || t("account"),
          description: null,
          status: AccountStatus.active,
          billing_status: AccountBillingStatus.open,
          service_period: {
            start: data.start_date,
          },
          patient: patientId,
          extensions: {},
        },
      })({ signal: new AbortController().signal })) as AccountRead;

      const updatedAccount = (await query(accountApi.updateAccount, {
        pathParams: { facilityId, accountId: account.id },
        body: {
          id: account.id,
          name: account.name,
          description: account.description,
          status: account.status,
          billing_status: account.billing_status,
          service_period: {
            start: account.service_period?.start || data.start_date,
            ...(account.service_period?.end && {
              end: account.service_period.end,
            }),
          },
          patient: patientId,
          extensions: account.extensions,
          primary_encounter: encounter.id,
        },
      })({ signal: new AbortController().signal })) as AccountRead;

      return { encounter, account: updatedAccount };
    },
    onSuccess: ({ account }) => {
      toast.success(t("encounter_created"));
      queryClient.invalidateQueries({ queryKey: ["encounters", patientId] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["defaultAccount"] });
      navigate(`/facility/${facilityId}/billing/account/${account.id}`);
    },
  });

  const handleSubmit = (data: z.infer<typeof encounterFormSchema>) => {
    admitPatient(data);
  };

  const patientName = patientQuery.data?.name ?? t("patient");
  const dateValue = form.watch("start_date");
  const currentDate = dateValue ? new Date(dateValue) : new Date();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
          <Stethoscope className="size-4" />
          {t("encounter_class__imp")}
        </div>
        <h1 className="text-2xl font-semibold text-gray-950">
          {t("encounter_class__imp")}
        </h1>
        <p className="text-sm text-gray-600">
          <Trans
            i18nKey="begin_clinical_encounter"
            values={{ patientName }}
            components={{
              strong: <strong className="font-semibold text-gray-950" />,
            }}
          />
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{patientName}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("date_and_time")}</FormLabel>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <DatePicker
                            date={currentDate}
                            disabled={(date) =>
                              selectedStatus !== EncounterStatus.PLANNED &&
                              date > new Date()
                            }
                            onChange={(newDate) => {
                              if (!newDate) {
                                return;
                              }

                              const updatedDate = new Date(newDate);
                              updatedDate.setHours(currentDate.getHours());
                              updatedDate.setMinutes(currentDate.getMinutes());
                              field.onChange(updatedDate.toISOString());
                            }}
                            className="h-9"
                          />
                          <Input
                            type="time"
                            className="border-gray-400 text-sm shadow-sm sm:py-px"
                            value={currentDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                            onChange={(event) => {
                              const [hours, minutes] = event.target.value
                                .split(":")
                                .map(Number);

                              if (
                                Number.isNaN(hours) ||
                                Number.isNaN(minutes)
                              ) {
                                return;
                              }

                              const updatedDate = new Date(currentDate);
                              updatedDate.setHours(hours);
                              updatedDate.setMinutes(minutes);
                              field.onChange(updatedDate.toISOString());
                            }}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="encounter_class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("type_of_encounter")}</FormLabel>
                        <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-primary rounded-lg bg-white p-2 shadow-sm">
                              {(() => {
                                const Icon = ENCOUNTER_CLASS_ICONS[field.value];
                                return <Icon className="size-5" />;
                              })()}
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-gray-950">
                                {t(`encounter_class__${field.value}`)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {t(
                                  `encounter_class_description__${field.value}`,
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("status")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger ref={field.ref}>
                                <SelectValue placeholder={t("select_status")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={EncounterStatus.IN_PROGRESS}>
                                {t("in_progress")}
                              </SelectItem>
                              <SelectItem value={EncounterStatus.PLANNED}>
                                {t("planned")}
                              </SelectItem>
                              <SelectItem value={EncounterStatus.ON_HOLD}>
                                {t("on_hold")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("priority")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger ref={field.ref}>
                                <SelectValue
                                  placeholder={t("select_priority")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ENCOUNTER_PRIORITY.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {t(`encounter_priority__${priority}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("tags", { count: 2 })}</FormLabel>
                        <FormControl>
                          <TagSelectorPopover
                            selected={selectedTags}
                            onChange={(tags) => {
                              field.onChange(tags.map((tag) => tag.id));
                            }}
                            resource={TagResource.ENCOUNTER}
                            facilityId={facilityId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="organizations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("organizations")}</FormLabel>
                        <FormControl>
                          <FacilityOrganizationSelector
                            facilityId={facilityId}
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value ?? []);
                            }}
                            favoriteList="encounter_departments"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-6 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(`/facility/${facilityId}/patient/${patientId}`)
                  }
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || patientQuery.isLoading}
                >
                  {isPending ? t("creating") : t("create_encounter")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateEncounterPage;
