import { cn } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RadioInputProps extends React.ComponentProps<typeof RadioGroup> {
  options: {
    label: string;
    value: string;
  }[];
}

export default function RadioInput({ options, ...props }: RadioInputProps) {
  return (
    <RadioGroup
      {...props}
      className={cn("flex flex-wrap gap-4", props.className)}
    >
      {options.map((option) => (
        <div
          className={cn(
            "hover:border-primary-500 group w-full cursor-pointer rounded-md border p-2 text-left sm:w-auto",
            props.value === option.value
              ? "bg-primary-100 border-primary-500"
              : "border-gray-300 bg-white",
          )}
          key={`${option.value}-${props.value}`} // to prevent race condition
          onClick={() => {
            if (!props.disabled) {
              if (props.value === option.value && !props.required) {
                props.onValueChange?.("");
              } else {
                props.onValueChange?.(option.value.toString());
              }
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value.toString()}
              id={option.value}
              className="text-primary focus:ring-primary group-hover:border-primary-500 h-4 w-4 border-2 border-gray-300"
            />
            <Label
              htmlFor={option.value}
              className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {option.label}
            </Label>
          </div>
        </div>
      ))}
    </RadioGroup>
  );
}
