import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import mutate from "@/Utils/request/mutate";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
import facilityApi from "@/types/facility/facilityApi";

interface EncounterExternalIdentifierSettingsProps {
  facilityId: string;
}

export default function EncounterExternalIdentifierSettings({
  facilityId: _facilityId,
}: EncounterExternalIdentifierSettingsProps) {
  const { t } = useTranslation();
  const { facility, facilityId } = useCurrentFacility();
  const [editing, setEditing] = useState(false);
  const [expression, setExpression] = useState("");

  const queryClient = useQueryClient();

  const {
    mutate: saveExpression,
    isPending,
    isSuccess,
    isError,
    reset,
  } = useMutation({
    mutationFn: mutate(facilityApi.setEncounterExternalIdentifierExpression, {
      pathParams: { facilityId },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility", facilityId] });
      setEditing(false);
    },
  });

  React.useEffect(() => {
    if (facility && !editing)
      setExpression(facility.encounter_external_identifier_expression || "");
  }, [facility, editing]);

  if (!facility) {
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
              {t("encounter_external_identifier_expression")}
            </h2>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            <div className="mb-1 font-semibold">
              {t("encounter_external_identifier_supported_variables")}
            </div>
            <ul className="mb-2 list-inside list-disc">
              <li>{t("encounter_external_identifier_counter")}</li>
              <li>{t("encounter_external_identifier_year_yy")}</li>
              <li>{t("encounter_external_identifier_year_yyyy")}</li>
            </ul>
            <div className="mb-1">
              {t("encounter_external_identifier_other_characters")}
            </div>
            <div className="mb-1">{t("arithmetic_help")}</div>
            <pre className="overflow-x-auto rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700">
              {t("encounter_external_identifier_example_value")}
            </pre>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-4">
          {editing ? (
            <>
              <Input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className="w-full text-base"
                autoFocus
                aria-label={t("encounter_external_identifier_expression")}
              />
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2">
                <Button
                  onClick={() =>
                    saveExpression({
                      encounter_external_identifier_expression: expression,
                    })
                  }
                  disabled={isPending || !expression.trim()}
                  className="w-full sm:w-auto"
                >
                  {isPending ? t("saving") : t("save")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setExpression(
                      facility.encounter_external_identifier_expression || "",
                    );
                    reset();
                  }}
                  className="w-full sm:w-auto"
                >
                  {t("cancel")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="block w-full min-w-[200px] rounded border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-base text-gray-800">
                {facility.encounter_external_identifier_expression || (
                  <span className="text-gray-400">-</span>
                )}
              </span>
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                className="mt-2 w-full sm:w-auto"
              >
                {t("edit")}
              </Button>
            </>
          )}
        </div>
        {isSuccess && !editing && (
          <div className="mt-2 text-sm text-green-600">
            {t("saved_successfully")}
          </div>
        )}
        {isError && (
          <div className="mt-2 text-sm text-red-600">{t("error")}</div>
        )}
      </div>
    </div>
  );
}
