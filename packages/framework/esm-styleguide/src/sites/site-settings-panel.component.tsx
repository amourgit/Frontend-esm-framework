/** @category Sites */
import React, { useState } from 'react';
import { CheckCircle2, Globe, HardDrive, Lock, Save, Settings, Shield, Sliders, Users } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import { SitePanelHeader } from './site-panel-header.component.js';
import type { SiteSettingsValue, SiteVisibility } from './site.types.js';

export interface SiteSettingsPanelProps {
  siteName: string;
  siteUuid: string;
  initialValue: SiteSettingsValue;
  /** Quota de stockage (affichage). */
  storage?: { usedLabel: string; quotaLabel: string; percent: number };
  onSave: (value: SiteSettingsValue) => void | Promise<void>;
  className?: string;
}

const VISIBILITY: Array<{ id: SiteVisibility; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'PUBLIC', label: 'Public', hint: "Accessible à tous les collaborateurs de l'organisation.", icon: Globe },
  { id: 'MODERATED', label: 'Modéré', hint: "Adhésion soumise à l'approbation du gestionnaire du site.", icon: Users },
  { id: 'PRIVATE', label: 'Privé', hint: 'Strictement réservé aux membres invités manuellement.', icon: Lock },
];

const sectionCls = 'p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3';
const sectionTitleCls = 'text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2';
const inputCls = 'w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-teal-400';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span>
        <span className="block text-xs font-semibold text-white">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-teal-500 cursor-pointer shrink-0" />
    </label>
  );
}

/** Formulaire de paramètres d'un site (général, visibilité, notifications, quota). */
export function SiteSettingsPanel({ siteName, siteUuid, initialValue, storage, onSave, className }: SiteSettingsPanelProps) {
  const [value, setValue] = useState<SiteSettingsValue>(initialValue);
  const [saved, setSaved] = useState(false);
  const patch = (p: Partial<SiteSettingsValue>) => setValue((v) => ({ ...v, ...p }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col gap-4 text-slate-100 overflow-y-auto pr-1', className)}>
      <SitePanelHeader
        icon={<Settings className="w-4 h-4 text-teal-400" />}
        title={`Paramètres du Site — ${siteName}`}
        description="Administration de l'espace collaboratif, visibilité, quotas et politique de sécurité."
        actions={
          saved && (
            <span role="status" className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Paramètres enregistrés
            </span>
          )
        }
      />

      <form onSubmit={submit} className="space-y-4">
        <section className={sectionCls}>
          <h3 className={sectionTitleCls}>
            <Sliders className="w-3.5 h-3.5" />
            Informations générales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-300">
              <span className="block mb-1">Nom public du site</span>
              <input className={inputCls} value={value.title} onChange={(e) => patch({ title: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              <span className="block mb-1">Identifiant unique (UUID)</span>
              <input readOnly className={cn(inputCls, 'bg-black/60 border-white/10 text-slate-400 font-mono')} value={siteUuid} />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-300">
            <span className="block mb-1">Description & mission du site</span>
            <textarea rows={2} className={cn(inputCls, 'resize-none')} value={value.description} onChange={(e) => patch({ description: e.target.value })} />
          </label>
        </section>

        <section className={sectionCls}>
          <h3 className={sectionTitleCls}>
            <Shield className="w-3.5 h-3.5" />
            Visibilité & accès
          </h3>
          <div role="radiogroup" aria-label="Visibilité" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {VISIBILITY.map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={value.visibility === id}
                onClick={() => patch({ visibility: id })}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer',
                  value.visibility === id ? 'bg-teal-500/15 border-teal-400 text-white shadow-md' : 'bg-black/30 border-white/10 text-slate-400 hover:text-white',
                )}
              >
                <span className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs">{label}</span>
                </span>
                <span className="block text-[11px] text-slate-400">{hint}</span>
              </button>
            ))}
          </div>
          <Toggle
            label="Autoriser les collaborateurs à inviter des tiers"
            hint="Les collaborateurs réguliers peuvent proposer de nouveaux membres."
            checked={value.allowMemberInvites}
            onChange={(v) => patch({ allowMemberInvites: v })}
          />
        </section>

        <section className={sectionCls}>
          <h3 className={sectionTitleCls}>
            <HardDrive className="w-3.5 h-3.5" />
            Stockage & notifications
          </h3>
          {storage && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Espace utilisé : <strong>{storage.usedLabel}</strong></span>
                <span>Quota alloué : <strong>{storage.quotaLabel}</strong></span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, storage.percent))}%` }} />
              </div>
            </div>
          )}
          <div className="pt-2 space-y-2 border-t border-white/10">
            <Toggle label="Notifier lors du téléversement d'un nouveau document" checked={value.notifyOnUpload} onChange={(v) => patch({ notifyOnUpload: v })} />
            <Toggle label="Alerter lors de la validation officielle d'un bordereau" checked={value.notifyOnValidation} onChange={(v) => patch({ notifyOnValidation: v })} />
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer">
            <Save className="w-4 h-4" />
            Enregistrer les paramètres du site
          </button>
        </div>
      </form>
    </div>
  );
}
