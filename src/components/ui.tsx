import React from 'react';
import { t } from '../i18n';
import { AlertTriangle, X } from 'lucide-react';

export const Button: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'neutral' | 'accent';
  className?: string;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
}> = ({ onClick, disabled, variant = 'primary', className = '', children, title, ariaLabel, ariaPressed }) => {
  const base =
    'relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold tracking-tight transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] outline-none active:scale-[0.98] select-none';
  const styles = {
    primary:
      'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.5)] hover:brightness-110 border border-white/15',
    accent:
      'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 text-white shadow-[0_4px_20px_rgba(236,72,153,0.35)] hover:shadow-[0_6px_25px_rgba(236,72,153,0.5)] hover:brightness-110 border border-white/15',
    danger:
      'bg-rose-600/90 text-white hover:bg-rose-600 shadow-[0_4px_16px_rgba(225,29,72,0.3)] border border-rose-400/30',
    ghost:
      'bg-transparent text-slate-300 hover:text-white hover:bg-white/[0.08] border border-transparent',
    neutral:
      'bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white border border-white/10 backdrop-blur-md',
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
  const map: Record<string, { dot: string; glow: string; label: string }> = {
    idle: { dot: 'bg-slate-400', glow: 'shadow-slate-400/20', label: t('tracking.idle') },
    searching: { dot: 'bg-amber-400 animate-pulse', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]', label: t('tracking.searching') },
    tracking: { dot: 'bg-emerald-400', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.7)]', label: t('tracking.tracking') },
    coasting: { dot: 'bg-emerald-300 animate-pulse', glow: 'shadow-[0_0_12px_rgba(110,231,183,0.6)]', label: t('tracking.coasting') },
    lost: { dot: 'bg-rose-500', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]', label: t('tracking.lost') },
  };
  const s = map[status] ?? map.idle;
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 backdrop-blur-xl shadow-lg">
      <span className={`h-2 w-2 rounded-full ${s.dot} ${s.glow}`} />
      <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 font-mono">{s.label}</span>
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-200 backdrop-blur-xl shadow-xl">
    <div className="flex items-start gap-2.5">
      <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
      <p className="leading-relaxed font-medium">{message}</p>
    </div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 transition"
        aria-label={t('common.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-3">
    <div className="relative flex h-10 w-10 items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-400 border-r-purple-400" />
      <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
    </div>
    {label && <p className="text-xs sm:text-sm font-medium text-slate-300 tracking-wide">{label}</p>}
  </div>
);
