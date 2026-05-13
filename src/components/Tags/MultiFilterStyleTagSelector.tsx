import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronLeft,
  Component,
  Loader2,
  Space,
  Tag as TagIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import query from "@/Utils/request/query";
import { TagConfig, TagResource } from "@/types/emr/tagConfig/tagConfig";
import tagConfigApi from "@/types/emr/tagConfig/tagConfigApi";

interface MultiFilterStyleTagSelectorProps {
  selected: TagConfig[];
  onChange: (tags: TagConfig[]) => void;
  resource: TagResource;
  facilityId?: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

// Clean, minimal tag selector matching multi-filter design
export function MultiFilterStyleTagSelector({
  selected,
  onChange,
  facilityId,
  resource,
  className,
  disabled = false,
  isLoading = false,
  trigger,
}: MultiFilterStyleTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [childDrawerOpen, setChildDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TagConfig | null>(null);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Fetch top-level tags (both instance and facility tags in one call)
  const { data: rootTags, isLoading: isLoadingRoot } = useQuery({
    queryKey: ["tags", resource, search, facilityId],
    queryFn: query.debounced(tagConfigApi.list, {
      queryParams: {
        resource,
        status: "active",
        ...(search ? { display: search } : { parent_is_null: true }),
        ...(facilityId && { facility: facilityId }),
      },
    }),
    enabled: open || mobileDrawerOpen,
  });

  // Fetch children for active group popover (both instance and facility tags in one call)
  const { data: childTags, isLoading: isLoadingChildren } = useQuery({
    queryKey: [
      "tags",
      resource,
      "parent",
      groupPopoverOpen || selectedGroup?.id,
      facilityId,
    ],
    queryFn: query(tagConfigApi.list, {
      queryParams: {
        resource,
        parent: groupPopoverOpen || selectedGroup?.id,
        status: "active",
        ...(facilityId && { facility: facilityId }),
      },
    }),
    enabled:
      (open && !!groupPopoverOpen) || (childDrawerOpen && !!selectedGroup),
  });

  // Select/deselect tag
  const handleSelect = (tag: TagConfig) => {
    // If tag has a parent, enforce single selection per group
    const parentId =
      tag.parent && typeof tag.parent === "object" && "id" in tag.parent
        ? tag.parent.id
        : undefined;

    const alreadySelectedInGroup = selected.find(
      (t) =>
        t.parent &&
        typeof t.parent === "object" &&
        "id" in t.parent &&
        t.parent.id === parentId,
    );

    const isCurrentlySelected = selected.some((t) => t.id === tag.id);

    if (isCurrentlySelected) {
      onChange(selected.filter((t) => t.id !== tag.id));
    } else {
      onChange([
        ...selected.filter((t) => t.id !== alreadySelectedInGroup?.id),
        tag,
      ]);
    }
  };

  const handleMobileGroupClick = (group: TagConfig) => {
    setSelectedGroup(group);
    setChildDrawerOpen(true);
  };

  const handleMobileBack = () => {
    setChildDrawerOpen(false);
    setSelectedGroup(null);
  };

  const isSelected = (tag: TagConfig) => selected.some((t) => t.id === tag.id);

  // Render tag list for mobile
  const renderMobileTagList = (tags: TagConfig[], showGroups = true) => (
    <div className="space-y-1">
      {tags
        ?.filter((tag) => (showGroups ? tag.has_children : !tag.has_children))
        .map((tag) => (
          <div
            key={tag.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
            onClick={() => {
              if (tag.has_children) {
                handleMobileGroupClick(tag);
              } else {
                handleSelect(tag);
              }
            }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={isSelected(tag)}
              data-state={isSelected(tag) ? "checked" : "unchecked"}
              className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSelected(tag) && (
                <span className="flex items-center justify-center text-current transition-none">
                  <Check className="size-3.5" />
                </span>
              )}
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {tag.has_children ? (
                <Component className="h-4 w-4 text-gray-600" />
              ) : (
                <div className="h-3 w-3 flex-shrink-0 rounded-full border border-blue-300 bg-blue-100"></div>
              )}
              <span className="truncate text-sm">{tag.display}</span>
              {tag.has_children && (
                <Badge className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 p-0.5 text-xs font-medium text-gray-900 transition-colors">
                  {t("group")}
                </Badge>
              )}
            </div>
            {tag.has_children && (
              <ArrowRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        ))}
    </div>
  );

  // Common trigger button
  const triggerButton = trigger ? (
    trigger
  ) : (
    <Button
      variant="outline"
      className={cn(
        "h-10",
        selected.length > 0 && "h-auto border-blue-300 bg-blue-50",
        className,
      )}
      disabled={disabled || isLoading}
    >
      <div className="flex w-full min-w-0 items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <TagIcon className="h-3 w-3" />
        )}

        <div className="flex w-full min-w-0 flex-wrap gap-1 overflow-hidden">
          {isLoading ? (
            <span>{t("updating_tags")}</span>
          ) : selected.length > 0 ? (
            selected.slice(0, 3).map((t) => (
              <Badge
                key={t.id}
                className="overflow-wrap-anywhere border-blue-300 bg-blue-100 break-words whitespace-normal text-blue-900"
              >
                {t.display}
              </Badge>
            ))
          ) : (
            <span>{t("add_tags")}</span>
          )}
          {selected.length > 3 && (
            <Badge className="shrink-0 border-gray-300 bg-gray-100 text-gray-900">
              +{selected.length - 3} {t("more")}
            </Badge>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile ? (
        <>
          <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
            <DrawerContent className="flex max-h-[85vh] flex-col">
              <DrawerHeader className="pb-3">
                <DrawerTitle className="flex items-center gap-2">
                  {t("manage_tags")}
                </DrawerTitle>
              </DrawerHeader>

              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Search */}
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    placeholder={t("search_tags")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="focus:ring-primary-500 focus:border-primary-500 flex h-8 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs transition-colors duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-950 placeholder:text-gray-500 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4">
                  {/* Selected Tags */}
                  {selected.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                        {t("selected_tags")}
                      </div>
                      {selected.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
                          onClick={() => handleSelect(tag)}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked="true"
                            data-state="checked"
                            className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="flex items-center justify-center text-current transition-none">
                              <Check className="size-3.5" />
                            </span>
                          </button>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {tag.parent && (
                              <Component className="h-3 w-3 text-gray-600" />
                            )}
                            <div className="h-3 w-3 flex-shrink-0 rounded-full border border-blue-300 bg-blue-100"></div>
                            <span className="truncate text-sm">
                              {tag.display}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tag Groups */}
                  {rootTags?.results &&
                    rootTags.results.filter((tag) => tag.has_children).length >
                      0 && (
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {t("tag_groups")}
                        </div>
                        {renderMobileTagList(rootTags.results, true)}
                      </div>
                    )}

                  {/* Other Tags */}
                  {rootTags?.results &&
                    rootTags.results.filter((tag) => !tag.has_children).length >
                      0 && (
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {t("other_tags")}
                        </div>
                        {renderMobileTagList(rootTags.results, false)}
                      </div>
                    )}

                  {isLoadingRoot && (
                    <div className="py-8 text-center text-sm text-gray-500">
                      {t("loading")}
                    </div>
                  )}

                  {!isLoadingRoot && !rootTags?.results?.length && (
                    <div className="py-8 text-center text-sm text-gray-500">
                      {t("no_tags_group")}
                    </div>
                  )}
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Child Tags Drawer */}
          <Drawer open={childDrawerOpen} onOpenChange={setChildDrawerOpen}>
            <DrawerContent className="flex max-h-[85vh] flex-col">
              <DrawerHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMobileBack}
                    className="h-8 w-8 p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DrawerTitle className="flex items-center gap-2">
                    <Component className="h-4 w-4" />
                    {selectedGroup?.display}
                  </DrawerTitle>
                </div>
              </DrawerHeader>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4">
                  {isLoadingChildren ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      {t("loading")}
                    </div>
                  ) : childTags?.results?.length ? (
                    <div className="space-y-1">
                      {childTags.results.map((childTag) => (
                        <div
                          key={childTag.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
                          onClick={() => handleSelect(childTag)}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected(childTag)}
                            data-state={
                              isSelected(childTag) ? "checked" : "unchecked"
                            }
                            className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSelected(childTag) && (
                              <span className="flex items-center justify-center text-current transition-none">
                                <Check className="size-3.5" />
                              </span>
                            )}
                          </button>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="h-3 w-3 flex-shrink-0 rounded-full border border-green-300 bg-green-100"></div>
                            <span className="truncate text-sm">
                              {childTag.display}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                      {t("no_tags")}
                    </div>
                  )}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        /* Desktop Dropdown */
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[calc(100vw)] max-w-[calc(100vw-3rem)] p-0 sm:max-w-xs"
            align="start"
          >
            <div className="p-0">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-gray-200 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {t("tags", { count: selected.length })}
                </span>
              </div>

              {/* Content */}
              <div className="max-h-[calc(100vh-28rem)] overflow-y-auto p-2">
                {/* Search */}
                <input
                  type="text"
                  placeholder={t("search_tags")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 mb-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs transition-colors duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-950 placeholder:text-gray-500 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />

                <div>
                  {/* Selected Tags */}
                  {selected.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
                        {t("selected_tags")}
                      </div>
                      {selected.map((tag) => (
                        <div
                          key={tag.id}
                          className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2.5 text-sm outline-hidden select-none focus:bg-gray-100 focus:text-gray-900"
                          onClick={() => handleSelect(tag)}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked="true"
                            data-state="checked"
                            className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="flex items-center justify-center text-current transition-none">
                              <Check className="size-3.5" />
                            </span>
                          </button>
                          <div className="flex max-w-xs items-center gap-2 truncate">
                            <span className="flex min-w-0 flex-row items-center gap-1 text-sm">
                              {tag.parent && (
                                <Component className="h-3 w-3 text-black/80" />
                              )}
                              {tag.parent && (
                                <span className="flex flex-shrink-0 items-center gap-1">
                                  <span className="truncate text-gray-700">
                                    {tag.parent.display}
                                  </span>
                                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                </span>
                              )}
                              <div className="h-3 w-3 flex-shrink-0 rounded-full border border-blue-300 bg-blue-100"></div>
                              <span className="truncate">{tag.display}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="-mx-1 my-1 h-px bg-gray-200"></div>
                    </>
                  )}

                  {/* Tag Groups */}
                  {rootTags?.results &&
                    rootTags.results.filter((tag) => tag.has_children).length >
                      0 && (
                      <>
                        <div className="mt-2 px-2 py-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {t("tag_groups")}
                        </div>
                        {rootTags?.results
                          ?.filter((tag) => tag.has_children)
                          .map((tag) => (
                            <div key={tag.id} className="relative">
                              <Popover
                                open={groupPopoverOpen === tag.id}
                                onOpenChange={(open) =>
                                  setGroupPopoverOpen(open ? tag.id : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <div className="flex cursor-default items-center gap-2 rounded-sm px-2 py-2.5 text-sm outline-hidden select-none focus:bg-gray-100 focus:text-gray-900">
                                    <div className="flex flex-1 items-center justify-between gap-2">
                                      <div className="flex items-center gap-1">
                                        <Component className="h-4 w-4 text-black/80" />
                                        <span className="text-sm">
                                          {tag.display}
                                        </span>
                                      </div>
                                      <Badge className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 p-0.5 text-xs font-medium text-gray-900 transition-colors">
                                        {t("group")}
                                      </Badge>
                                    </div>
                                    <ArrowRight className="ml-auto size-4" />
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-64 p-0"
                                  side="right"
                                  align="start"
                                  sideOffset={5}
                                >
                                  <div className="border-b border-gray-200 p-2">
                                    <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                      {tag.display}
                                    </div>
                                  </div>
                                  {isLoadingChildren ? (
                                    <div className="p-2 text-sm text-gray-500">
                                      {t("loading")}
                                    </div>
                                  ) : childTags?.results?.length ? (
                                    childTags.results.map((childTag) => (
                                      <div
                                        key={childTag.id}
                                        className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-hidden select-none focus:bg-gray-100 focus:text-gray-900"
                                        onClick={() => handleSelect(childTag)}
                                      >
                                        <button
                                          type="button"
                                          role="checkbox"
                                          aria-checked={isSelected(childTag)}
                                          data-state={
                                            isSelected(childTag)
                                              ? "checked"
                                              : "unchecked"
                                          }
                                          className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {isSelected(childTag) && (
                                            <span className="flex items-center justify-center text-current transition-none">
                                              <Check className="size-3.5" />
                                            </span>
                                          )}
                                        </button>
                                        <div className="flex flex-1 items-center gap-2">
                                          <div className="h-3 w-3 flex-shrink-0 rounded-full border border-green-300 bg-green-100"></div>
                                          <span className="text-sm">
                                            {childTag.display}
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-gray-500">
                                      {t("no_tags")}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                          ))}
                        <div className="-mx-1 my-1 h-px bg-gray-200"></div>
                      </>
                    )}

                  {/* Other Tags */}
                  {rootTags?.results &&
                    rootTags.results.filter((tag) => !tag.has_children).length >
                      0 && (
                      <>
                        <div className="mt-2 px-2 py-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {t("other_tags")}
                        </div>
                        {rootTags?.results
                          ?.filter((tag) => !tag.has_children)
                          .map((tag) => (
                            <div
                              key={tag.id}
                              className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2.5 text-sm outline-hidden select-none focus:bg-gray-100 focus:text-gray-900"
                              onClick={() => handleSelect(tag)}
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isSelected(tag)}
                                data-state={
                                  isSelected(tag) ? "checked" : "unchecked"
                                }
                                className="peer data-[state=checked]:bg-primary-600 data-[state=checked]:text-primary-100 data-[state=checked]:border-primary-600 focus-visible:border-primary-600 focus-visible:ring-primary-500/50 size-4 h-4 w-4 shrink-0 rounded-[4px] border border-gray-200 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSelected(tag) && (
                                  <span className="flex items-center justify-center text-current transition-none">
                                    <Check className="size-3.5" />
                                  </span>
                                )}
                              </button>
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div className="h-3 w-3 flex-shrink-0 rounded-full border border-blue-300 bg-blue-100"></div>
                                <span className="truncate text-sm">
                                  {tag.display}
                                </span>
                              </div>
                            </div>
                          ))}
                      </>
                    )}

                  {isLoadingRoot && (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      {t("loading")}
                    </div>
                  )}

                  {!isLoadingRoot && !rootTags?.results?.length && (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      {t("no_tags_group")}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Navigation */}
              <div className="h-px bg-gray-200"></div>
              <div className="flex h-11 items-center justify-between">
                <div className="mx-4 my-3.5 flex gap-1">
                  <div className="shadow-full flex items-center rounded-md border border-gray-300 bg-gray-100 px-1">
                    <ArrowUp className="size-3" />
                  </div>
                  <div className="shadow-full flex items-center rounded-md border border-gray-300 bg-gray-100 px-1">
                    <ArrowDown className="size-3" />
                  </div>
                  <span className="self-center text-xs text-gray-700">
                    {t("navigate")}
                  </span>
                </div>
                <div className="mx-4 my-3.5 flex gap-1">
                  <div className="shadow-full flex items-center rounded-md border border-gray-300 bg-gray-100 px-1">
                    <Space className="size-3" />
                  </div>
                  <span className="self-center text-xs text-gray-700">
                    {t("to_select")}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
