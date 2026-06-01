import { lazy } from "react";

import "./componentOverrides";

import { PatientRead } from "@/types/emr/patient/patient";
import { BookAppointmentDetails as BookAppointmentPage } from "@/pages/Appointments/BookAppointment/BookAppointmentPage";
import CreateEncounterPage from "@/pages/Encounters/CreateEncounterPage";

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
    PatientInfoCardActions: React.LazyExoticComponent<
      React.FC<{
        patient: PatientRead;
        facilityId: string;
        canWritePatient?: boolean;
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
  },
  extends: [],
  components: {
    PatientInfoCardActions: lazy(
      () => import("./components/Patient/PatientInfoCardActions"),
    ),
    PatientHomeQuickActions: lazy(
      () => import("@/components/Patient/PatientHomeQuickActions"),
    ),
  },
  userNavItems: [],
  adminNavItems: [],
};

export default manifest;
