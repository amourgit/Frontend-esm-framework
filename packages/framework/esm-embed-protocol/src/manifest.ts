import { CAPABILITIES, CAPABILITY_IDS, getCapability } from './capabilities.js';
import { FORBIDDEN_SESSION_FIELDS } from './constants.js';
import { isPlainObject } from './guards.js';
import { patternCovers } from './patterns.js';
import type { CapabilityId, EmbedManifest, EmbedTechnology, GrantConfig, NavigationMode } from './types.js';

const NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const ROUTE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const TECHS: EmbedTechnology[] = ['nextjs', 'react', 'vue', 'angular', 'static', 'other'];
const MODES: NavigationMode[] = ['none', 'history', 'hash'];

export interface ManifestOptions {
  /** Autorise `http://localhost` / `http://127.0.0.1` (développement uniquement). */
  allowInsecureLocalhost?: boolean;
}

export type ManifestResult = { ok: true; manifest: EmbedManifest } | { ok: false; errors: string[] };

function validUrl(u: unknown, opts: ManifestOptions): boolean {
  if (typeof u !== 'string' || u.length > 2000) return false;
  try {
    const url = new URL(u);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return !!opts.allowInsecureLocalhost && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

/** Valide un manifeste `egen-app.json` (doc 17 §7). */
export function validateManifest(input: unknown, opts: ManifestOptions = {}): ManifestResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ['le manifeste doit être un objet'] };
  const m = input;
  if (m.manifestVersion !== 1) errors.push('manifestVersion : 1 attendu');
  if (typeof m.name !== 'string' || !NAME_RE.test(m.name) || m.name.length > 214) errors.push('name : nom de paquet valide attendu');
  if (typeof m.version !== 'string' || !VERSION_RE.test(m.version)) errors.push('version : semver attendu');
  if (typeof m.title !== 'string' || !m.title.trim() || m.title.length > 100) errors.push('title : texte non vide ≤ 100 attendu');
  if (!validUrl(m.url, opts)) errors.push('url : https attendue (sans identifiants)');
  if (typeof m.route !== 'string' || !ROUTE_RE.test(m.route)) errors.push('route : minuscules, chiffres et tirets (≤ 64)');
  if (!TECHS.includes(m.technology as EmbedTechnology)) errors.push(`technology : ${TECHS.join(' | ')}`);

  const nav = m.navigation;
  if (!isPlainObject(nav) || !MODES.includes(nav.mode as NavigationMode)) errors.push(`navigation.mode : ${MODES.join(' | ')}`);
  else {
    if (nav.basePath !== undefined && !(typeof nav.basePath === 'string' && nav.basePath.startsWith('/') && !nav.basePath.startsWith('//'))) errors.push('navigation.basePath : chemin commençant par « / »');
    if (nav.sensitiveParams !== undefined && !(Array.isArray(nav.sensitiveParams) && nav.sensitiveParams.every((s) => typeof s === 'string' && s.length <= 64))) errors.push('navigation.sensitiveParams : tableau de textes');
  }

  if (m.placement !== undefined) {
    const p = m.placement;
    if (!isPlainObject(p) || (p.rail !== undefined && !['left', 'right', 'bottom'].includes(p.rail as string))) errors.push('placement.rail : left | right | bottom');
  }

  const caps = m.capabilities;
  if (!isPlainObject(caps)) errors.push('capabilities : objet attendu');
  else
    for (const [id, cfg] of Object.entries(caps)) {
      if (!getCapability(id)) errors.push(`capabilities.${id} : capacité inconnue`);
      else if (!isPlainObject(cfg)) errors.push(`capabilities.${id} : objet attendu`);
    }

  return errors.length ? { ok: false, errors } : { ok: true, manifest: input as unknown as EmbedManifest };
}

/* ───────── Grants effectifs : demandé ∩ approuvé ───────── */

export type ApprovedGrants = Partial<Record<CapabilityId, GrantConfig | false>>;
export type EffectiveGrants = Partial<Record<CapabilityId, GrantConfig>>;

const strings = (v: unknown): string[] | undefined => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined);

function intersect(requested: string[], ceiling: string[], mode: 'exact' | 'pattern'): string[] {
  if (mode === 'exact') return requested.filter((r) => ceiling.includes(r));
  return requested.filter((r) => ceiling.some((c) => patternCovers(c, r)));
}

/**
 * Calcule les grants effectifs.
 * - `approved` (opérateur) est le **plafond**. `false` interdit la capacité.
 * - `requested` (manifeste) est la demande ; absent = l'opérateur définit seul.
 * - Capacité non « par défaut » : exige une approbation ET une demande (si un manifeste existe).
 * - Listes : demande ∩ plafond ; demande absente = plafond ; plafond absent = valeur par défaut du catalogue.
 * - Les champs de session interdits (`sessionId`, jetons…) sont toujours retirés.
 */
export function effectiveGrants(requested: Partial<Record<CapabilityId, GrantConfig>> | undefined, approved: ApprovedGrants): EffectiveGrants {
  const out: EffectiveGrants = {};
  for (const id of CAPABILITY_IDS) {
    const d = CAPABILITIES[id];
    const ceiling = approved[id];
    if (ceiling === false) continue;
    const asked = requested ? requested[id] : undefined;
    if (!d.defaultGrant) {
      if (ceiling === undefined) continue;
      if (requested && asked === undefined) continue;
    }
    const ceilingCfg: GrantConfig = ceiling ?? {};
    const askedCfg: GrantConfig = asked ?? {};
    const cfg: GrantConfig = {};
    for (const [k, v] of Object.entries(ceilingCfg)) if (!(k in d.listKeys)) cfg[k] = v;
    for (const [key, mode] of Object.entries(d.listKeys)) {
      const cl = strings(ceilingCfg[key]) ?? [...(d.listDefaults[key] ?? [])];
      const rq = strings(askedCfg[key]);
      let list = rq ? intersect(rq, cl, mode) : cl;
      if (id === 'session' && key === 'fields') list = list.filter((f) => !FORBIDDEN_SESSION_FIELDS.includes(f.split('.')[0]));
      cfg[key] = list;
    }
    out[id] = cfg;
  }
  return out;
}
