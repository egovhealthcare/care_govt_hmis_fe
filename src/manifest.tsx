import "./componentOverrides";
import { lazy } from "react";

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
  components: Record<string, any>;
  navItems?: NavigationLink[];
  userNavItems?: NavigationLink[];
  adminNavItems?: NavigationLink[];
}

const PatientEditButton = lazy(
  () => import("./components/Patient/PatientInfoCardActions"),
);

const manifest: Manifest = {
  plugin: "care_appointment_plug",
  routes: {},
  extends: [],
  components: {
    PatientInfoCardActions: PatientEditButton,
  },
  userNavItems: [],
  adminNavItems: [],
};

export default manifest;
