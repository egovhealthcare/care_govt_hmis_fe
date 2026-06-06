import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import "./DisablingCover.css";

interface DisablingCoverProps {
  disabled: boolean;
  message?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export function DisablingCover({
  disabled,
  message,
  containerClassName = "",
  children,
}: DisablingCoverProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("loading");

  return (
    <div className={cn("relative", containerClassName)}>
      {disabled && (
        <>
          <div className="absolute z-20 flex h-full w-full items-center justify-center bg-white opacity-75" />
          <div className="absolute z-20 flex h-full w-full items-center justify-center">
            <div className="disabling-cover__loading-container rounded-lg bg-white p-4 shadow-xl">
              <div className="disabling-cover__loading-animation-box mx-auto">
                <div className="disabling-cover__loading-box-1" />
                <div className="disabling-cover__loading-box-2" />
                <div className="disabling-cover__loading-box-3" />
              </div>
              <span className="block max-w-sm pt-2 text-center text-sm font-semibold">
                {displayMessage}
              </span>
            </div>
          </div>
        </>
      )}
      {children}
    </div>
  );
}
