import React from 'react';
import { t } from '../i18n';

export const Button: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'neutral';
  className?: string;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
}> = ({ onClick, disabled, variant = 'primary', className = '', children, title, ariaLabel, ariaPressed }) => {
  const base =
    'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 outline-none';
  const styles = {
    primary: 'bg-violet-600 text-white hover:bg-violet-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-gray-300 hover:text-white hover:bg-white/10',
    neutral: 'bg-gray-700 text-gray-100 hover:bg-gray-600',
  } as const;
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed !== undefined ? ariaPressed : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const TrackingPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string }> = {
    idle: { color: 'bg-gray-500', label: t('tracking.idle') },
    searching: { color: 'bg-amber-400 animate-pulse', label: t('tracking.searching') },
    tracking: { color: 'bg-emerald-500', label: t('tracking.tracking') },
    coasting: { color: 'bg-emerald-400 animate-pulse', label: t('tracking.coasting') },
    lost: { color: 'bg-red-500', label: t('tracking.lost') },
  };
  const s = map[status] ?? map.idle;
  return (
    <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${s.color}`} />
      <span className="text-xs font-medium text-white">{s.label}</span>
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-3">
    <p className="text-sm text-red-700">{message}</p>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600"
        aria-label={t('common.dismiss')}
      >
        ✕
      </button>
    )}
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-violet-500" />
    {label && <p className="text-sm text-gray-400">{label}</p>}
  </div>
);
