import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { scheduleServiceTypeAtom } from "@/atoms/scheduleServiceTypeAtom";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  buildInvoiceUrl,
  InvoiceIssueError,
  runInvoiceFlow,
} from "@/lib/invoiceFlow";
import { navigate } from "@/lib/router/navigate";
import { AppointmentSlotPicker } from "@/pages/Appointments/BookAppointment/AppointmentSlotPicker";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
import { TagConfig } from "@/types/emr/tagConfig/tagConfig";
import scheduleApi from "@/types/scheduling/scheduleApi";
import { BatchReplacementType } from "@/types/superBatch/superBatch";
import superBatchApi from "@/types/superBatch/superBatchApi";
import { TokenCategoryRead } from "@/types/tokens/tokenCategory/tokenCategory";
import tokenCategoryApi from "@/types/tokens/tokenCategory/tokenCategoryApi";
import { KeyboardShortcutBadge } from "@/Utils/keyboardShortcutComponents";
import { formatKeyboardShortcut } from "@/Utils/keyboardShortcutUtils";
import query, { callApi } from "@/Utils/request/query";

import { ScheduleResourceFormState } from "@/components/Schedule/ResourceSelector";
import { Appointment } from "@/types/scheduling/schedule";
import { AppointmentDateSelection } from "./AppointmentDateSelection";
import { AppointmentFormSection } from "./AppointmentFormSection";

/**
 * Public prop contract for `BookAppointmentDetails`. Plug overrides registered
 * against the `"BookAppointmentDetails"` key receive these exact props.
 */
export interface BookAppointmentDetailsProps {
  patientId: string;
  onSuccess?: () => void;
}

const NO_TOKEN = "none";

interface TokenCategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  categories: TokenCategoryRead[];
  disabled?: boolean;
  className?: string;
}

const TokenCategorySelect = ({
  value,
  onValueChange,
  categories,
  disabled,
  className,
}: TokenCategorySelectProps) => {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(value) => value && onValueChange(value)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_TOKEN}>
          {t("book_without_token", { ns: "care_appointment_plug" })}
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {t("book_with_token", {
              ns: "care_appointment_plug",
              category: category.name,
            })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const BookAppointmentDetailsBase = ({
  patientId,
  onSuccess,
}: BookAppointmentDetailsProps) => {
  const { t } = useTranslation();

  const { facilityId } = useCurrentFacility();
  const [cachedServiceType, setCachedServiceType] = useAtom(
    scheduleServiceTypeAtom,
  );

  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<TagConfig[]>([]);
  const [reason, setReason] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedResource, setSelectedResource] =
    useState<ScheduleResourceFormState>({
      resource: null,
      resource_type: cachedServiceType,
    });

  useEffect(() => {
    if (
      selectedResource.resource === null &&
      selectedResource.resource_type !== cachedServiceType
    ) {
      setSelectedResource({
        resource: null,
        resource_type: cachedServiceType,
      });
    }
  }, [
    cachedServiceType,
    selectedResource.resource,
    selectedResource.resource_type,
  ]);

  const handleResourceChange = (resource: ScheduleResourceFormState) => {
    setSelectedSlotId(undefined);
    setSelectedResource(resource);
    if (resource.resource_type !== cachedServiceType) {
      setCachedServiceType(resource.resource_type);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedSlotId(undefined);
    setSelectedDate(date);
  };

  const [selectedTokenCategory, setSelectedTokenCategory] = useState<string>();

  const { data: tokenCategories, isLoading: isLoadingTokenCategories } =
    useQuery({
      queryKey: [
        "tokenCategories",
        facilityId,
        selectedResource.resource_type,
      ],
      queryFn: query(tokenCategoryApi.list, {
        pathParams: { facility_id: facilityId },
        queryParams: { resource_type: selectedResource.resource_type },
      }),
    });

  const categories = tokenCategories?.results ?? [];
  // Fall back to the default category when nothing valid is selected (e.g. after a resource type change).
  const tokenCategory =
    selectedTokenCategory === NO_TOKEN ||
    categories.some((c) => c.id === selectedTokenCategory)
      ? selectedTokenCategory
      : (categories.find((c) => c.default)?.id ?? NO_TOKEN);

  const { mutateAsync: bookAppointment, isPending: isCreating } = useMutation({
    mutationFn: async (): Promise<Appointment> => {
      const body = {
        patient: patientId,
        note: reason,
        tags: selectedTags.map((tag) => ({ tag: tag.id })),
      };

      if (tokenCategory === NO_TOKEN) {
        return callApi(scheduleApi.slots.createAppointment, {
          pathParams: { facilityId, slotId: selectedSlotId ?? "" },
          body,
        });
      }

      // Booking and token generation run as one atomic super batch.
      const batch = await callApi(superBatchApi.execute, {
        body: {
          requests: [
            {
              reference_id: "appointment",
              url: `/api/v1/facility/${facilityId}/slots/${selectedSlotId}/create_appointment/`,
              method: "POST",
              body,
            },
            {
              reference_id: "token",
              url: `/api/v1/facility/${facilityId}/appointments/{appointmentId}/generate_token/`,
              method: "POST",
              body: { category: tokenCategory },
              replacements: [
                {
                  source_path: { reference_id: "appointment", path: "id" },
                  value_path: {
                    reference_id: "token",
                    path: "appointmentId",
                    type: BatchReplacementType.url,
                  },
                },
              ],
            },
          ],
        },
      });

      return batch.results.find((r) => r.reference_id === "appointment")
        ?.data as Appointment;
    },
  });

  const goToAppointmentView = (appointmentId: string) => {
    navigate({
      to: "/facility/$facilityId/patient/$patientId/appointments/$appointmentId",
      params: { facilityId, patientId, appointmentId },
      search: { showSuccess: "true" },
    });
  };

  /** Books the appointment, then runs the plug's auto-invoice flow. */
  const handleProceedToBilling = async () => {
    if (!selectedResource || !selectedSlotId) return;
    const data = await bookAppointment();
    toast.success(t("appointment_created_successfully"));
    onSuccess?.();

    const inputs = {
      facilityId,
      patientId,
      appointmentId: data.id,
      isPayment: true,
    };

    try {
      const invoiceId = await runInvoiceFlow(inputs);
      if (invoiceId) {
        navigate({ href: buildInvoiceUrl(inputs, invoiceId) });
        return;
      }
    } catch (err) {
      if (err instanceof InvoiceIssueError) {
        toast.error(
          t("invoice_creation_failed", { ns: "care_appointment_plug" }),
        );
      }
      console.error(
        "[care_appointment_plug] invoice flow failed; falling back",
        err,
      );
    }

    goToAppointmentView(data.id);
  };

  const handleIsOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentStep(1);
      setSelectedSlotId(undefined);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-row justify-center gap-4">
        <div className="flex w-114 flex-col gap-8 rounded-lg bg-white p-4 shadow">
          <AppointmentFormSection
            facilityId={facilityId}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            reason={reason}
            setReason={setReason}
            selectedResource={selectedResource}
            setSelectedResource={handleResourceChange}
          />
        </div>
        <div className="hidden w-full gap-6 rounded-lg bg-white p-4 shadow sm:flex sm:max-h-full sm:flex-col lg:flex-row">
          <AppointmentDateSelection
            facilityId={facilityId}
            resourceId={selectedResource.resource?.id}
            resourceType={selectedResource.resource_type}
            setSelectedDate={handleDateChange}
            selectedDate={selectedDate}
          />
          <div className="max-h-[calc(100vh-17rem)] w-full overflow-y-auto">
            <AppointmentSlotPicker
              facilityId={facilityId}
              resourceId={selectedResource.resource?.id}
              resourceType={selectedResource.resource_type}
              selectedSlotId={selectedSlotId}
              onSlotSelect={setSelectedSlotId}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
      {selectedSlotId ? (
        <div className="mt-2 hidden p-4 shadow sm:flex">
          <div className="ml-auto flex gap-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setSelectedSlotId(undefined);
              }}
            >
              {t("cancel")}
            </Button>
            <TokenCategorySelect
              value={tokenCategory ?? NO_TOKEN}
              onValueChange={setSelectedTokenCategory}
              categories={categories}
              disabled={isLoadingTokenCategories || isCreating}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleProceedToBilling}
              type="submit"
              disabled={isCreating || isLoadingTokenCategories}
              data-shortcut-id="enter-action"
            >
              {t("proceed_to_billing", { ns: "care_appointment_plug" })}
              <KeyboardShortcutBadge
                shortcut={formatKeyboardShortcut("enter")}
                className="ml-1"
              />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-4 p-4 shadow">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              if (window.history.length > 1) {
                // To do: construct the profile url from patientData params
                window.history.go(-2);
              } else {
                navigate({
                  to: "/facility/$facilityId/patient/$patientId",
                  params: { facilityId, patientId },
                });
              }
            }}
          >
            {t("cancel")}
          </Button>
        </div>
      )}
      <Drawer open={isOpen} onOpenChange={handleIsOpen}>
        <DrawerTrigger asChild>
          <Button
            className="mt-3 w-full sm:hidden"
            disabled={!selectedResource.resource?.id}
            onClick={() => {
              setIsOpen(true);
              setCurrentStep(1);
            }}
          >
            {t("select_date")}
            <ArrowRight size={16} />
          </Button>
        </DrawerTrigger>
        <DrawerContent
          aria-describedby={undefined}
          height="fixed"
          className="p-1.5"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-1 pt-2 pb-[env(safe-area-inset-bottom)]">
            {currentStep === 1 && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <AppointmentDateSelection
                    facilityId={facilityId}
                    resourceId={selectedResource.resource?.id}
                    resourceType={selectedResource.resource_type}
                    setSelectedDate={handleDateChange}
                    selectedDate={selectedDate}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!selectedDate}
                  onClick={() => setCurrentStep(2)}
                >
                  {t("select_slot")}
                  <ArrowRight size={16} />
                </Button>
              </>
            )}
            {currentStep === 2 && (
              <>
                <AppointmentSlotPicker
                  facilityId={facilityId}
                  resourceId={selectedResource.resource?.id}
                  resourceType={selectedResource.resource_type}
                  selectedSlotId={selectedSlotId}
                  onSlotSelect={setSelectedSlotId}
                  selectedDate={selectedDate}
                />
                <TokenCategorySelect
                  className="w-full sm:hidden"
                  value={tokenCategory ?? NO_TOKEN}
                  onValueChange={setSelectedTokenCategory}
                  categories={categories}
                  disabled={isLoadingTokenCategories || isCreating}
                />
                <div className="flex flex-row items-center gap-2 sm:hidden">
                  <Button
                    variant="outline"
                    className="min-w-0 flex-auto"
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedSlotId(undefined);
                    }}
                  >
                    <ArrowLeft />
                    {t("back")}
                  </Button>
                  <Button
                    variant="primary"
                    className="min-w-0 flex-auto"
                    onClick={handleProceedToBilling}
                    disabled={
                      !selectedSlotId || isCreating || isLoadingTokenCategories
                    }
                  >
                    {t("proceed_to_billing", { ns: "care_appointment_plug" })}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

/**
 * The plug's replacement for the host's `BookAppointmentDetails`. Registered
 * against the host's `"BookAppointmentDetails"` override key in
 * `src/componentOverrides.ts`.
 */
export const BookAppointmentDetails = BookAppointmentDetailsBase;
