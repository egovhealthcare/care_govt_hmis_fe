import { navigate } from "raviger";
import { useEffect } from "react";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
/**
 * Public prop contract for `BookAppointmentDetails`. Plug overrides registered
 * against the `"BookAppointmentDetails"` key receive these exact props.
 */
export interface BookAppointmentDetailsProps {
  patientId: string;
  onSuccess?: () => void;
}

const BookAppointmentDetailsBase = ({
  patientId,
}: BookAppointmentDetailsProps) => {
  const { facilityId } = useCurrentFacility();
  useEffect(() => {
    navigate(`/facility/${facilityId}/patient/${patientId}/book-appointment`);
  }, [facilityId, patientId]);

  return <> </>;
};

/**
 * The plug's replacement for the host's `BookAppointmentDetails`. Registered
 * against the host's `"BookAppointmentDetails"` override key in
 * `src/componentOverrides.ts`.
 */
export const BookAppointmentDetails = BookAppointmentDetailsBase;
