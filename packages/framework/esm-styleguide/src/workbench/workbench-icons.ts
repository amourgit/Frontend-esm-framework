import {
  BookOpen,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CircleHelp,
  Folder,
  FolderTree,
  House,
  Info,
  LayoutGrid,
  ListTree,
  MapPin,
  Megaphone,
  Newspaper,
  Search,
  Settings,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icônes autorisées pour `ToolWindowMeta.icon` (liste blanche : une app ne peut pas faire
 * charger au shell une icône arbitraire). Un nom inconnu affiche l'initiale du titre.
 */
export const WORKBENCH_ICONS: Readonly<Record<string, LucideIcon>> = {
  BookOpen,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CircleHelp,
  Folder,
  FolderTree,
  House,
  Info,
  LayoutGrid,
  ListTree,
  MapPin,
  Megaphone,
  Newspaper,
  Search,
  Settings,
  Terminal,
  Users,
};

export function resolveWorkbenchIcon(name?: string): LucideIcon | undefined {
  return name ? WORKBENCH_ICONS[name] : undefined;
}
