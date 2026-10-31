/** @category Pictograms */
import React, { forwardRef, memo, useEffect, useRef } from 'react';
import classNames, { type Argument } from 'classnames';
import { RenderIfValueIsTruthy } from '@egen-civitas/esm-react-utils';
import style from './pictograms.module.scss';

/** Array of all available Egen pictogram IDs that can be used with the Pictogram component. */
export const pictogramIds = [
  'egen-pict-appointments',
  'egen-pict-assessment-1',
  'egen-pict-assessment-2',
  'egen-pict-facility',
  'egen-pict-payments-desk',
  'egen-pict-registration',
  'egen-pict-service-queues',
  'egen-pict-stock-management',
  'egen-pict-transfer',
] as const;

export type PictogramId = (typeof pictogramIds)[number];

export type PictogramProps = {
  className?: Argument;
  size?: number;
};

export const AppointmentsPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function AppointmentsPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-appointments" pictogramProps={props} />;
  }),
);

/**
 * @deprecated use AppointmentsPictogram instead
 */
export const AppointmentsAltPictogram = AppointmentsPictogram;

export const Assessment1Pictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function Assessment1Pictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-assessment-1" pictogramProps={props} />;
  }),
);

export const Assessment2Pictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function Assessment2Pictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-assessment-2" pictogramProps={props} />;
  }),
);

export const FacilityPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function FacilityPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-facility" pictogramProps={props} />;
  }),
);

export const PaymentsDeskPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function PaymentsDeskPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-payments-desk" pictogramProps={props} />;
  }),
);

export const RegistrationPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function RegistrationPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-registration" pictogramProps={props} />;
  }),
);

export const ServiceQueuesPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function ServiceQueuesPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-service-queues" pictogramProps={props} />;
  }),
);

export const StockManagementPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function StockManagementPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-stock-management" pictogramProps={props} />;
  }),
);

export const TransferPictogram = memo(
  forwardRef<SVGSVGElement, PictogramProps>(function TransferPictogram(props, ref) {
    return <Pictogram ref={ref} pictogram="egen-pict-transfer" pictogramProps={props} />;
  }),
);

// Pictogram aliases that are a little more aligned to specific use-cases
// should all resolve to a defined React icon

export const HomePictogram = FacilityPictogram;

/**
 * This is a utility component that takes an `pictogram` and render it if the sprite for the pictogram
 * is available. The goal is to make it easier to conditionally render configuration-specified pictograms.
 *
 * @example
 * ```tsx
 *   <MaybePictogram pictogram='egen-icon-user' className={styles.myPictogramStyles} />
 * ```
 */
export const MaybePictogram = memo(
  forwardRef<SVGSVGElement, { pictogram: string; fallback?: React.ReactNode } & PictogramProps>(function MaybePictogram(
    { pictogram, fallback, ...pictogramProps },
    ref,
  ) {
    const iconRef = useRef(document.getElementById(pictogram));

    useEffect(() => {
      const container = document.getElementById('egen-svgs-container');
      const callback: MutationCallback = (mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            iconRef.current = document.getElementById(pictogram);
          }
        }
      };

      const observer = new MutationObserver(callback);
      if (container) {
        observer.observe(container, { childList: true });
      }

      return () => observer.disconnect();
    }, [pictogram]);

    return (
      <RenderIfValueIsTruthy value={iconRef.current} fallback={fallback}>
        <Pictogram ref={ref} pictogram={pictogram as PictogramId} pictogramProps={pictogramProps} />
      </RenderIfValueIsTruthy>
    );
  }),
);

export type SvgPictogramProps = {
  /** the id of the pictogram  */
  pictogram: PictogramId;
  /** properties when using the pictogram  */
  pictogramProps: PictogramProps;
};

/**
 * This is a utility type for custom pictograms. Please maintain alphabetical order when adding new pictograms for readability.
 */
export const Pictogram = memo(
  forwardRef<SVGSVGElement, SvgPictogramProps>(function Pictogram({ pictogram, pictogramProps }, ref) {
    let { className, size } = Object.assign({}, { size: 92 }, pictogramProps);
    if (size <= 26 || size > 144) {
      console.error(`Invalid size '${size}' specified for ${pictogram}. Defaulting to 92.`);
      size = 92;
    }

    return (
      <svg ref={ref} className={classNames(style.pictogram, className)} height={size} width={size}>
        <use href={`#${pictogram}`} />
      </svg>
    );
  }),
);
