import React, { useRef } from 'react';
import { GARMENT_CATALOG } from '../services/garmentCatalog';
import { Button } from './ui';
import { useTranslation } from '../i18n';
import { UploadCloud, Shirt, Trash2 } from 'lucide-react';

interface Props {
  currentGarmentId: string | null;
  disabled: boolean;
  onSelect: (url: string, name: string, id: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export const GarmentPanel: React.FC<Props> = ({
  currentGarmentId,
  disabled,
  onSelect,
  onUpload,
  onRemove,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="aura-panel p-5 flex flex-col gap-5 shadow-2xl relative">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4 text-indigo-400" />
          <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-slate-200">
            {t('garment_panel.title')}
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {GARMENT_CATALOG.length} PRESETS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GARMENT_CATALOG.map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={disabled}
            aria-pressed={currentGarmentId === entry.id}
            aria-label={t('a11y.try_on_product', { name: entry.name })}
            onClick={() => onSelect(entry.url, entry.name, entry.id)}
            className={`group relative overflow-hidden rounded-xl border p-2 text-left transition duration-200 outline-none ${
              currentGarmentId === entry.id
                ? 'border-indigo-500 bg-indigo-600/20 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                : 'border-white/[0.08] bg-[#07080d]/60 hover:border-indigo-400/50 hover:bg-white/[0.04]'
            } disabled:opacity-40`}
          >
            <div
              className={`mb-2 flex h-20 items-center justify-center rounded-lg bg-gradient-to-br ${entry.swatch} p-2 transition-transform duration-200 group-hover:scale-105`}
            >
              <img
                src={entry.url}
                alt={entry.name}
                className="max-h-16 max-w-full object-contain drop-shadow-md"
                loading="lazy"
              />
            </div>
            <span className="block truncate font-display font-medium text-xs text-white">
              {entry.name}
            </span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase">
              {entry.category}
            </span>
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-white/[0.08]">
        <input
          ref={fileInputRef}
          id="garment-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-describedby="garment-upload-description"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
        <label htmlFor="garment-file-input" className="sr-only">
          {t('a11y.upload_label')}
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title={t('garment_panel.upload_title')}
          aria-label={t('a11y.upload_label')}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-400/60 py-3 px-4 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-40"
        >
          <UploadCloud className="h-4 w-4 text-indigo-400" />
          <span>{t('garment_panel.upload')}</span>
        </button>
        <p id="garment-upload-description" className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {t('garment_panel.upload_body')}
        </p>
      </div>

      {currentGarmentId && (
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">{t('garment_panel.garment_active')}</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('garment_panel.remove')}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/40 transition"
          >
            <Trash2 className="h-3 w-3" />
            <span>{t('garment_panel.remove')}</span>
          </button>
        </div>
      )}
    </section>
  );
};
