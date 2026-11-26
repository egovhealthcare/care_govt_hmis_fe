import { useEffect } from "react";

import { navigate } from "@/lib/router/navigate";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";

/**
 * Public prop contract for `BookAppointmentDetails`. Plug overrides registered
 * against the `"BookAppointmentDetails"` key receive these exact props.
 */
export interface BookAppointmentDetailsProps {
  patientId: string;
  onSuccess?: () => void;
}

/**
 * The plug's replacement for the host's `BookAppointmentDetails`, registered
 * in `src/componentOverrides.ts`. Booking happens on the plug's own page
 * (`BookAppointmentPage`), so this only redirects there.
 */
export const BookAppointmentDetails = ({
  patientId,
}: BookAppointmentDetailsProps) => {
  const { facilityId } = useCurrentFacility();
  useEffect(() => {
    navigate({
      to: "/facility/$facilityId/patient/$patientId/book-appointment",
      params: { facilityId, patientId },
    });
  }, [facilityId, patientId]);

  return null;
};
