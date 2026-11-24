import type { ComponentType } from "react";

/**
 * The subset of the host's `TypstPrintPreview` props the plug reads. The rest
 * (title, facility, files, …) pass through to the host untouched.
 */
export interface TypstPrintPreviewProps {
  /** Template file name in the host's `src/print/templates`, without `.typ`. */
  template: string;
  /** JSON the template reads. `undefined` keeps the host's loading state. */
  content: unknown;
  [key: string]: unknown;
}

export type TypstPrintPreviewBase = ComponentType<TypstPrintPreviewProps>;

export interface PrintWrapperProps extends TypstPrintPreviewProps {
  Base: TypstPrintPreviewBase;
}
