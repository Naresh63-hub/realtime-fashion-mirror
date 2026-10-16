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
  <div className="pointer-events-auto absolute left-3 top-3 w-56 rounded-lg bg-black/70 p-3 font-mono text-[11px] leading-5 text-emerald-300 backdrop-blur">
    <div className="mb-1 text-emerald-200">{t('debug.title')}</div>
    <div>{t('debug.fps')}: {metrics.fps}</div>
    <div>{t('debug.frame')}: {metrics.frameTimeMs.toFixed(1)} ms</div>
    <div>{t('debug.pose')}: {metrics.poseInferenceMs.toFixed(1)} ms</div>
    <div>{t('debug.seg')}: {metrics.segmentationInferenceMs.toFixed(1)} ms</div>
    <div>{t('debug.infer_fps')}: {metrics.inferenceFps}</div>
    <div>Frame Age: {(metrics.frameAgeMs ?? 0).toFixed(0)} ms</div>
    <div>Dropped Frames: {metrics.droppedFrames ?? 0}</div>
    <div>
      {t('debug.heap')}: {metrics.heapMb !== undefined ? `${metrics.heapMb} MB` : 'N/A (Chromium only)'}
    </div>
    {metrics.batteryInfo && <div className="text-amber-300/90">{metrics.batteryInfo}</div>}
    <div>{t('debug.tracking')}: {tracking}</div>
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={onToggleLandmarks}
        aria-pressed={showLandmarks}
        aria-label={`Toggle skeleton display, currently ${showLandmarks ? 'on' : 'off'}`}
        className={`rounded px-2 py-0.5 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black outline-none ${showLandmarks ? 'bg-emerald-600/40 text-emerald-100' : 'bg-white/10 text-gray-300'}`}
      >
        {t('debug.skeleton')}
      </button>
      <button
        type="button"
        onClick={onToggleMask}
        aria-pressed={showMask}
        aria-label={`Toggle segmentation mask display, currently ${showMask ? 'on' : 'off'}`}
        className={`rounded px-2 py-0.5 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black outline-none ${showMask ? 'bg-emerald-600/40 text-emerald-100' : 'bg-white/10 text-gray-300'}`}
      >
        {t('debug.mask')}
      </button>
    </div>
  </div>
);
