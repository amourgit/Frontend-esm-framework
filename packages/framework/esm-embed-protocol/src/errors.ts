import type { ErrorCode } from './constants.js';
import { ERROR_CODES } from './constants.js';

/** Erreur typée du protocole ; `code` est transmis tel quel au pair. */
export class EmbedError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'EmbedError';
    this.code = code;
  }
}

export interface WireError {
  code: ErrorCode;
  message: string;
}

/** Convertit une erreur quelconque en erreur de fil : seuls les `EmbedError` gardent leur message (rien d'interne ne fuit). */
export function toWireError(err: unknown): WireError {
  if (err instanceof EmbedError) return { code: err.code, message: err.message.slice(0, 500) };
  return { code: 'INTERNAL', message: 'Erreur interne' };
}

export function fromWireError(e: unknown): EmbedError {
  const w = e as Partial<WireError> | null;
  const code = w && typeof w.code === 'string' && (ERROR_CODES as readonly string[]).includes(w.code) ? (w.code as ErrorCode) : 'INTERNAL';
  return new EmbedError(code, typeof w?.message === 'string' ? w.message : undefined);
}
