import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { LocationRead } from "@/types/location/location";

import { LocationNavigation } from "./LocationNavigation";
import { useLocationNavigation } from "./hooks/useLocationNavigation";

export type EncounterLocationSelection =
  | { mode: "instance"; location: LocationRead }
  | { mode: "kind"; location: LocationRead; hierarchy: string[] };

interface EncounterLocationAssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onChange: (value: EncounterLocationSelection | undefined) => void;
  /**
   * When true, the user can confirm a kind-mode location (e.g. an area/ward)
   * without picking a specific bed. When false (default), only instance-mode
   * (bed) selections can be confirmed.
   */
  allowSelectingKindLocation?: boolean;
}

export function EncounterLocationAssignmentSheet({
  open,
  onOpenChange,
  facilityId,
  onChange,
  allowSelectingKindLocation = false,
}: EncounterLocationAssignmentSheetProps) {
  const { t } = useTranslation();

  const navigation = useLocationNavigation({ facilityId, open });

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      navigation.resetNavigation();
    }
  };

  const handleCheckBedStatus = (bed: LocationRead) => {
    if (!bed.current_encounter) return;
    toast.warning(t("bed_currently_occupied"));
  };

  const selectedBed = navigation.selectedBed;
  const currentKind = navigation.selectedLocation;

  const canConfirmKind = allowSelectingKindLocation && !!currentKind;
  const canConfirm = !!selectedBed || canConfirmKind;

  let confirmLabel = t("assign_to_location");
  if (selectedBed) {
    confirmLabel = t("assign_bed");
  } else if (canConfirmKind && currentKind) {
    confirmLabel = t("assign_to_location_named", { name: currentKind.name });
  }

  const handleConfirm = () => {
    if (selectedBed) {
      onChange({ mode: "instance", location: selectedBed });
      handleOpenChange(false);
      return;
    }
    if (canConfirmKind && currentKind) {
      onChange({
        mode: "kind",
        location: currentKind,
        hierarchy: navigation.locationHistory.map((l) => l.name),
      });
      handleOpenChange(false);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    handleOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-base font-semibold">
            {t("select_location")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1 mt-2">
          <LocationNavigation
            locations={navigation.allLocations}
            beds={navigation.allBeds}
            selectedLocation={navigation.selectedLocation}
            locationHistory={navigation.locationHistory}
            selectedBed={navigation.selectedBed}
            showAvailableOnly={navigation.showAvailableOnly}
            searchTerm={navigation.searchTerm}
            isLoadingLocations={navigation.isLoadingLocations}
            isLoadingBeds={navigation.isLoadingBeds}
            hasMore={
              navigation.selectedLocation
                ? navigation.hasMoreBeds
                : navigation.hasMoreLocations
            }
            onLocationClick={navigation.handleLocationClick}
            onBedSelect={navigation.setSelectedBed}
            onCheckBedStatus={handleCheckBedStatus}
            onSearchChange={navigation.setSearchTerm}
            onSearch={navigation.handleSearch}
            onShowAvailableChange={(value) => {
              navigation.setShowAvailableOnly(value);
              navigation.setBedsPage(1);
              navigation.setAllBeds([]);
            }}
            onLoadMore={navigation.handleLoadMore}
            onGoBack={navigation.goBack}
            onClearSelection={navigation.clearBedSelection}
          />
        </div>

        <SheetFooter className="border-t border-gray-200 pt-4 mt-2 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="sm:mr-auto"
          >
            {t("clear_selection")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
