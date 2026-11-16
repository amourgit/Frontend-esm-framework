// Composants de base d'EGEN : Tailwind seul, sans Carbon ni SCSS. Voir `THIRD_PARTY_NOTICES.md` pour les origines.
// `cn` est exporté publiquement par `page-background` (même fonction, ré-exportée depuis `./cn.js`).
export { Button, buttonVariants } from './button.js';
export { IconButton, type IconButtonProps } from './icon-button.js';
export { Link, type LinkProps } from './link.js';
export { Badge, badgeVariants } from './badge.js';
export { Separator } from './separator.js';
export { Label } from './label.js';
export { Input } from './input.js';
export { TextInput, type TextInputProps } from './text-input.js';
export { Switch } from './switch.js';
export { Spinner } from './spinner.js';
export { InlineLoading, type InlineLoadingProps } from './inline-loading.js';
export { Layer } from './layer.js';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip.js';
export { Tile, TileHeader, TileTitle, TileDescription, TileAction, TileContent, TileFooter } from './tile.js';
export { Alert, AlertTitle, AlertDescription } from './alert.js';
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog.js';
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs.js';
export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from './table.js';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select.js';
