import { HttpMethod, Type, apiRoutes } from "@/lib/request";

export interface AppointmentCreate {
  patient: string;
  note: string;
  tags: string[];
}

export interface AppointmentRead {
  id: string;
}

export default apiRoutes({
  createAppointment: {
    path: "/api/v1/facility/{facilityId}/slots/{slotId}/create_appointment/",
    method: HttpMethod.POST,
    TResponse: Type<AppointmentRead>(),
    TRequest: Type<AppointmentCreate>(),
  },
});
