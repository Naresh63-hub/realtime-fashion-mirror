import React from 'react';
import type { PerformanceMetrics, TrackingStatus } from '../types';
import { t } from '../i18n';

interface Props {
  metrics: PerformanceMetrics;
  tracking: TrackingStatus;
  showLandmarks: boolean;
  showMask: boolean;
  onToggleLandmarks: () => void;
  onToggleMask: () => void;
}

export const DebugPanel: React.FC<Props> = ({
  metrics,
  tracking,
  showLandmarks,
  showMask,
  onToggleLandmarks,
  onToggleMask,
}) => (
  <div className="pointer-events-auto absolute left-3 top-3 w-60 rounded-xl border border-emerald-500/30 bg-[#07080d]/85 p-3.5 font-mono text-[11px] leading-5 text-emerald-300 backdrop-blur-xl shadow-2xl">
    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-200 border-b border-emerald-500/20 pb-1">
      {t('debug.title')}
    </div>
    <div className="flex justify-between">
      <span>{t('debug.fps')}:</span>
      <span className="font-bold text-white">{metrics.fps}</span>
    </div>
    <div className="flex justify-between">
      <span>{t('debug.frame')}:</span>
      <span className="text-white">{metrics.frameTimeMs.toFixed(1)} ms</span>
    </div>
    <div className="flex justify-between">
      <span>{t('debug.pose')}:</span>
      <span className="text-white">{metrics.poseInferenceMs.toFixed(1)} ms</span>
    </div>
    <div className="flex justify-between">
      <span>{t('debug.seg')}:</span>
      <span className="text-white">{metrics.segmentationInferenceMs.toFixed(1)} ms</span>
    </div>
    <div className="flex justify-between">
      <span>{t('debug.infer_fps')}:</span>
      <span className="text-white">{metrics.inferenceFps}</span>
    </div>
    <div className="flex justify-between">
      <span>Frame Age:</span>
      <span className="text-white">{(metrics.frameAgeMs ?? 0).toFixed(0)} ms</span>
    </div>
    <div className="flex justify-between">
      <span>Dropped Frames:</span>
      <span className="text-amber-300">{metrics.droppedFrames ?? 0}</span>
    </div>
    <div className="flex justify-between">
      <span>{t('debug.heap')}:</span>
      <span className="text-white">{metrics.heapMb !== undefined ? `${metrics.heapMb} MB` : 'N/A'}</span>
    </div>
    {metrics.batteryInfo && <div className="text-amber-300/90 text-[10px]">{metrics.batteryInfo}</div>}
    <div className="flex justify-between pt-1 border-t border-emerald-500/20">
      <span>{t('debug.tracking')}:</span>
      <span className="text-emerald-400 font-bold uppercase">{tracking}</span>
    </div>
    <div className="mt-2.5 flex gap-2 pt-1 border-t border-emerald-500/20">
      <button
        type="button"
        onClick={onToggleLandmarks}
        aria-pressed={showLandmarks}
        aria-label={`Toggle skeleton display, currently ${showLandmarks ? 'on' : 'off'}`}
        className={`flex-1 rounded-lg px-2 py-1 text-center font-bold text-[10px] transition ${
          showLandmarks ? 'bg-emerald-600/40 text-emerald-100 border border-emerald-500/40' : 'bg-white/10 text-slate-300 hover:bg-white/20'
        }`}
      >
        {t('debug.skeleton')}
      </button>
      <button
        type="button"
        onClick={onToggleMask}
        aria-pressed={showMask}
        aria-label={`Toggle segmentation mask display, currently ${showMask ? 'on' : 'off'}`}
        className={`flex-1 rounded-lg px-2 py-1 text-center font-bold text-[10px] transition ${
          showMask ? 'bg-emerald-600/40 text-emerald-100 border border-emerald-500/40' : 'bg-white/10 text-slate-300 hover:bg-white/20'
        }`}
      >
        {t('debug.mask')}
      </button>
    </div>
  </div>
);
