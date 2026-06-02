import { lazy } from "react";

import { Hash } from "lucide-react";

import "./componentOverrides";

import { PatientRead } from "@/types/emr/patient/patient";
import { BookAppointmentDetails as BookAppointmentPage } from "@/pages/Appointments/BookAppointment/BookAppointmentPage";
import CreateEncounterPage from "@/pages/Encounters/CreateEncounterPage";
import EncounterExternalIdentifierSettings from "@/pages/Facility/settings/EncounterExternalIdentifierSettings";
import { t } from "i18next";

interface NavigationLink {
  url: string;
  name: string;
  icon?: React.ReactNode;
  children?: NavigationLink[];
}

interface Manifest {
  plugin: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: Record<string, (...args: any) => React.ReactNode>;
  extends: string[];
  components: {
    PatientHomeQuickActions: React.LazyExoticComponent<
      React.FC<{
        patient: PatientRead;
        facilityId?: string;
        className?: string;
      }>
    >;
  };
  navItems?: NavigationLink[];
  userNavItems?: NavigationLink[];
  adminNavItems?: NavigationLink[];
}

const manifest: Manifest = {
  plugin: "care_appointment_plug",
  routes: {
    "/facility/:facilityId/patient/:patientId/book-appointment": ({
      patientId,
    }) => <BookAppointmentPage patientId={patientId} />,
    "/facility/:facilityId/patient/:patientId/encounter/create": ({
      facilityId,
      patientId,
    }) => <CreateEncounterPage facilityId={facilityId} patientId={patientId} />,
    "/facility/:facilityId/settings/encounter": ({ facilityId }) => (
      <EncounterExternalIdentifierSettings facilityId={facilityId} />
    ),
  },
  extends: [],
  components: {
    PatientHomeQuickActions: lazy(
      () => import("@/components/Patient/PatientHomeQuickActions"),
    ),
  },
  navItems: [
    {
      url: "settings/encounter",
      name: t("encounter_settings"),
      icon: <Hash className="size-3 text-gray-500" />,
    },
  ],
  userNavItems: [],
  adminNavItems: [],
};

export default manifest;
