export { createBridgeClient } from './client.js';
export type { BridgeClient, BridgeClientOptions, CallOptions, HostInfo } from './client.js';
export {
  DEFAULT_TIMEOUT_MS,
  HOST_PROTOCOL_NAME,
  MAX_MESSAGE_LENGTH,
  SUPPORTED_PROTOCOL,
  isSupportedProtocolVersion,
  parseHostMessage,
} from './protocol.js';
export type { HostBridge, HostEvent, HostFailure, HostMessage, HostRequest, HostSuccess } from './protocol.js';
