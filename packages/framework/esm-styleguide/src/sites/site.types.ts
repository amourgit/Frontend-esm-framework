/** @category Sites */
import type React from 'react';

/** Résumé d'un site / direction, tel qu'affiché dans le carrousel de sélection. */
export interface SiteSummary {
  uuid: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  head: string;
  memberCount: number;
  appCount: number;
  status: string;
  /** Visuel optionnel de la carte du carrousel. */
  imageUrl?: string;
}

/** Onglet de la vue détaillée d'un site. */
export interface SiteTabOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

/** Application / outil rattaché à un site. */
export interface SiteApplication {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  /** Composant d'icône (ex. une icône `lucide-react`). */
  icon: React.ComponentType<{ className?: string }>;
  /** Classes de dégradé Tailwind, ex. `from-teal-500 to-emerald-600`. */
  gradient?: string;
  /** Cible de navigation : interprétée par l'app consommatrice. */
  link: string;
}

export interface SiteResource {
  id: string;
  title: string;
  type: string;
  size: string;
  updated: string;
  category: string;
}

export type SiteTaskPriority = 'haute' | 'moyenne' | 'basse';
export type SiteTaskStatus = 'todo' | 'in_progress' | 'done';

export interface SiteTask {
  id: string;
  title: string;
  description: string;
  priority: SiteTaskPriority;
  status: SiteTaskStatus;
  dueDate: string;
  assignedBy: string;
  assignedTo: string;
  tags: string[];
}

export type SiteActivityAction = 'upload' | 'edit' | 'validate' | 'member_join' | 'security';

export interface SiteActivity {
  id: string;
  userName: string;
  userAvatar?: string;
  userRole: string;
  action: SiteActivityAction;
  actionLabel: string;
  targetTitle: string;
  targetType: string;
  timeAgo: string;
}

export type SiteVisibility = 'PUBLIC' | 'MODERATED' | 'PRIVATE';

export interface SiteSettingsValue {
  title: string;
  description: string;
  visibility: SiteVisibility;
  allowMemberInvites: boolean;
  notifyOnUpload: boolean;
  notifyOnValidation: boolean;
}

export interface SiteMember {
  id: string;
  name: string;
  role: string;
  teamId?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface SiteTeam {
  id: string;
  name: string;
}
