import { ErrorType } from '../types';
import type { AppError } from '../types';
import { t } from '../i18n';

const ERROR_KEYS: Record<ErrorType, string> = {
  [ErrorType.CAMERA_PERMISSION_DENIED]: 'errors.CAMERA_PERMISSION_DENIED',
  [ErrorType.CAMERA_UNAVAILABLE]: 'errors.CAMERA_UNAVAILABLE',
  [ErrorType.CAMERA_IN_USE]: 'errors.CAMERA_IN_USE',
  [ErrorType.INSECURE_CONTEXT]: 'errors.INSECURE_CONTEXT',
  [ErrorType.NO_PERSON_DETECTED]: 'errors.NO_PERSON_DETECTED',
  [ErrorType.MULTIPLE_PEOPLE_DETECTED]: 'errors.MULTIPLE_PEOPLE_DETECTED',
  [ErrorType.POOR_TRACKING]: 'errors.POOR_TRACKING',
  [ErrorType.PERSON_OUT_OF_FRAME]: 'errors.PERSON_OUT_OF_FRAME',
  [ErrorType.CLOTHING_IMAGE_INVALID]: 'errors.CLOTHING_IMAGE_INVALID',
  [ErrorType.CLOTHING_UNSUPPORTED_TYPE]: 'errors.CLOTHING_UNSUPPORTED_TYPE',
  [ErrorType.MODEL_LOADING_FAILED]: 'errors.MODEL_LOADING_FAILED',
  [ErrorType.MODEL_NOT_READY]: 'errors.MODEL_NOT_READY',
  [ErrorType.RENDER_FAILURE]: 'errors.RENDER_FAILURE',
  [ErrorType.UNKNOWN]: 'errors.UNKNOWN',
  [ErrorType.AR_NOT_SUPPORTED]: 'errors.AR_NOT_SUPPORTED',
  [ErrorType.AUTH_EMAIL_IN_USE]: 'errors.AUTH_EMAIL_IN_USE',
  [ErrorType.AUTH_INVALID_CREDENTIALS]: 'errors.AUTH_INVALID_CREDENTIALS',
  [ErrorType.AUTH_SESSION_EXPIRED]: 'errors.AUTH_SESSION_EXPIRED',
  [ErrorType.RECORDING_FAILED]: 'errors.RECORDING_FAILED',
};

const FALLBACK_EN: Record<ErrorType, string> = {
  [ErrorType.CAMERA_PERMISSION_DENIED]:
    'Camera access was blocked. Allow camera permission and try again.',
  [ErrorType.CAMERA_UNAVAILABLE]:
    'No camera was found on this device.',
  [ErrorType.CAMERA_IN_USE]:
    'The camera is in use by another application.',
  [ErrorType.INSECURE_CONTEXT]:
    'Camera requires HTTPS or localhost.',
  [ErrorType.NO_PERSON_DETECTED]:
    'No person detected. Step into the camera frame.',
  [ErrorType.MULTIPLE_PEOPLE_DETECTED]:
    'Multiple people detected. The virtual try-on supports one person at a time.',
  [ErrorType.POOR_TRACKING]:
    'Tracking is unstable. Improve lighting and keep your upper body in frame.',
  [ErrorType.PERSON_OUT_OF_FRAME]:
    'Please stand fully inside the camera frame.',
  [ErrorType.CLOTHING_IMAGE_INVALID]:
    'That image could not be used. Try a clear product photo (PNG/JPEG).',
  [ErrorType.CLOTHING_UNSUPPORTED_TYPE]:
    'That image format is not supported.',
  [ErrorType.MODEL_LOADING_FAILED]:
    'Vision models failed to load. Check your connection and reload.',
  [ErrorType.MODEL_NOT_READY]:
    'Engine is still starting. Please try again in a moment.',
  [ErrorType.RENDER_FAILURE]:
    'Something went wrong while rendering. Please restart the camera.',
  [ErrorType.UNKNOWN]:
    'Unexpected error while starting the camera.',
  [ErrorType.AR_NOT_SUPPORTED]:
    'AR mode requires a native mobile app. See architecture docs for the bridge specification.',
  [ErrorType.AUTH_EMAIL_IN_USE]:
    'This email is already registered. Try logging in instead.',
  [ErrorType.AUTH_INVALID_CREDENTIALS]:
    'Invalid email or password.',
  [ErrorType.AUTH_SESSION_EXPIRED]:
    'Your session expired. Please log in again.',
  [ErrorType.RECORDING_FAILED]:
    'Recording failed. Your browser may not support WebM capture.',
};

export function createAppError(type: ErrorType, details?: string): AppError {
  const key = ERROR_KEYS[type];
  const translated = t(key);
  const message = translated === key ? FALLBACK_EN[type] : translated;
  return {
    type,
    message,
    details,
    timestamp: Date.now(),
  };
}

/** Error wrapper that carries a typed AppError through re-throws. */
export class AppErrorLike extends Error implements AppError {
  readonly type: ErrorType;
  override readonly message: string;
  readonly details?: string;
  readonly timestamp: number;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'AppError';
    this.type = appError.type;
    this.message = appError.message;
    this.details = appError.details;
    this.timestamp = appError.timestamp;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppErrorLike) return error;
  return createAppError(ErrorType.UNKNOWN, error instanceof Error ? error.message : undefined);
}

export function isAppError(error: unknown): error is AppErrorLike {
  return error instanceof AppErrorLike;
}

/** Throwing variant used by engines to propagate typed failures. */
export function appError(type: ErrorType, details?: string): never {
  throw new AppErrorLike(createAppError(type, details));
}
