import { BedDouble } from "lucide-react";
import { Link } from "raviger";
import React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { PatientRead } from "@/types/emr/patient/patient";

interface PatientHomeQuickActionsProps {
  patient: PatientRead;
  facilityId?: string;
  className?: string;
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  href?: string;
  basePath?: string;
  onClick?: () => void;
  hidden?: boolean;
  className?: string;
}

function QuickAction({
  icon,
  title,
  href,
  basePath,
  onClick,
  hidden,
  className,
}: QuickActionProps) {
  const classes = cn(
    "flex-1 flex flex-row md:flex-col gap-1.25 p-1 pb-2 rounded-lg shadow bg-white",
    hidden && "hidden",
    className,
  );

  if (href) {
    return (
      <Link basePath={basePath} href={href} className={classes}>
        <QuickActionContent icon={icon} title={title} />
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick}>
      <QuickActionContent icon={icon} title={title} />
    </button>
  );
}

function QuickActionContent({
  icon,
  title,
}: Pick<QuickActionProps, "icon" | "title">) {
  return (
    <>
      <div className="relative flex rounded-t-md rounded-b-lg bg-white py-0 md:bg-gray-100 md:py-3">
        <div className="mx-auto flex items-center rounded-xl bg-white p-2 shadow-none md:shadow">
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-sm font-semibold">{title}</span>
      </div>
    </>
  );
}

export default function PatientHomeQuickActions({
  patient,
  facilityId,
  className,
}: PatientHomeQuickActionsProps) {
  const { t } = useTranslation();

  if (!facilityId) {
    return null;
  }

  return (
    <QuickAction
      icon={<BedDouble className="text-indigo-600" />}
      title={t("admit_patient")}
      href={`/facility/${facilityId}/patient/${patient.id}/encounter/create`}
      className={className}
    />
  );
}
