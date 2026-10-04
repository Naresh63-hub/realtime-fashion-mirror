import { describe, it, expect } from 'vitest';
import { createAppError, toAppError, appError, AppErrorLike } from './errors';
import { ErrorType } from '../types';

describe('error utilities', () => {
  it('creates user-facing messages without stack traces', () => {
    const err = createAppError(ErrorType.CAMERA_PERMISSION_DENIED);
    expect(err.message).toContain('permission');
    expect(err.type).toBe(ErrorType.CAMERA_PERMISSION_DENIED);
  });

  it('wraps AppErrorLike and preserves the type', () => {
    const original = new AppErrorLike(createAppError(ErrorType.MODEL_LOADING_FAILED));
    const mapped = toAppError(original);
    expect(mapped.type).toBe(ErrorType.MODEL_LOADING_FAILED);
  });

  it('maps unknown errors to UNKNOWN with details', () => {
    const mapped = toAppError(new Error('boom'));
    expect(mapped.type).toBe(ErrorType.UNKNOWN);
    expect(mapped.details).toBe('boom');
  });

  it('appError throws an AppErrorLike', () => {
    expect(() => appError(ErrorType.CLOTHING_IMAGE_INVALID)).toThrow(AppErrorLike);
  });
});
