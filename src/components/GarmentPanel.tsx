import React, { useRef } from 'react';
import { GARMENT_CATALOG } from '../services/garmentCatalog';
import { Button } from './ui';
import { useTranslation } from '../i18n';

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
    <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-gray-900/70 p-5 backdrop-blur">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          {t('garment_panel.title')}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GARMENT_CATALOG.map((entry) => (
            <button
              key={entry.id}
              type="button"
              disabled={disabled}
              aria-pressed={currentGarmentId === entry.id}
              aria-label={t('a11y.try_on_product', { name: entry.name })}
              onClick={() => onSelect(entry.url, entry.name, entry.id)}
              className={`group relative overflow-hidden rounded-xl border p-2 text-left transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none ${
                currentGarmentId === entry.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 bg-white/5 hover:border-violet-400/60'
              } disabled:opacity-40`}
            >
              <div
                className={`mb-2 flex h-20 items-center justify-center rounded-lg bg-gradient-to-br ${entry.swatch}`}
              >
                <img
                  src={entry.url}
                  alt={entry.name}
                  className="max-h-16 max-w-full object-contain drop-shadow"
                  loading="lazy"
                />
              </div>
              <span className="block truncate text-xs font-medium text-gray-200">
                {entry.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
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
        <Button
          variant="neutral"
          className="w-full border border-dashed border-white/20"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title={t('garment_panel.upload_title')}
          ariaLabel={t('a11y.upload_label')}
        >
          {t('garment_panel.upload')}
        </Button>
        <p id="garment-upload-description" className="mt-2 text-xs leading-4 text-gray-400">
          {t('garment_panel.upload_body')}
        </p>
      </div>

      {currentGarmentId && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-gray-300">{t('garment_panel.garment_active')}</span>
          <Button variant="ghost" onClick={onRemove} ariaLabel={t('garment_panel.remove')}>
            {t('garment_panel.remove')}
          </Button>
        </div>
      )}
    </section>
  );
};
