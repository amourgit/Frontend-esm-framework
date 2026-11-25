import { CAPABILITIES, CAPABILITY_IDS, REMOVED_CAPABILITIES, getCapability } from './capabilities.js';
import { isPlainObject } from './guards.js';
import { patternCovers, slotCovers } from './patterns.js';
import { isInternalPath, isSlotName } from './capabilities.js';
import type { CapabilityId, EmbedExtensionDecl, EmbedManifest, EmbedTechnology, GrantConfig, NavigationMode } from './types.js';

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
      if (Object.prototype.hasOwnProperty.call(REMOVED_CAPABILITIES, id)) errors.push(`capabilities.${id} : capacité absente du SDK — ${REMOVED_CAPABILITIES[id]} (docs/integration-apps/17 §2)`);
      else if (!getCapability(id)) errors.push(`capabilities.${id} : capacité inconnue`);
      else if (!isPlainObject(cfg)) errors.push(`capabilities.${id} : objet attendu`);
    }

  if (m.extensions !== undefined) errors.push(...validateExtensionDecls(m.extensions, typeof m.url === 'string' ? m.url : undefined));

  return errors.length ? { ok: false, errors } : { ok: true, manifest: input as unknown as EmbedManifest };
}

/* ───────── Grants effectifs : demandé ∩ approuvé ───────── */

export type ApprovedGrants = Partial<Record<CapabilityId, GrantConfig | false>>;
export type EffectiveGrants = Partial<Record<CapabilityId, GrantConfig>>;

const strings = (v: unknown): string[] | undefined => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined);

function intersect(requested: string[], ceiling: string[], mode: 'exact' | 'pattern' | 'slot'): string[] {
  if (mode === 'exact') return requested.filter((r) => ceiling.includes(r));
  if (mode === 'slot') return requested.filter((r) => ceiling.some((c) => slotCovers(c, r)));
  return requested.filter((r) => ceiling.some((c) => patternCovers(c, r)));
}

/**
 * Calcule les grants effectifs.
 * - `approved` (opérateur) est le **plafond**. `false` interdit la capacité.
 * - `requested` (manifeste) est la demande ; absent = l'opérateur définit seul.
 * - Capacité non « par défaut » : exige une approbation ET une demande (si un manifeste existe).
 * - Listes : demande ∩ plafond ; demande absente = plafond ; plafond absent = valeur par défaut du catalogue.
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
      const list = rq ? intersect(rq, cl, mode) : cl;
      cfg[key] = list;
    }
    out[id] = cfg;
  }
  return out;
}

const EXT_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Valide les contributions d'extension d'un manifeste (retourne les erreurs ; vide = valide). */
export function validateExtensionDecls(input: unknown, appUrl?: string): string[] {
  if (!Array.isArray(input)) return ['extensions : tableau attendu'];
  if (input.length > 20) return ['extensions : 20 contributions au maximum'];
  const errors: string[] = [];
  const seen = new Set<string>();
  let origin: string | undefined;
  try {
    origin = appUrl ? new URL(appUrl).origin : undefined;
  } catch {
    /* url invalide : déjà signalée */
  }
  input.forEach((e, i) => {
    const at = `extensions[${i}]`;
    if (!isPlainObject(e)) return void errors.push(`${at} : objet attendu`);
    if (typeof e.name !== 'string' || !EXT_NAME_RE.test(e.name)) errors.push(`${at}.name : minuscules, chiffres et tirets (≤ 64)`);
    else if (seen.has(e.name)) errors.push(`${at}.name : « ${e.name} » en double`);
    else seen.add(e.name);
    if (!isSlotName(e.slot)) errors.push(`${at}.slot : nom de slot attendu (minuscules, chiffres, tirets)`);
    if (e.view !== undefined && !isInternalPath(e.view)) errors.push(`${at}.view : chemin interne de l'app attendu`);
    if (e.order !== undefined && !(typeof e.order === 'number' && Number.isFinite(e.order))) errors.push(`${at}.order : nombre attendu`);
    if (e.height !== undefined && !(typeof e.height === 'number' && e.height >= 0 && e.height <= 5000)) errors.push(`${at}.height : 0 à 5000`);
    if (e.privileges !== undefined && !(Array.isArray(e.privileges) && e.privileges.length <= 10 && e.privileges.every((p) => typeof p === 'string' && p.length > 0 && p.length <= 100))) errors.push(`${at}.privileges : tableau (≤ 10) de textes`);
    if (e.featureFlag !== undefined && !(typeof e.featureFlag === 'string' && e.featureFlag.length > 0 && e.featureFlag.length <= 100)) errors.push(`${at}.featureFlag : texte attendu`);
    if (e.meta !== undefined) {
      if (!isPlainObject(e.meta)) errors.push(`${at}.meta : objet attendu`);
      else {
        let size = 0;
        try {
          size = JSON.stringify(e.meta).length;
        } catch {
          size = Infinity;
        }
        if (size > 4096) errors.push(`${at}.meta : 4 Ko au maximum`);
        const icon = e.meta.iconUrl;
        if (icon !== undefined) {
          let ok = false;
          try {
            const u = new URL(String(icon));
            ok = u.protocol === 'https:' && !!origin && u.origin === origin;
          } catch {
            /* invalide */
          }
          if (!ok) errors.push(`${at}.meta.iconUrl : https et même origine que l'app (pas de pistage par image externe)`);
        }
      }
    }
  });
  return errors;
}

/**
 * Contributions dont le slot est approuvé par l'opérateur (`approved.extensions.contribute`). Les autres sont écartées :
 * l'approbation est le seul moyen d'ajouter un composant à un slot du Core.
 */
export function allowedContributions(decls: readonly EmbedExtensionDecl[] | undefined, approved: Partial<Record<CapabilityId, GrantConfig | false>>): EmbedExtensionDecl[] {
  const cfg = approved.extensions;
  if (!cfg) return [];
  const slots = Array.isArray(cfg.contribute) ? (cfg.contribute as string[]) : [];
  return (decls ?? []).filter((d) => slots.some((s) => slotCovers(s, d.slot)));
}
