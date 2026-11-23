import { getCapability } from './capabilities.js';
import { SUPPORTED_PROTOCOLS } from './constants.js';
import type { CapabilityDenied, CapabilityGranted, CapabilityRequest } from './types.js';
import type { EffectiveGrants } from './manifest.js';

/** Protocole retenu : celui du client s'il fait partie de ceux de l'hôte, sinon `null`. */
export function negotiateProtocol(clientProtocol: number, hostProtocols: readonly number[] = SUPPORTED_PROTOCOLS): number | null {
  return hostProtocols.includes(clientProtocol) ? clientProtocol : null;
}

/**
 * Négocie les capacités demandées par le client face aux grants effectifs.
 * Refus : `UNKNOWN` (hors catalogue), `VERSION` (version demandée > version de l'hôte), `NOT_APPROVED` (pas de grant).
 */
export function negotiateCapabilities(requested: CapabilityRequest[], effective: EffectiveGrants): { granted: CapabilityGranted[]; denied: CapabilityDenied[] } {
  const granted: CapabilityGranted[] = [];
  const denied: CapabilityDenied[] = [];
  const seen = new Set<string>();
  for (const r of requested) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const d = getCapability(r.id);
    if (!d) denied.push({ id: r.id, reason: 'UNKNOWN' });
    else if (r.version > d.version) denied.push({ id: r.id, reason: 'VERSION' });
    else if (!Object.prototype.hasOwnProperty.call(effective, d.id)) denied.push({ id: r.id, reason: 'NOT_APPROVED' });
    else granted.push({ id: d.id, version: d.version, config: effective[d.id] as Record<string, unknown> });
  }
  return { granted, denied };
}
