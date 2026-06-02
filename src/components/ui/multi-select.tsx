import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import CareIcon, { IconName } from "@/CAREUI/icons/CareIcon";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useBreakpoints from "@/hooks/useBreakpoints";

type ButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  keyof MultiSelectProps
>;
interface MultiSelectProps {
  options: {
    label: string;
    value: string;
    icon?: IconName;
  }[];
  onValueChange: (value: string[]) => void;
  value: string[];
  placeholder: string;
  className?: string;
  selectionSummary?: string;
  translationBasekey?: string;
}

function ListContent({
  translationBasekey,
  options,
  value,
  selectedValues,
  setSelectedValues,
  onValueChange,
  setOpen,
}: {
  translationBasekey?: string;
  options: {
    label: string;
    value: string;
    icon?: IconName;
  }[];
  value: string[];
  selectedValues: string[];
  setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>;
  onValueChange: (value: string[]) => void;
  setOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  const handleToggleOption = (option: string) => {
    setSelectedValues((prevSelectedValues) =>
      prevSelectedValues.includes(option)
        ? prevSelectedValues.filter((v) => v !== option)
        : [...prevSelectedValues, option],
    );
  };
  const handleSelectAll = () => {
    setSelectedValues((prevSelectedValues) => {
      if (prevSelectedValues.length === options.length) return [];
      return options.map((o) => o.value);
    });
  };
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Command className="min-h-0 flex-1 overflow-hidden">
        <div className="m-1 mb-2 rounded-md border border-gray-200">
          <CommandInput
            placeholder={
              translationBasekey
                ? t(`search_${translationBasekey}`)
                : t("search_options")
            }
            className="-ml-3 border-none shadow-none ring-0 outline-hidden"
            autoFocus
          />
        </div>
        <CommandList className="max-h-none">
          <CommandEmpty>{t("no_results_found")}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              key="all"
              onSelect={handleSelectAll}
              className="h-10 cursor-pointer"
            >
              <Checkbox
                checked={selectedValues.length === options.length}
                aria-label="Select all options"
                className="data-[state=checked]:text-white"
              />
              <span className="font-medium">{t("select_all")}</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="mx-auto w-[95%]" />

          {value.length > 0 && (
            <>
              <CommandGroup heading={t("selected")}>
                {options
                  .filter((option) => value.includes(option.value))
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleToggleOption(option.value)}
                      aria-label={`Select ${option.label}`}
                      className="flex h-10 cursor-pointer gap-3"
                    >
                      <Checkbox
                        checked={selectedValues.includes(option.value)}
                        className="data-[state=checked]:text-white"
                      />

                      <div className="flex items-center gap-1">
                        {option?.icon && (
                          <CareIcon icon={option.icon} className="size-4" />
                        )}
                        <span>{option.label}</span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>

              <CommandSeparator className="mx-auto w-[95%]" />
            </>
          )}

          {value.length < options.length && (
            <CommandGroup>
              {options
                .filter((option) => !value.includes(option.value))
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleToggleOption(option.value)}
                    aria-label={`Select ${option.label}`}
                    className="flex h-10 cursor-pointer gap-3"
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      className="data-[state=checked]:text-white"
                    />

                    <div className="flex items-center gap-1">
                      {option?.icon && (
                        <CareIcon icon={option.icon} className="size-4" />
                      )}
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      <div className="flex shrink-0 justify-end space-x-2 border-t border-t-gray-200 p-3">
        <Button
          variant="link"
          size="md"
          className="underline"
          onClick={() => setOpen(false)}
        >
          {t("cancel")}
        </Button>
        <Button
          variant="primary_gradient"
          size="md"
          onClick={() => {
            onValueChange(selectedValues);
            setOpen(false);
          }}
        >
          {t("done")}
        </Button>
      </div>
    </div>
  );
}

export function MultiSelect({
  options,
  onValueChange,
  value = [],
  placeholder,
  className,
  ref,
  selectionSummary,
  translationBasekey,
  ...props
}: ButtonProps & MultiSelectProps) {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(value);
  const [open, setOpen] = React.useState(false);
  const isMobile = useBreakpoints({ default: true, sm: false });

  React.useEffect(() => {
    setSelectedValues(value);
  }, [value, open]);
  React.useEffect(() => {
    if (open == false) onValueChange(selectedValues);
  }, [open]);

  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="w-full">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              ref={ref}
              role="combobox"
              onClick={() => setOpen((open) => !open)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border p-1",
                open && "border-0 ring-2 ring-blue-500",
                className,
              )}
              {...props}
            >
              <div className="flex w-full items-center justify-between">
                {value.length == 0 ? (
                  <span className="mx-3 text-sm text-gray-500">
                    {placeholder}
                  </span>
                ) : (
                  <Badge className="m-1" variant="secondary">
                    {selectionSummary
                      ? selectionSummary
                      : t("options_selected", { count: value.length })}
                  </Badge>
                )}
                {open ? (
                  <ChevronUp className="mx-2 h-4 cursor-pointer text-black" />
                ) : (
                  <ChevronDown className="mx-2 h-4 cursor-pointer text-black" />
                )}
              </div>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="flex h-[50vh] flex-col px-0 pt-2">
            <div className="mt-3 flex flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
              <ListContent
                translationBasekey={translationBasekey}
                options={options}
                value={value}
                setSelectedValues={setSelectedValues}
                selectedValues={selectedValues}
                onValueChange={onValueChange}
                setOpen={setOpen}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            ref={ref}
            role="combobox"
            onClick={() => setOpen((open) => !open)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border p-1",
              open && "border-0 ring-2 ring-blue-500",
              className,
            )}
            {...props}
          >
            <div className="flex w-full items-center justify-between">
              {value.length == 0 ? (
                <span className="mx-3 text-sm text-gray-500">
                  {placeholder}
                </span>
              ) : (
                <Badge className="m-1" variant="secondary">
                  {selectionSummary
                    ? selectionSummary
                    : t("options_selected", { count: value.length })}
                </Badge>
              )}
              {open ? (
                <ChevronUp className="mx-2 h-4 cursor-pointer text-black" />
              ) : (
                <ChevronDown className="mx-2 h-4 cursor-pointer text-black" />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="flex max-h-[35vh] w-(--radix-popover-trigger-width) flex-col overflow-hidden p-0"
          align="center"
        >
          <ListContent
            translationBasekey={translationBasekey}
            options={options}
            value={value}
            setSelectedValues={setSelectedValues}
            selectedValues={selectedValues}
            onValueChange={onValueChange}
            setOpen={setOpen}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

MultiSelect.displayName = "MultiSelect";
