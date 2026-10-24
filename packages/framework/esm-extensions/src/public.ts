export {
  getExtensionNameFromId,
  registerExtension,
  attach,
  detach,
  detachAll,
  getAssignedExtensions,
  registerExtensionSlot,
} from './extensions.js';
export { type LeftNavStore, setLeftNav, unsetLeftNav, type SetLeftNavParams } from './left-nav.js';
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
  TOPBAR_LEVEL2_NAV_SLOT,
  NAV_ALL_WORKSPACES,
  type NavEntryMeta,
  isNavEntryMeta,
  isNavEntryInWorkspace,
} from './nav-entry.js';
export {
  SHELL_RAIL_LEFT_SLOT,
  SHELL_RAIL_BOTTOM_SLOT,
  SHELL_RAIL_RIGHT_SLOT,
  TOOL_WINDOW_SLOTS,
  type ToolWindowAnchor,
  type ToolWindowMeta,
  isToolWindowMeta,
} from './tool-window.js';
export {
  type NavBehavior,
  type NavBehaviorTarget,
  type NavSelectContext,
  registerNavBehavior,
  getNavBehavior,
} from './nav-behavior.js';
