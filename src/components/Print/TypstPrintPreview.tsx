import type { ComponentType } from "react";

import { InvoicePrint } from "@/components/Print/InvoicePrint";
import type {
  PrintWrapperProps,
  TypstPrintPreviewBase,
  TypstPrintPreviewProps,
} from "@/components/Print/types";

const WRAPPERS: Record<string, ComponentType<PrintWrapperProps>> = {
  invoice: InvoicePrint,
};

/**
 * Overrides the host's `TypstPrintPreview`, the single component every Typst
 * print renders. Prints whose template has a wrapper get their `content`
 * adjusted; all others render the host component unchanged.
 */
export function PlugTypstPrintPreview({
  __base: Base,
  ...props
}: TypstPrintPreviewProps & { __base: TypstPrintPreviewBase }) {
  const Wrapper = WRAPPERS[props.template];
  return Wrapper ? <Wrapper Base={Base} {...props} /> : <Base {...props} />;
}
