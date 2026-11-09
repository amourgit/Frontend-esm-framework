export {
  getExtensionNameFromId,
  registerExtension,
  attach,
  detach,
  detachAll,
  getAssignedExtensions,
  registerExtensionSlot,
} from './extensions.js';
export { type CancelLoading, renderExtension } from './render.js';
export {
  type ExtensionMeta,
  type ExtensionRegistration,
  type ExtensionStore,
  type AssignedExtension,
  type ConnectedExtension,
  type ExtensionSlotState,
  getExtensionStore,
} from './store.js';
export { type WorkspaceRegistration } from './workspaces.js';
export { type ExtensionData, type ComponentConfig } from './types.js';
export {
  TOPBAR_NAV_SLOT,
  NAV_ALL_WORKSPACES,
  type NavEntryMeta,
  isNavEntryMeta,
  isNavEntryInWorkspace,
} from './nav-entry.js';
export {
  TOPBAR_SLOT,
  type TopBarPlacementMeta,
  type TopBarRegion,
  type TopBarContentRegion,
} from './topbar-slot.js';
export {
  SHELL_RAIL_LEFT_SLOT,
  SHELL_RAIL_BOTTOM_SLOT,
  SHELL_RAIL_RIGHT_SLOT,
  TOOL_WINDOW_SLOTS,
  type ToolWindowAnchor,
  type ToolWindowMeta,
  isToolWindowMeta,
  isToolWindowSlot,
  isSafeToolWindowIconUrl,
  getToolWindowMetaProblems,
  getToolWindowCompartment,
  DEFAULT_COMPARTMENT_HEIGHTS,
  type ToolWindowCompartment,
  type ResolvedToolWindowCompartment,
} from './tool-window.js';
export { registerToolWindow, type ToolWindowRegistration } from './tool-window-registration.js';
export {
  STAGGERED_MENU_SLOT,
  STAGGERED_MENU_AREAS,
  DEFAULT_STAGGERED_MENU_AREA,
  type StaggeredMenuArea,
  type StaggeredMenuEntryMeta,
  type StaggeredMenuAssignedExtension,
  type ResolvedStaggeredMenuEntry,
  type ResolveStaggeredMenuEntriesOptions,
  isStaggeredMenuArea,
  isStaggeredMenuEntryMeta,
  getStaggeredMenuEntryProblems,
  resolveStaggeredMenuEntries,
} from './staggered-menu-slot.js';
export { registerStaggeredMenuEntry, type StaggeredMenuEntryRegistration } from './staggered-menu-registration.js';
export {
  type NavBehavior,
  type NavBehaviorTarget,
  type NavSelectContext,
  registerNavBehavior,
  getNavBehavior,
} from './nav-behavior.js';
