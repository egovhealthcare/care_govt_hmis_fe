import { t } from "i18next";
import { Hash } from "lucide-react";

import { HrefLink } from "@/lib/router/HrefLink";
import type { FacilityRead } from "@/types/facility/facility";

export default function FacilityHomeActions({
  facility,
}: {
  facility: FacilityRead;
}) {
  return (
    <div className="flex items-center gap-2">
      <HrefLink
        href={`/facility/${facility.id}/settings/encounter`}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
      >
        <Hash className="size-3" />

        {t("encounter_identifier_settings")}
      </HrefLink>
    </div>
  );
}
