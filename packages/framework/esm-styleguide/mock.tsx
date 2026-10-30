import React from 'react';
import { vi } from 'vitest';
import { type Classification } from '@egen-civitas/esm-data-api';

/* Please keep these stubs in alphabetical order for readability */

// Icon stubs
export const ActivityIcon = () => <span>ActivityIcon</span>;
export const AddIcon = () => <span>AddIcon</span>;
export const ArrowDownIcon = () => <span>ArrowDownIcon</span>;
export const ArrowLeftIcon = () => <span>ArrowLeftIcon</span>;
export const ArrowRightIcon = () => <span>ArrowRightIcon</span>;
export const ArrowUpIcon = () => <span>ArrowUpIcon</span>;
export const CalendarHeatMapIcon = () => <span>CalendarHeatMapIcon</span>;
export const CalendarIcon = () => <span>CalendarIcon</span>;
export const CaretDownIcon = () => <span>CaretDownIcon</span>;
export const CaretLeftIcon = () => <span>CaretLeftIcon</span>;
export const CaretRightIcon = () => <span>CaretRightIcon</span>;
export const CaretUpIcon = () => <span>CaretUpIcon</span>;
export const ChartAverageIcon = () => <span>ChartAverageIcon</span>;
export const ChartLineIcon = () => <span>ChartLineIcon</span>;
export const CheckmarkFilledIcon = () => <span>CheckmarkFilledIcon</span>;
export const CheckmarkOutlineIcon = () => <span>CheckmarkOutlineIcon</span>;
export const ChevronDownIcon = () => <span>ChevronDownIcon</span>;
export const ChevronLeftIcon = () => <span>ChevronLeftIcon</span>;
export const ChevronRightIcon = () => <span>ChevronRightIcon</span>;
export const ChevronUpIcon = () => <span>ChevronUpIcon</span>;
export const CloseIcon = () => <span>CloseIcon</span>;
export const CloseFilledIcon = () => <span>CloseFilledIcon</span>;
export const CloseOutlineIcon = () => <span>CloseOutlineIcon</span>;
export const DocumentIcon = () => <span>DocumentIcon</span>;
export const DocumentAttachmentIcon = () => <span>DocumentAttachmentIcon</span>;
export const DownloadIcon = () => <span>DownloadIcon</span>;
export const EditIcon = () => <span>EditIcon</span>;
export const EventScheduleIcon = () => <span>EventScheduleIcon</span>;
export const EventsIcon = () => <span>EventsIcon</span>;
export const GenderFemaleIcon = () => <span>GenderFemaleIcon</span>;
export const GenderMaleIcon = () => <span>GenderMaleIcon</span>;
export const GenderOtherIcon = () => <span>GenderOtherIcon</span>;
export const GenderUnknownIcon = () => <span>GenderUnknownIcon</span>;
export const GroupIcon = () => <span>GroupIcon</span>;
export const GroupAccessIcon = () => <span>GroupAccessIcon</span>;
export const Icon = () => <span>Icon</span>;
export const InformationFilledIcon = () => <span>InformationFilledIcon</span>;
export const InformationIcon = () => <span>InformationIcon</span>;
export const InformationSquareIcon = () => <span>InformationSquareIcon</span>;
export const InventoryManagementIcon = () => <span>InventoryManagementIcon</span>;
export const ListCheckedIcon = () => <span>ListCheckedIcon</span>;
export const LocationIcon = () => <span>LocationIcon</span>;
export const MaximizeIcon = () => <span>MaximizeIcon</span>;
export const MessageQueueIcon = () => <span>MessageQueueIcon</span>;
export const MoneyIcon = () => <span>MoneyIcon</span>;
export const MovementIcon = () => <span>MovementIcon</span>;
export const OverflowMenuHorizontalIcon = () => <span>OverflowMenuHorizontalIcon</span>;
export const OverflowMenuVerticalIcon = () => <span>OverflowMenuVerticalIcon</span>;
export const PasswordIcon = () => <span>PasswordIcon</span>;
export const PedestrianFamilyIcon = () => <span>PedestrianFamilyIcon</span>;
export const PenIcon = () => <span>PenIcon</span>;
export const PrinterIcon = () => <span>PrinterIcon</span>;
export const ProgramsIcon = () => <span>ProgramsIcon</span>;
export const RadiologyIcon = () => <span>RadiologyIcon</span>;
export const RenewIcon = () => <span>RenewIcon</span>;
export const ReportIcon = () => <span>ReportIcon</span>;
export const ResetIcon = () => <span>ResetIcon</span>;
export const SaveIcon = () => <span>SaveIcon</span>;
export const SearchIcon = () => <span>SearchIcon</span>;

// Section skeleton stubs (header / body / footer rendered flat; no styling)
export const SectionAction = ({
  children,
  label,
  active,
  disabled,
  href,
  onClick,
}: {
  children?: React.ReactNode;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}) =>
  href ? (
    <a href={href}>{children}</a>
  ) : (
    <button
      type="button"
      aria-label={children ? undefined : label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
export const SectionBody = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
export const SectionDivider = () => <hr />;
export const SectionFooter = ({ children, actions }: { children?: React.ReactNode; actions?: React.ReactNode }) => (
  <div>
    {children}
    {actions}
  </div>
);
export const SectionGrid = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
export const SectionHeader = ({
  title,
  actions,
  children,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div>
    {children ?? (title ? <h2>{title}</h2> : null)}
    {actions}
  </div>
);
export const Section = Object.assign(
  ({
    title,
    description,
    actions,
    header,
    footer,
    footerActions,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    footerActions?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      {header ?? (title ? <h2>{title}</h2> : null)}
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
      {footer || footerActions ? (
        <div>
          {footer}
          {footerActions}
        </div>
      ) : null}
    </section>
  ),
  {
    Header: SectionHeader,
    Body: SectionBody,
    Footer: SectionFooter,
    Divider: SectionDivider,
    Action: SectionAction,
    Grid: SectionGrid,
  },
);
export const ShoppingCartAddItemIcon = () => <span>ShoppingCartAddItemIcon</span>;
export const ShoppingCartArrowDownIcon = () => <span>ShoppingCartArrowDownIcon</span>;
export const ShoppingCartIcon = () => <span>ShoppingCartIcon</span>;
export const StickyNoteAddIcon = () => <span>StickyNoteAddIcon</span>;
export const SwitcherIcon = () => <span>SwitcherIcon</span>;
export const TableIcon = () => <span>TableIcon</span>;
export const TableOfContentsIcon = () => <span>TableOfContentsIcon</span>;
export const TimeIcon = () => <span>TimeIcon</span>;
export const ToolsIcon = () => <span>ToolsIcon</span>;
export const TranslateIcon = () => <span>TranslateIcon</span>;
export const ToolWindowHeader = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const TrashCanIcon = () => <span>TrashCanIcon</span>;
export const TreeViewAltIcon = () => <span>TreeViewAltIcon</span>;
export const UserAvatarIcon = () => <span>UserAvatarIcon</span>;
export const UserFollowIcon = () => <span>UserFollowIcon</span>;
export const UserIcon = () => <span>UserIcon</span>;
export const ViewIcon = () => <span>ViewIcon</span>;
export const ViewOffIcon = () => <span>ViewOffIcon</span>;
export const WarningIcon = () => <span>WarningIcon</span>;

// Pictogram stubs
export const AppointmentsPictogram = () => <span>AppointmentsPictogram</span>;
export const AppointmentsAltPictogram = () => <span>AppointmentsAltPictogram</span>;
export const Assessment1Pictogram = () => <span>Assessment1Pictogram</span>;
export const Assessment2Pictogram = () => <span>Assessment2Pictogram</span>;
export const FacilityPictogram = () => <span>FacilityPictogram</span>;
export const HomePictogram = () => <span>HomePictogram</span>;
export const PaymentsDeskPictogram = () => <span>PaymentsDeskPictogram</span>;
export const RegistrationPictogram = () => <span>RegistrationPictogram</span>;
export const ServiceQueuesPictogram = () => <span>ServiceQueuesPictogram</span>;
export const StockManagementPictogram = () => <span>StockManagementPictogram</span>;
export const TransferPictogram = () => <span>TransferPictogram</span>;

// Misc stubs
export const MaybeIcon = ({ icon }) => <span>{icon}</span>;
export const MaybePictogram = ({ pictogram }) => <span>{pictogram}</span>;

// EmptyCardIllustration needs mocking because it uses SVG symbols registered by setupEmptyCard()
export const EmptyCardIllustration = ({ width = '64', height = '64' }: { width?: string; height?: string }) => (
  <svg width={width} height={height} data-testid="empty-card-illustration">
    <rect width={width} height={height} />
  </svg>
);

// EmptyCard needs mocking because it uses EmptyCardIllustration internally
export const EmptyCard = ({
  displayText,
  headerTitle,
  launchForm,
}: {
  displayText: string;
  headerTitle: string;
  launchForm?(): void;
}) => (
  <div data-testid="empty-card">
    <h4>{headerTitle}</h4>
    <EmptyCardIllustration />
    <p>There are no {displayText} to display</p>
    {launchForm && <button onClick={launchForm}>Record {displayText}</button>}
  </div>
);

export { CardHeader, ErrorCard, Pagination, PageHeader, PageHeaderContent } from '@egen-civitas/esm-styleguide';

export const EgenDatePicker = () => <span>EgenDatePicker</span>;
export const EgenDateRangePicker = () => <span>EgenDateRangePicker</span>;

export const LocationPicker = vi.fn(({ onChange, selectedLocationUuid }) => {
  const locations = [
    {
      uuid: 'uuid_1',
      name: 'location_1',
    },
    {
      uuid: 'uuid_2',
      name: 'location_2',
    },
  ];
  return (
    <div>
      {locations.map((location) => (
        <label key={location.uuid}>
          <input
            type="radio"
            name="location"
            value={location.uuid}
            checked={location.uuid === selectedLocationUuid}
            onChange={() => onChange(location.uuid)}
          />
          {location.name}
        </label>
      ))}
    </div>
  );
});

export const ClassificationTags = vi.fn(({ classifications }: { classifications: Array<Classification> }) => (
  <>
    {classifications.map((d) => (
      <span key={d.uuid}>{d.display}</span>
    ))}
  </>
));

export const Workspace2 = vi.fn(({ title, children }) => (
  <div>
    <h1>{title}</h1>
    {children}
  </div>
));


export const TableBatchActions = vi.fn(({ children }) => <>{children}</>);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export const showModal = vi.fn<typeof import('@egen-civitas/esm-styleguide').showModal>();
