import { Button } from "@/components/ui/button";

import type { PatientRead } from "@/types/emr/patient/patient";
import { Edit } from "lucide-react";
import { Link } from "raviger";
import { useTranslation } from "react-i18next";

interface PatientInfoCardActionsProps {
  patient: PatientRead;
  facilityId: string;
  canWritePatient?: boolean;
}

export default function PatientInfoCardActions({
  patient,
  facilityId,
  canWritePatient = true,
}: PatientInfoCardActionsProps) {
  const { t } = useTranslation();

  if (!canWritePatient) return <></>;

  return (
    <Button variant="ghost">
      <Link
        basePath="/"
        href={`/facility/${facilityId}/patient/${patient.id}/update`}
        className="flex items-center gap-2"
      >
        <Edit size={16} />
        <span className="font-semibold text-black underline">
          {t("edit_profile")}
        </span>
      </Link>
    </Button>
  );
}
