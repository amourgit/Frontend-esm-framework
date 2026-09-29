export type AssistantMode = 'conversation' | 'recherche' | 'action' | 'autonome';

export interface AssistantModeConfig {
  id: AssistantMode;
  number: string;
  name: string;
  shortName: string;
  tagline: string;
  badgeLabel: string;
  emoji: string;
  iconName: 'MessageSquare' | 'Search' | 'Zap' | 'Cpu';
  color: {
    text: string;
    bg: string;
    border: string;
    ring: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    accent: string;
  };
  principle: string;
  bullets: string[];
  example: string;
  schema?: string[];
}

export const ASSISTANT_MODES: Record<AssistantMode, AssistantModeConfig> = {
  conversation: {
    id: 'conversation',
    number: '1',
    name: 'Mode Conversation',
    shortName: 'Conversation',
    tagline: 'Comprendre & Répondre',
    badgeLabel: 'Conv',
    emoji: '💬',
    iconName: 'MessageSquare',
    color: {
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      ring: 'ring-sky-500/40',
      badgeBg: 'bg-sky-500',
      badgeText: 'text-slate-950',
      glow: 'shadow-sky-500/25',
      accent: '#38bdf8',
    },
    principle: "L'agent comprend et répond.",
    bullets: [
      'Questions & réponses',
      'Explications & clarifications',
      'Discussion en langage naturel',
      'Conseil informationnel',
    ],
    example: '« Qu\'est-ce que cette fonctionnalité ? »',
  },
  recherche: {
    id: 'recherche',
    number: '2',
    name: 'Mode Recherche / Analyse',
    shortName: 'Recherche',
    tagline: 'Chercher, Récupérer & Interpréter',
    badgeLabel: 'Rech',
    emoji: '🔎',
    iconName: 'Search',
    color: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      ring: 'ring-amber-500/40',
      badgeBg: 'bg-amber-400',
      badgeText: 'text-slate-950',
      glow: 'shadow-amber-500/25',
      accent: '#fbbf24',
    },
    principle: "L'agent cherche, récupère et interprète de l'information.",
    bullets: [
      'Recherche dans la base de connaissances',
      'Consultation & extraction documentaire',
      'Analyse et croisement de données',
      'Comparaison & synthèse structurée',
    ],
    example: '« Trouve les documents concernant ce projet et résume-les. »',
  },
  action: {
    id: 'action',
    number: '3',
    name: 'Mode Action',
    shortName: 'Action',
    tagline: 'Agir sur le Système via Outils',
    badgeLabel: 'Act',
    emoji: '⚙️',
    iconName: 'Zap',
    color: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      ring: 'ring-emerald-500/40',
      badgeBg: 'bg-emerald-400',
      badgeText: 'text-slate-950',
      glow: 'shadow-emerald-500/25',
      accent: '#34d399',
    },
    principle: "L'agent agit sur le système à travers des outils (différence clé avec un simple chatbot).",
    bullets: [
      'Créer, modifier, supprimer des contenus',
      'Publier & programmer des diffusions',
      'Appeler des API & intégrations',
      'Déclencher des workflows & automatisations',
    ],
    example: '« Crée cette actualité et programme sa publication demain. »',
  },
  autonome: {
    id: 'autonome',
    number: '4',
    name: 'Mode Autonome',
    shortName: 'Autonome',
    tagline: 'Orchestration Multi-étapes vers un Objectif',
    badgeLabel: 'Auto',
    emoji: '🤖',
    iconName: 'Cpu',
    color: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      ring: 'ring-purple-500/40',
      badgeBg: 'bg-purple-400',
      badgeText: 'text-slate-950',
      glow: 'shadow-purple-500/25',
      accent: '#c084fc',
    },
    principle: "L'agent reçoit un objectif et détermine lui-même les étapes nécessaires sans guidage pas-à-pas.",
    bullets: [
      'Planification intelligente de l’objectif',
      'Recherche & analyse autonome',
      'Création & exécution des actions requises',
      'Vérification & production du résultat final',
    ],
    example: '« Prépare toute la communication de notre événement. »',
    schema: [
      'Objectif',
      'Planification',
      'Recherche',
      'Analyse',
      'Création',
      'Actions',
      'Vérification',
      'Résultat',
    ],
  },
};

const STORAGE_KEY = 'egen_assistant_mode';

export function getSavedAssistantMode(): AssistantMode {
  if (typeof window === 'undefined') return 'conversation';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AssistantMode;
    if (saved && ASSISTANT_MODES[saved]) return saved;
  } catch {
    // fallback
  }
  return 'conversation';
}

export function saveAssistantMode(mode: AssistantMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // fallback
  }
}
