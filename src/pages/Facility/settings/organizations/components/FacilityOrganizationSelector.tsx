import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Building,
  ChevronDown,
  ChevronRight,
  Loader2,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import useBreakpoints from "@/hooks/useBreakpoints";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import { FacilityOrganizationRead } from "@/types/facilityOrganization/facilityOrganization";
import facilityOrganizationApi from "@/types/facilityOrganization/facilityOrganizationApi";

interface FacilityOrganizationSelectorProps {
  value?: string[] | null;
  onChange: (value: string[] | null) => void;
  facilityId: string;
  currentOrganizations?: FacilityOrganizationRead[];
  singleSelection?: boolean;
  optional?: boolean;
  favoriteList?: string;
}

export default function FacilityOrganizationSelector(
  props: FacilityOrganizationSelectorProps,
) {
  const { t } = useTranslation();
  const {
    value,
    onChange,
    facilityId,
    currentOrganizations,
    singleSelection = false,
    favoriteList,
  } = props;

  const queryClient = useQueryClient();

  const [selectedOrganizations, setSelectedOrganizations] = useState<
    FacilityOrganizationRead[]
  >([]);
  const [currentSelection, setCurrentSelection] =
    useState<FacilityOrganizationRead | null>(null);
  const [navigationLevels, setNavigationLevels] = useState<
    FacilityOrganizationRead[]
  >([]);
  const [facilityOrgSearch, setFacilityOrgSearch] = useState("");
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const [open, setOpen] = useState(false);
  const [alreadySelected, setAlreadySelected] = useState(false);
  const [hasAutoSelectedPreferred, setHasAutoSelectedPreferred] =
    useState(false);
  const isMobile = useBreakpoints({ default: true, sm: false });
  const { ref: inViewRef, inView } = useInView();

  // Fetch preferred organizations
  const { data: preferredOrganizations, isLoading: isLoadingPreferred } =
    useQuery({
      queryKey: ["facilityOrganization-favorites", facilityId, favoriteList],
      queryFn: query(facilityOrganizationApi.list, {
        pathParams: { facilityId },
        queryParams: {
          favorite_list: favoriteList,
        },
      }),
      enabled: !!favoriteList,
    });

  const preferredOrgIds = useMemo(() => {
    return preferredOrganizations?.results?.map((org) => org.id) || [];
  }, [preferredOrganizations]);

  const PAGE_LIMIT = 20;

  const {
    data: rootOrganizationsData,
    isLoading: isLoadingRoot,
    fetchNextPage: fetchNextPageRoot,
    hasNextPage: hasNextPageRoot,
    isFetchingNextPage: isFetchingNextPageRoot,
  } = useInfiniteQuery({
    queryKey: [
      "facilityOrganization",
      facilityId,
      facilityOrgSearch,
      showAllOrgs,
    ],
    queryFn: async ({ pageParam = 0, signal }) => {
      const response = await query.debounced(
        showAllOrgs
          ? facilityOrganizationApi.list
          : facilityOrganizationApi.listMine,
        {
          pathParams: { facilityId },
          queryParams: {
            parent: "",
            name: facilityOrgSearch,
            limit: String(PAGE_LIMIT),
            offset: String(pageParam),
          },
        },
      )({ signal });
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.length * PAGE_LIMIT;
      return currentOffset < lastPage.count ? currentOffset : null;
    },
    select: (data) => ({
      results: data?.pages.flatMap((p) => p.results) || [],
      count: data?.pages[0]?.count || 0,
    }),
  });

  const {
    data: childOrganizationsData,
    isLoading: isLoadingChild,
    fetchNextPage: fetchNextPageChild,
    hasNextPage: hasNextPageChild,
    isFetchingNextPage: isFetchingNextPageChild,
  } = useInfiniteQuery({
    queryKey: [
      "organizations",
      facilityId,
      navigationLevels[navigationLevels.length - 1]?.id,
      facilityOrgSearch,
    ],
    queryFn: async ({ pageParam = 0, signal }) => {
      const response = await query.debounced(facilityOrganizationApi.list, {
        pathParams: { facilityId },
        queryParams: {
          parent: navigationLevels[navigationLevels.length - 1]?.id,
          name: facilityOrgSearch,
          limit: String(PAGE_LIMIT),
          offset: String(pageParam),
        },
      })({ signal });
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.length * PAGE_LIMIT;
      return currentOffset < lastPage.count ? currentOffset : null;
    },
    select: (data) => ({
      results: data?.pages.flatMap((p) => p.results) || [],
      count: data?.pages[0]?.count || 0,
    }),
    enabled: navigationLevels.length > 0,
  });

  const handleConfirmSelection = useCallback(
    (org: FacilityOrganizationRead) => {
      if (!selectedOrganizations.includes(org)) {
        const newSelection = singleSelection
          ? [org]
          : [...selectedOrganizations, org];
        setSelectedOrganizations(newSelection);
        onChange(newSelection.map((org) => org.id));
        setAlreadySelected(true);
      }
      setCurrentSelection(null);
      setNavigationLevels([]);
      setOpen(false);
    },
    [selectedOrganizations, onChange, singleSelection],
  );

  const getCurrentLevelOrganizations = useCallback(() => {
    if (navigationLevels.length === 0) {
      return rootOrganizationsData?.results || [];
    }
    return childOrganizationsData?.results || [];
  }, [navigationLevels, rootOrganizationsData, childOrganizationsData]);

  const getCurrentLevelLoading = useCallback(() => {
    if (navigationLevels.length === 0) {
      return isLoadingRoot;
    }
    return isLoadingChild;
  }, [navigationLevels.length, isLoadingRoot, isLoadingChild]);

  const getCurrentLevelFetchingNextPage = useCallback(() => {
    if (navigationLevels.length === 0) {
      return isFetchingNextPageRoot;
    }
    return isFetchingNextPageChild;
  }, [
    navigationLevels.length,
    isFetchingNextPageRoot,
    isFetchingNextPageChild,
  ]);

  useEffect(() => {
    if (inView) {
      if (navigationLevels.length === 0 && hasNextPageRoot) {
        fetchNextPageRoot();
      } else if (navigationLevels.length > 0 && hasNextPageChild) {
        fetchNextPageChild();
      }
    }
  }, [
    inView,
    navigationLevels.length,
    hasNextPageRoot,
    hasNextPageChild,
    fetchNextPageRoot,
    fetchNextPageChild,
  ]);

  // Auto-select when there's only one organization available
  useEffect(() => {
    const availableOrganizations = getCurrentLevelOrganizations();

    // Only auto-select if:
    // 1. We're at the root level (no navigation levels)
    // 2. There's exactly one organization
    // 3. No search is active
    // 4. No organizations are currently selected
    // 5. Not loading
    if (
      navigationLevels.length === 0 &&
      availableOrganizations.length === 1 &&
      !facilityOrgSearch &&
      selectedOrganizations.length === 0 &&
      !isLoadingRoot &&
      !isLoadingPreferred &&
      preferredOrgIds.length === 0
    ) {
      const singleOrg = availableOrganizations[0];

      // Check if this organization is already selected in currentOrganizations prop
      const isAlreadyInCurrent = currentOrganizations?.find(
        (org) => org.id === singleOrg.id,
      );

      if (!isAlreadyInCurrent && !props.optional) {
        handleConfirmSelection(singleOrg);
      }
    }
  }, [
    getCurrentLevelOrganizations,
    handleConfirmSelection,
    navigationLevels,
    facilityOrgSearch,
    selectedOrganizations,
    isLoadingRoot,
    isLoadingPreferred,
    preferredOrgIds.length,
    currentOrganizations,
    props.optional,
    isLoadingPreferred,
    preferredOrgIds.length,
  ]);

  useEffect(() => {
    if (value && value.length > 0) {
      const resolvedOrganizations = value
        .map((id) => currentOrganizations?.find((org) => org.id === id))
        .filter((org) => org !== undefined);
      if (resolvedOrganizations.length > 0) {
        setSelectedOrganizations(resolvedOrganizations);
      }
    } else {
      setSelectedOrganizations([]);
      // Reset the auto-select flag when value is cleared (e.g., form reset)
      // setHasAutoSelectedPreferred(false);
    }
  }, [value, currentOrganizations, showAllOrgs]);

  // Auto-select preferred departments
  useEffect(() => {
    if (
      favoriteList &&
      preferredOrganizations?.results &&
      preferredOrganizations.results.length > 0 &&
      selectedOrganizations.length === 0 &&
      !hasAutoSelectedPreferred &&
      !value?.length
    ) {
      const orgsToSelect = singleSelection
        ? [preferredOrganizations.results[0]]
        : preferredOrganizations.results;
      setSelectedOrganizations(orgsToSelect);
      onChange(orgsToSelect.map((org) => org.id));
      setHasAutoSelectedPreferred(true);
    }
  }, [
    favoriteList,
    preferredOrganizations,
    selectedOrganizations,
    hasAutoSelectedPreferred,
    value,
    onChange,
    singleSelection,
  ]);

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: (organizationId: string) =>
      mutate(facilityOrganizationApi.addFavorite, {
        pathParams: { facilityId, organizationId },
      })({ favorite_list: favoriteList }),
    onSuccess: () => {
      toast.success(t("marked_as_preferred"));
      queryClient.invalidateQueries({
        queryKey: ["facilityOrganization-favorites", facilityId, favoriteList],
      });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (organizationId: string) =>
      mutate(facilityOrganizationApi.removeFavorite, {
        pathParams: { facilityId, organizationId },
      })({ favorite_list: favoriteList }),
    onSuccess: () => {
      toast.success(t("removed_from_preferred"));
      queryClient.invalidateQueries({
        queryKey: ["facilityOrganization-favorites", facilityId, favoriteList],
      });
    },
  });

  const handleTogglePreferred = (
    e: React.MouseEvent,
    org: FacilityOrganizationRead,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const isPreferred = preferredOrgIds.includes(org.id);
    if (isPreferred) {
      removeFavoriteMutation.mutate(org.id);
    } else {
      addFavoriteMutation.mutate(org.id);
    }
  };

  const handleSelect = (org: FacilityOrganizationRead) => {
    const isAlreadySelected = !!currentOrganizations?.find(
      (o) => o.id === org.id,
    );
    if (isAlreadySelected) {
      setAlreadySelected(true);
      setCurrentSelection(org);
    }
    if (org.has_children) {
      setNavigationLevels([...navigationLevels, org]);
    } else {
      handleConfirmSelection(org);
    }
    setCurrentSelection(org);
    setFacilityOrgSearch("");
  };

  const handleRemoveOrganization = (index: number) => {
    const newSelection = selectedOrganizations.filter((_, i) => i !== index);
    setSelectedOrganizations(newSelection);
    onChange(
      newSelection.length > 0 ? newSelection.map((org) => org.id) : null,
    );
  };

  const handleOrganizationViewChange = (value: string) => {
    setShowAllOrgs(value === "all");
    setNavigationLevels([]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setNavigationLevels([]);
      setFacilityOrgSearch("");
    }
  };

  const renderNavigationPath = () => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Clear button */}
        <button
          type="button"
          onClick={() => setNavigationLevels([])}
          className="hover:text-primary-600 cursor-pointer text-sm font-medium text-gray-700"
        >
          <X className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
        {navigationLevels.map((org, index) => (
          <div key={org.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNavigationLevels(navigationLevels.slice(0, index + 1));
                setFacilityOrgSearch("");
              }}
              className="hover:text-primary-600 cursor-pointer text-sm font-medium text-gray-700"
            >
              {org.name}
            </button>
            <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
          </div>
        ))}
      </div>
    );
  };

  const renderOrganizationCommand = (className?: string) => {
    return (
      <Command className={className}>
        <div className="sticky top-0 z-10 flex flex-col border-b bg-white px-3 py-2">
          <span className="text-base font-semibold text-gray-900">
            {t("select_department")}
          </span>
          <span className="mt-0.5 text-sm text-gray-500">
            {t("select_department_description")}
          </span>
        </div>
        <div className="sticky top-12 z-10 flex items-center border-b bg-white px-3 py-2">
          {navigationLevels.length > 0 ? (
            renderNavigationPath()
          ) : (
            <span className="text-sm text-gray-500">
              {t("select_from_list")}
            </span>
          )}
        </div>
        <div className="sticky top-24 z-10 flex items-center border-b bg-white px-3">
          <CommandInput
            placeholder={t("search_organizations")}
            onValueChange={setFacilityOrgSearch}
            value={facilityOrgSearch}
            className="border-none text-base focus:ring-0 sm:text-sm"
          />
        </div>
        <CommandList onWheel={(e) => e.stopPropagation()}>
          <CommandEmpty>
            {getCurrentLevelLoading() ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">
                  {t("loading_organizations")}
                </span>
              </div>
            ) : (
              t("no_organizations_found")
            )}
          </CommandEmpty>
          <CommandGroup>
            {!getCurrentLevelLoading() &&
              getCurrentLevelOrganizations().map((org) => {
                const isSelected = currentSelection?.id === org.id;
                return (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => handleSelect(org)}
                    className={cn(
                      "flex items-center justify-between",
                      isSelected && "bg-sky-50/50",
                    )}
                  >
                    <div className="flex items-center">
                      <span>{org.name}</span>
                      {isSelected && (
                        <CareIcon
                          icon="l-check"
                          className="ml-2 h-4 w-4 text-sky-600"
                        />
                      )}
                    </div>
                    {org.has_children && (
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </CommandItem>
                );
              })}
            {getCurrentLevelOrganizations().length > 0 && (
              <div ref={inViewRef} className="h-1" />
            )}
            {getCurrentLevelFetchingNextPage() && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="size-4 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">
                  {t("loading")}
                </span>
              </div>
            )}
          </CommandGroup>
        </CommandList>
        {currentSelection && (
          <div className="m-2 flex items-center justify-between rounded-md border-sky-200 bg-sky-50/50 px-3 py-2 md:m-0">
            <div className="flex flex-col">
              <span className="mb-0.5 text-xs text-gray-500">
                {t("selected")}
              </span>
              <span className="text-sm font-medium text-sky-900">
                {currentSelection.name}
              </span>
            </div>
            {alreadySelected && !currentSelection.has_children && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                disabled={alreadySelected}
              >
                <span>{t("already_selected")}</span>
                <CareIcon icon="l-multiply" className="h-4 w-4" />
              </Button>
            )}
            {currentSelection.has_children && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                onClick={() => handleConfirmSelection(currentSelection)}
                disabled={isDisabled}
              >
                {isDisabled ? (
                  <>
                    <span>{t("already_selected")}</span>
                    <CareIcon icon="l-multiply" className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>{t("confirm")}</span>
                    <CareIcon icon="l-check" className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </Command>
    );
  };

  const isDisabled = useMemo(() => {
    return (
      selectedOrganizations.some((org) => org.id === currentSelection?.id) ||
      (!!currentOrganizations &&
        currentOrganizations.some((org) => org.id === currentSelection?.id))
    );
  }, [currentSelection, currentOrganizations, selectedOrganizations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label>
            {t("select_department")}
            {!props.optional && <span className="ml-0.5 text-red-500">*</span>}
          </Label>
        </div>
      </div>

      <Tabs
        value={showAllOrgs ? "all" : "mine"}
        onValueChange={handleOrganizationViewChange}
        className="w-full sm:w-auto"
      >
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="mine">{t("my_organizations")}</TabsTrigger>
          <TabsTrigger value="all">{t("all_organizations")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            {isMobile ? (
              <>
                <Drawer open={open} onOpenChange={setOpen}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between border-dashed"
                      onClick={() => setOpen(true)}
                      type="button" // Prevents unintended form submission
                    >
                      <span className="truncate text-gray-500">
                        {currentSelection
                          ? currentSelection.name
                          : t("select_department")}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[85vh] min-h-[50vh]">
                    {renderOrganizationCommand()}
                  </DrawerContent>
                </Drawer>
              </>
            ) : (
              <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between border-dashed"
                  >
                    <span className="truncate text-gray-500">
                      {currentSelection
                        ? currentSelection.name
                        : t("select_department")}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={4}
                  className="max-h-[80vh] w-(--radix-popover-trigger-width) overflow-auto p-0"
                >
                  {renderOrganizationCommand()}
                </PopoverContent>
              </Popover>
            )}
            {selectedOrganizations.map((org, index) => {
              const isPreferred = preferredOrgIds.includes(org.id);
              return (
                <div
                  key={index}
                  className="flex flex-1 items-center gap-3 rounded-md border border-sky-100 bg-sky-50/50 p-2.5"
                >
                  <Building className="size-4 shrink-0 text-sky-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sky-900">
                      {org.name}
                    </p>
                  </div>
                  {favoriteList && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "size-8 p-0",
                        isPreferred
                          ? "text-yellow-500 hover:text-yellow-600"
                          : "text-gray-400 hover:text-yellow-500",
                      )}
                      type="button"
                      onClick={(e) => handleTogglePreferred(e, org)}
                      disabled={
                        addFavoriteMutation.isPending ||
                        removeFavoriteMutation.isPending
                      }
                    >
                      <Star
                        className={cn("size-4", isPreferred && "fill-current")}
                      />
                      <span className="sr-only">
                        {isPreferred
                          ? t("remove_from_preferred")
                          : t("mark_as_preferred")}
                      </span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-gray-500 hover:text-gray-900"
                    type="button"
                    onClick={() => handleRemoveOrganization(index)}
                  >
                    <X className="size-4" />
                    <span className="sr-only">{t("remove_organization")}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
