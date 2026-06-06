import careConfig from "@/care.config";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import CareIcon from "@/CAREUI/icons/CareIcon";
import {
  FitToWidthScrollContainer,
  ZoomProvider,
  ZoomTransform,
} from "@/CAREUI/interactive/Zoom";

import { Button } from "@/components/ui/button";

import Page from "@/components/Common/Page";

import BackButton from "@/components/Common/BackButton";
import useAutoPrint from "@/hooks/useAutoPrint";
import useBreakpoints from "@/hooks/useBreakpoints";
import { FacilityRead } from "@/types/facility/facility";
import type {
  LogoConfig,
  PrintTemplate,
  WatermarkConfig,
} from "@/types/facility/printTemplate";
import { isIOSDevice } from "@/Utils/utils";

interface WatermarkProps {
  text: string;
  color?: "red" | "gray" | "yellow";
}

type Props = {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  title: string;
  showBackButton?: boolean;
  watermark?: WatermarkProps;
  facility?: FacilityRead;
  templateSlug: string;
  hideFacilityHeader?: boolean;
};

export default function PrintPreview(props: Props) {
  const isMobile = useBreakpoints({ default: true, md: false });
  const { t } = useTranslation();

  const autoPrintEnabled =
    (props.facility
      ? resolvePrintTemplate(props.facility, props.templateSlug)?.print_setup
          ?.auto_print
      : undefined) ?? false;

  const [imagesReady, setImagesReady] = useState(false);
  const printSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImagesReady(false);
    const node = printSectionRef.current;
    if (!node || props.disabled) return;

    let cancelled = false;

    const waitForImages = async () => {
      const images = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : img.decode().catch(() => undefined),
        ),
      );
      if (!cancelled) setImagesReady(true);
    };

    waitForImages();

    return () => {
      cancelled = true;
    };
  }, [props.disabled, props.facility]);

  const { isPrinting } = useAutoPrint({
    enabled: autoPrintEnabled && imagesReady && !props.disabled,
  });

  const templateWatermark = props.facility
    ? resolvePrintTemplate(props.facility, props.templateSlug)?.watermark
    : undefined;

  const printContent = (
    <div
      ref={printSectionRef}
      id="section-to-print"
      className={cn("relative w-full overflow-clip", props.className)}
    >
      {props.watermark && <StatusWatermark watermark={props.watermark} />}
      {templateWatermark?.enabled && templateWatermark.text && (
        <TiledWatermark watermark={templateWatermark} />
      )}
      <FacilityPrintLayout
        facility={props.facility}
        templateSlug={props.templateSlug}
        hideFacilityHeader={props.hideFacilityHeader}
      >
        {props.children}
      </FacilityPrintLayout>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-6xl items-center justify-center">
      <Page
        title={props.title}
        options={
          <div className="flex items-center gap-2">
            {props.showBackButton !== false && (
              <BackButton variant="outline" data-shortcut-id="go-back">
                <CareIcon icon="l-arrow-left" className="text-lg" />
                {t("back")}
              </BackButton>
            )}
            <Button
              variant="primary"
              disabled={props.disabled || isPrinting}
              onClick={print}
            >
              <CareIcon icon="l-print" className="text-lg" />
              {t("print")}
            </Button>
          </div>
        }
      >
        {isMobile ? (
          <div className="mt-4 print:max-w-none">
            <FitToWidthScrollContainer
              className="mx-2 w-[95vw] shadow-2xl"
              contentClassName="bg-white p-4 text-sm min-w-[800px]"
            >
              {printContent}
            </FitToWidthScrollContainer>
          </div>
        ) : (
          <div className="mx-auto my-4 max-w-[95vw] sm:my-8 print:max-w-none">
            <ZoomProvider>
              <ZoomTransform className="max-w-[calc(100vw-1rem)] origin-top-left bg-white p-10 text-sm shadow-2xl transition-all duration-200 ease-in-out print:transform-none">
                {printContent}
              </ZoomTransform>
            </ZoomProvider>
          </div>
        )}
      </Page>
    </div>
  );
}

const TILE_W = 220;
const TILE_H = 100;

function StatusWatermark({ watermark }: { watermark: WatermarkProps }) {
  const colorClass = cn(
    watermark.color === "red" && "text-red-600",
    watermark.color === "gray" && "text-gray-600",
    watermark.color === "yellow" && "text-yellow-600",
    !watermark.color && "text-red-600",
  );

  return (
    <>
      {/* Print: fixed so the browser stamps it on every page (absolute on iOS where fixed print is broken) */}
      <div
        className={cn(
          "print:flex",
          isIOSDevice ? "absolute" : "fixed",
          "pointer-events-none inset-0 z-10 flex items-center justify-center select-none",
        )}
      >
        <span
          className={cn(
            "-rotate-30 text-6xl font-bold tracking-widest whitespace-nowrap uppercase opacity-20",
            colorClass,
          )}
        >
          {watermark.text}
        </span>
      </div>
    </>
  );
}

function buildWatermarkSvg(text: string, rotation: number): string {
  const encoded = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE_W}' height='${TILE_H}'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(${rotation} ${TILE_W / 2} ${TILE_H / 2})' font-size='12' font-weight='600' font-family='sans-serif' letter-spacing='2' fill='currentColor'>${encoded}</text></svg>`;
}

function TiledWatermark({ watermark }: { watermark: WatermarkConfig }) {
  const opacity = watermark.opacity ?? 0.08;
  const rotation = watermark.rotation ?? -30;
  const svg = buildWatermarkSvg(watermark.text!, rotation);
  const dataUri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10 text-gray-900 select-none print:hidden"
        aria-hidden="true"
        style={{
          backgroundImage: dataUri,
          backgroundRepeat: "repeat",
          backgroundSize: `${TILE_W}px ${TILE_H}px`,
          opacity,
        }}
      />
      <div
        className={cn(
          "pointer-events-none inset-0 z-10 hidden text-gray-900 select-none print:block",
          isIOSDevice ? "absolute" : "fixed",
        )}
        aria-hidden="true"
        style={{
          backgroundImage: dataUri,
          backgroundRepeat: "repeat",
          backgroundSize: `${TILE_W}px ${TILE_H}px`,
          opacity,
        }}
      />
    </>
  );
}

function resolvePrintTemplate(
  facility: FacilityRead,
  templateSlug?: string,
): PrintTemplate | undefined {
  const templates = facility.print_templates;
  if (!templates?.length) return undefined;

  const match = templateSlug
    ? templates.find((t) => t.slug === templateSlug)
    : undefined;

  return match ?? templates.find((t) => t.slug === "default");
}

function buildPageStyle(template?: PrintTemplate): string | null {
  const page = template?.page;
  if (!page) return null;

  const parts: string[] = [];

  if (page.size || page.orientation) {
    const sizeParts = [page.size, page.orientation].filter(Boolean).join(" ");
    parts.push(`size: ${sizeParts}`);
  }

  if (page.margin) {
    const { top, right, bottom, left } = page.margin;
    parts.push(`margin: ${top}mm ${right}mm ${bottom}mm ${left}mm`);
  }

  if (parts.length === 0) return null;

  return `@media print { @page { ${parts.join("; ")}; } }`;
}

function FacilityInfo({ facility }: { facility: FacilityRead }) {
  return (
    <div className="text-left">
      <h1 className="text-2xl font-semibold">{facility.name}</h1>
      <div className="text-xs wrap-break-word whitespace-pre-wrap text-gray-500">
        {facility.address}
        <p className="text-xs text-gray-500">{facility.phone_number}</p>
      </div>
    </div>
  );
}

function FacilityLogo({
  logoUrl,
  logo,
}: {
  logoUrl?: string;
  logo?: LogoConfig;
}) {
  const hasCustomDims = !!(logoUrl && (logo?.width || logo?.height));

  return (
    <img
      src={logoUrl ?? careConfig.mainLogo?.dark}
      alt={logoUrl ? "Facility brand mark" : "Care Logo"}
      className={cn(
        "mb-2 object-contain sm:mb-0",
        !hasCustomDims && "h-10 w-auto",
      )}
      style={
        logoUrl
          ? {
              ...(logo?.width ? { width: `${logo.width}px` } : {}),
              ...(logo?.height ? { height: `${logo.height}px` } : {}),
            }
          : undefined
      }
    />
  );
}

function FacilityPrintLayout({
  templateSlug,
  facility,
  children,
  hideFacilityHeader,
}: {
  templateSlug?: string;
  facility?: FacilityRead;
  children: ReactNode;
  hideFacilityHeader?: boolean;
}) {
  if (!facility) {
    return <>{children}</>;
  }

  const printTemplate = resolvePrintTemplate(facility, templateSlug);
  const headerImage = printTemplate?.branding?.header_image;
  const footerImage = printTemplate?.branding?.footer_image;
  const logo = printTemplate?.branding?.logo;
  const pageStyle = buildPageStyle(printTemplate);
  const logoUrl = logo?.url || undefined;
  const alignment = logoUrl ? (logo?.alignment ?? "right") : "right";

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col print:min-h-screen">
      {pageStyle && <style>{pageStyle}</style>}
      {hideFacilityHeader ? null : headerImage?.url ? (
        <div className="mb-2 flex items-start justify-between pb-2">
          <img
            src={headerImage.url}
            alt="Custom Header"
            className="h-auto max-w-3xl flex-1 object-contain"
            style={
              headerImage.height
                ? { maxHeight: `${headerImage.height}px` }
                : undefined
            }
          />
        </div>
      ) : alignment === "center" ? (
        <div className="mb-3 flex flex-col items-center gap-2 border-b border-gray-200 pb-2">
          <FacilityLogo logoUrl={logoUrl} logo={logo} />
          <div className="w-full">
            <FacilityInfo facility={facility} />
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-start justify-between border-b border-gray-200 pb-2">
          {alignment === "left" ? (
            <>
              <FacilityLogo logoUrl={logoUrl} logo={logo} />
              <FacilityInfo facility={facility} />
            </>
          ) : (
            <>
              <FacilityInfo facility={facility} />
              <FacilityLogo logoUrl={logoUrl} logo={logo} />
            </>
          )}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footerImage?.url && (
        <div className="mt-auto pt-2">
          <img
            src={footerImage.url}
            alt="Footer"
            className="h-auto w-full object-contain"
            style={
              footerImage.height
                ? { maxHeight: `${footerImage.height}px` }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
