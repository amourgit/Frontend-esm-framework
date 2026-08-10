/** @category Icons */
import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import classNames, { type Argument } from 'classnames';
import { RenderIfValueIsTruthy } from '@egen/esm-react-utils';
import style from './icons.module.scss';

/** Array of all available Egen icon IDs that can be used with the Icon component. */
export const iconIds = [
  'egen-icon-activity',
  'egen-icon-add',
  'egen-icon-arrow-down',
  'egen-icon-arrow-left',
  'egen-icon-arrow-right',
  'egen-icon-arrow-up',
  'egen-icon-baby',
  'egen-icon-calendar-heat-map',
  'egen-icon-calendar',
  'egen-icon-caret-down',
  'egen-icon-caret-left',
  'egen-icon-caret-right',
  'egen-icon-caret-up',
  'egen-icon-chart-average',
  'egen-icon-chart-line',
  'egen-icon-checkmark-filled',
  'egen-icon-checkmark-outline',
  'egen-icon-chemistry',
  'egen-icon-chevron-down',
  'egen-icon-chevron-left',
  'egen-icon-chevron-right',
  'egen-icon-chevron-up',
  'egen-icon-close',
  'egen-icon-close-filled',
  'egen-icon-close-outline',
  'egen-icon-document',
  'egen-icon-document-attachment',
  'egen-icon-download',
  'egen-icon-drug-order',
  'egen-icon-edit',
  'egen-icon-event-schedule',
  'egen-icon-events',
  'egen-icon-gender-female',
  'egen-icon-gender-male',
  'egen-icon-gender-other',
  'egen-icon-gender-unknown',
  'egen-icon-generic-order-type',
  'egen-icon-group',
  'egen-icon-group-access',
  'egen-icon-hospital-bed',
  'egen-icon-image-medical',
  'egen-icon-information',
  'egen-icon-information-filled',
  'egen-icon-information-square',
  'egen-icon-inventory-management',
  'egen-icon-lab-order',
  'egen-icon-list-checked',
  'egen-icon-location',
  'egen-icon-material-order',
  'egen-icon-maximize',
  'egen-icon-medication',
  'egen-icon-message-queue',
  'egen-icon-microscope',
  'egen-icon-money',
  'egen-icon-mother',
  'egen-icon-movement',
  'egen-icon-overflow-menu--horizontal',
  'egen-icon-overflow-menu--vertical',
  'egen-icon-password',
  'egen-icon-pedestrian-family',
  'egen-icon-pen',
  'egen-icon-printer',
  'egen-icon-procedure-order',
  'egen-icon-programs',
  'egen-icon-renew',
  'egen-icon-referral-order',
  'egen-icon-report',
  'egen-icon-reset',
  'egen-icon-save',
  'egen-icon-search',
  'egen-icon-settings',
  'egen-icon-shopping-cart',
  'egen-icon-shopping-cart--arrow-down',
  'egen-icon-sticky-note-add',
  'egen-icon-switcher',
  'egen-icon-syringe',
  'egen-icon-table-of-contents',
  'egen-icon-table',
  'egen-icon-time',
  'egen-icon-tools',
  'egen-icon-translate',
  'egen-icon-trash-can',
  'egen-icon-tree-view--alt',
  'egen-icon-user-avatar',
  'egen-icon-user-follow',
  'egen-icon-user-xray',
  'egen-icon-user',
  'egen-icon-view-off',
  'egen-icon-view',
  'egen-icon-warning',
] as const;

export type IconId = (typeof iconIds)[number];

export type IconProps = {
  className?: Argument;
  fill?: string;
  size?: number;
};

/**
 */
export const ActivityIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ActivityIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-activity" iconProps={props} />;
  }),
);

/**
 */
export const AddIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function AddIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-add" iconProps={props} />;
  }),
);

/**
 */
export const ArrowDownIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ArrowDownIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-arrow-down" iconProps={props} />;
  }),
);

/**
 */
export const ArrowLeftIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ArrowLeftIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-arrow-left" iconProps={props} />;
  }),
);

/**
 */
export const ArrowRightIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ArrowRightIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-arrow-right" iconProps={props} />;
  }),
);

/**
 */
export const ArrowUpIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ArrowUpIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-arrow-up" iconProps={props} />;
  }),
);

/**
 */
export const BabyIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function BabyIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-baby" iconProps={props} />;
  }),
);

/**
 */
export const CalendarHeatMapIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CalendarHeatMap(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-calendar-heat-map" iconProps={props} />;
  }),
);

/**
 */
export const CalendarIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function Calendar(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-calendar" iconProps={props} />;
  }),
);

/**
 */
export const CaretDownIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CaretDownIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-caret-down" iconProps={props} />;
  }),
);

/**
 */
export const CaretLeftIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CaretLeftIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-caret-left" iconProps={props} />;
  }),
);

/**
 */
export const CaretRightIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CaretRightIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-caret-right" iconProps={props} />;
  }),
);

/**
 */
export const CaretUpIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CaretUpIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-caret-up" iconProps={props} />;
  }),
);

/**
 */
export const ChartAverageIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChartAverageIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chart-average" iconProps={props} />;
  }),
);

/**
 */
export const ChartLineIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChartLineIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chart-line" iconProps={props} />;
  }),
);

/**
 */
export const CheckmarkFilledIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CheckmarkFilledIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-checkmark-filled" iconProps={props} />;
  }),
);

/**
 */
export const CheckmarkOutlineIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CheckmarkOutlineIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-checkmark-outline" iconProps={props} />;
  }),
);

/**
 */
export const ChemistryIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChemistryIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chemistry" iconProps={props} />;
  }),
);

/**
 */
export const ChevronDownIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChevronDownIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chevron-down" iconProps={props} />;
  }),
);

/**
 */
export const ChevronLeftIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChevronLeftIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chevron-left" iconProps={props} />;
  }),
);

/**
 */
export const ChevronRightIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChevronRightIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chevron-right" iconProps={props} />;
  }),
);

/**
 */
export const ChevronUpIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ChevronUpIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-chevron-up" iconProps={props} />;
  }),
);

/**
 */
export const CloseIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CloseIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-close" iconProps={props} />;
  }),
);

/**
 */
export const CloseFilledIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CloseFilledIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-close-filled" iconProps={props} />;
  }),
);

/**
 */
export const CloseOutlineIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function CloseOutlineIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-close-outline" iconProps={props} />;
  }),
);

/**
 */
export const DocumentIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function DocumentIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-document" iconProps={props} />;
  }),
);

/**
 */
export const DocumentAttachmentIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function DocumentAttachmentIcon(props: IconProps, ref) {
    return <Icon ref={ref} icon="egen-icon-document-attachment" iconProps={props} />;
  }),
);

/**
 */
export const DownloadIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function DownloadIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-download" iconProps={props} />;
  }),
);

/**
 */
export const DrugOrderIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function DrugOrderIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-drug-order" iconProps={props} />;
  }),
);

/**
 */
export const EditIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function EditIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-edit" iconProps={props} />;
  }),
);

/**
 */
export const EventScheduleIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function EventScheduleIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-event-schedule" iconProps={props} />;
  }),
);

/**
 */
export const EventsIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function EventsIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-events" iconProps={props} />;
  }),
);

/**
 */
export const GenderFemaleIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GenderFemaleIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-gender-female" iconProps={props} />;
  }),
);
/**
 */
export const GenderMaleIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GenderMaleIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-gender-male" iconProps={props} />;
  }),
);
/**
 */
export const GenderOtherIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GenderOtherIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-gender-other" iconProps={props} />;
  }),
);
/**
 */
export const GenderUnknownIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GenderUnknownIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-gender-unknown" iconProps={props} />;
  }),
);

/**
 */
export const GenericOrderTypeIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GenericOrderTypeIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-generic-order-type" iconProps={props} />;
  }),
);

/**
 */
export const GroupIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GroupIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-group" iconProps={props} />;
  }),
);

/**
 */
export const GroupAccessIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function GroupAccessIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-group-access" iconProps={props} />;
  }),
);

/**
 */
export const HospitalBedIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function HospitalBedIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-hospital-bed" iconProps={props} />;
  }),
);

/**
 */
export const ImageMedicalIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ImageMedicalIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-image-medical" iconProps={props} />;
  }),
);

/**
 */
export const InformationIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function InformationIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-information" iconProps={props} />;
  }),
);

/**
 */
export const InformationFilledIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function InformationFilledIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-information-filled" iconProps={props} />;
  }),
);

/**
 */
export const InformationSquareIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function InformationSquareIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-information-square" iconProps={props} />;
  }),
);

/**
 */
export const InventoryManagementIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function InventoryManagementIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-inventory-management" iconProps={props} />;
  }),
);

/**
 */
export const LabOrderIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function LabOrderIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-lab-order" iconProps={props} />;
  }),
);

/**
 */
export const ListCheckedIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ListCheckedIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-list-checked" iconProps={props} />;
  }),
);

/**
 */
export const LocationIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function LocationIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-location" iconProps={props} />;
  }),
);

/**
 */
export const MaterialOrderIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MaterialOrderIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-material-order" iconProps={props} />;
  }),
);

/**
 */
export const MaximizeIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MaximizeIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-maximize" iconProps={props} />;
  }),
);

/**
 */
export const MedicationIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MedicationIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-medication" iconProps={props} />;
  }),
);

/**
 */
export const MessageQueueIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MessageQueueIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-message-queue" iconProps={props} />;
  }),
);

/**
 */
export const MicroscopeIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MicroscopeIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-microscope" iconProps={props} />;
  }),
);

/**
 * Billing
 */
export const MoneyIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MoneyIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-money" iconProps={props} />;
  }),
);

/**
 */
export const MotherIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MotherIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-mother" iconProps={props} />;
  }),
);

/**
 */
export const MovementIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function MovementIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-movement" iconProps={props} />;
  }),
);

/**
 */
export const OverflowMenuHorizontalIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function OverflowMenuHorizontalIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-overflow-menu--horizontal" iconProps={props} />;
  }),
);

/**
 */
export const OverflowMenuVerticalIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function OverflowMenuVerticalIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-overflow-menu--horizontal" iconProps={props} />;
  }),
);

export const PasswordIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function PasswordIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-password" iconProps={props} />;
  }),
);

/**
 */
export const PedestrianFamilyIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function PedestrianFamilyIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-pedestrian-family" iconProps={props} />;
  }),
);

/**
 */
export const PenIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function PenIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-pen" iconProps={props} />;
  }),
);

/**
 */
export const PrinterIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function PrinterIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-printer" iconProps={props} />;
  }),
);

/**
 */
export const ProcedureOrderIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ProcedureOrderIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-procedure-order" iconProps={props} />;
  }),
);

/**
 */
export const ProgramsIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ProgramsIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-programs" iconProps={props} />;
  }),
);

/**
 */
export const ReferralOrderIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ReferralOrderIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-referral-order" iconProps={props} />;
  }),
);

/**
 */
export const RenewIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function RenewIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-renew" iconProps={props} />;
  }),
);

/**
 */
export const ReportIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ReportIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-report" iconProps={props} />;
  }),
);

/**
 */
export const ResetIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ResetIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-reset" iconProps={props} />;
  }),
);

/**
 */
export const SaveIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function SaveIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-save" iconProps={props} />;
  }),
);

/**
 */
export const SearchIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function SearchIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-search" iconProps={props} />;
  }),
);

/**
 */
export const SettingsIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function SaveIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-settings" iconProps={props} />;
  }),
);

/**
 */
export const SwitcherIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function SwitcherIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-switcher" iconProps={props} />;
  }),
);

/**
 * Order Basket, the UI to enter Orders for Medications, Referrals, Labs, Procedures and more
 */
export const ShoppingCartIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ShoppingCartIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-shopping-cart" iconProps={props} />;
  }),
);

/**
 * Used as a button to add an item to the Order basket from a search
 */
export const ShoppingCartArrowDownIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ShoppingCartArrowDownIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-shopping-cart--arrow-down" iconProps={props} />;
  }),
);

/**
 * Used as action button to open ward in-patient note workspace
 */
export const StickyNoteAddIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function StickyNoteAddIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-sticky-note-add" iconProps={props} />;
  }),
);

/**
 */
export const SyringeIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function SyringeIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-syringe" iconProps={props} />;
  }),
);

/**
 * Used as a button to add an item to the Order basket from a search
 */
export const TableOfContentsIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TableOfContentsIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-table-of-contents" iconProps={props} />;
  }),
);

/**
 */
export const TableIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TableIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-table" iconProps={props} />;
  }),
);

/**
 * Lab investigations
 */
export const TimeIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TimeIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-time" iconProps={props} />;
  }),
);

/**
 */
export const ToolsIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ToolsIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-tools" iconProps={props} />;
  }),
);

/**
 */
export const TranslateIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TranslateIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-translate" iconProps={props} />;
  }),
);

/**
 */
export const TrashCanIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TrashCanIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-trash-can" iconProps={props} />;
  }),
);

/**
 */
export const TreeViewAltIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function TreeViewAltIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-tree-view--alt" iconProps={props} />;
  }),
);

/**
 * User of Egen e.g. My Account
 */
export const UserAvatarIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function UserAvatarIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-user-avatar" iconProps={props} />;
  }),
);

/**
 */
export const UserFollowIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function UserFollowIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-user-follow" iconProps={props} />;
  }),
);

/**
 * UserXray Icon
 *
 * `UserXrayIcon` is also used for imaging orders
 */
export const UserXrayIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function UserXrayIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-user-xray" iconProps={props} />;
  }),
);

/**
 */
export const UserIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function UserIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-user" iconProps={props} />;
  }),
);

/**
 */
export const ViewOffIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ViewOffIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-view-off" iconProps={props} />;
  }),
);

/**
 */
export const ViewIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function ViewIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-view" iconProps={props} />;
  }),
);

/**
 */
export const WarningIcon = memo(
  forwardRef<SVGSVGElement, IconProps>(function WarningIcon(props, ref) {
    return <Icon ref={ref} icon="egen-icon-warning" iconProps={props} />;
  }),
);

// Icon aliases that are a little more aligned to specific use-cases
// should all resolve to a defined React icon

/**
 */
export const AllergiesIcon = WarningIcon;

/**
 *
 */
export const AttachmentIcon = DocumentAttachmentIcon;

/**
 * Conditions
 *
 * Note this is an alias for ListCheckedIcon
 */
export const ConditionsIcon = ListCheckedIcon;

/**
 *
 */
export const RadiologyIcon = ImageMedicalIcon;

/**
 * Used as a button to add an item to the Order basket from a search
 *
 * Note this is an alias for ShoppingCartArrowDownIcon
 */
export const ShoppingCartAddItemIcon = ShoppingCartArrowDownIcon;

/**
 * This is a utility component that takes an `icon` and renders it if the sprite for the icon
 * is available. The goal is to make it easier to conditionally render configuration-specified icons.
 *
 * @example
 * ```tsx
 *   <MaybeIcon icon='egen-icon-baby' className={styles.myIconStyles} />
 * ```
 */
export const MaybeIcon = memo(
  forwardRef<SVGSVGElement, { icon: string | undefined; fallback?: React.ReactNode } & IconProps>(function MaybeIcon(
    { icon, fallback, ...iconProps },
    ref,
  ) {
    const iconRef = useRef(icon ? document.getElementById(icon) : undefined);

    useEffect(() => {
      const container = document.getElementById('egen-svgs-container');
      const callback: MutationCallback = (mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            iconRef.current = icon ? document.getElementById(icon) : undefined;
          }
        }
      };

      const observer = new MutationObserver(callback);
      if (container) {
        observer.observe(container, { childList: true });
      }

      return () => observer.disconnect();
    }, [icon]);

    return (
      <RenderIfValueIsTruthy value={iconRef.current} fallback={fallback}>
        <Icon ref={ref} icon={icon as IconId} iconProps={iconProps} />
      </RenderIfValueIsTruthy>
    );
  }),
);

export type SvgIconProps = {
  icon: IconId;
  iconProps: IconProps;
};

/**
 * This is a utility type for custom icons that use the svg-sprite-loader to bundle custom icons
 */
export const Icon = memo(
  forwardRef<SVGSVGElement, SvgIconProps>(function Icon({ icon, iconProps }, ref) {
    let { className, fill, size } = Object.assign({}, { fill: 'currentColor', size: 20 }, iconProps);
    if (size <= 0 || size > 72) {
      console.error(`Invalid size '${size}' specified for ${icon}. Defaulting to 20.`);
      size = 20;
    }
    const iconRef = useRef<SVGSVGElement>(null);

    useImperativeHandle(ref, () => iconRef.current!);

    useEffect(() => {
      if (iconRef.current) {
        if (fill !== 'currentColor') {
          iconRef.current.style.setProperty('--egen-icon-fill', fill);
        }
      }
    }, []);

    return (
      <svg
        ref={iconRef}
        className={classNames('egen-icon', style.icon, className)}
        height={size}
        width={size}
        viewBox="0 0 16 16"
      >
        <use href={`#${icon}`} />
      </svg>
    );
  }),
);
