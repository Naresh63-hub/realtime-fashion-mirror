/**
 * Exponential smoothing for scalar values.
 *
 * The classic filter `s = a*x + (1-a)*s` with `a = smoothingFactor` where
 * 0 = frozen, 1 = no smoothing. A velocity term (critically-damped-ish
 * lerp with momentum) reduces visible lag for fast motions.
 */
export class ExponentialSmoother {
  private value: number | null = null;
  private velocity = 0;

  constructor(
    /** 0..1, higher = smoother/slower. */
    private readonly alpha: number,
    /** Momentum blending for the velocity term. */
    private readonly beta = 0.25
  ) {
    this.alpha = clamp01(alpha);
    this.beta = clamp01(beta);
  }

  smooth(newValue: number): number {
    if (this.value === null || !Number.isFinite(newValue)) {
      this.value = Number.isFinite(newValue) ? newValue : null;
      return this.value ?? newValue;
    }

    const delta = newValue - this.value;
    this.velocity = this.velocity * (1 - this.beta) + delta * this.beta;
    this.value = this.value + this.velocity * this.alpha + delta * (1 - this.alpha) * 0.5;
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.velocity = 0;
  }

  getValue(): number | null {
    return this.value;
  }
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Per-axis scalar smoother for 2D coordinates. */
export class VectorSmoother {
  private xSmoother: ExponentialSmoother;
  private ySmoother: ExponentialSmoother;

  constructor(alpha: number, beta?: number) {
    this.xSmoother = new ExponentialSmoother(alpha, beta);
    this.ySmoother = new ExponentialSmoother(alpha, beta);
  }

  smooth(x: number, y: number): Vec2 {
    return { x: this.xSmoother.smooth(x), y: this.ySmoother.smooth(y) };
  }

  reset(): void {
    this.xSmoother.reset();
    this.ySmoother.reset();
  }

  getValue(): { x: number | null; y: number | null } {
    return { x: this.xSmoother.getValue(), y: this.ySmoother.getValue() };
  }
}

/** Windowed moving average — cheap noise floor for high-frequency jitter. */
export class MovingAverage {
  private window: number[] = [];

  constructor(private readonly windowSize: number = 5) {
    this.windowSize = Math.max(1, Math.floor(windowSize));
  }

  smooth(value: number): number {
    this.window.push(value);
    while (this.window.length > this.windowSize) this.window.shift();
    return this.window.reduce((acc, val) => acc + val, 0) / this.window.length;
  }

  reset(): void {
    this.window = [];
  }

  getWindowSize(): number {
    return this.windowSize;
  }
}

/** 1-D Kalman filter used for depth (z) tracking of arm occluders. */
export class KalmanFilter {
  private x: number;
  private p: number;

  constructor(
    initialValue: number = 0,
    private readonly q: number = 0.008,
    private readonly r: number = 0.05,
    initialError: number = 1
  ) {
    this.x = initialValue;
    this.p = initialError;
  }

  filter(measurement: number): number {
    this.p += this.q;
    const k = this.p / (this.p + this.r);
    this.x += k * (measurement - this.x);
    this.p *= 1 - k;
    return this.x;
  }

  reset(initialValue: number = 0): void {
    this.x = initialValue;
    this.p = 1;
  }

  getValue(): number {
    return this.x;
  }
}

/** Wraps an angle into [-PI, PI]. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Full tracking smoother for the garment transform.
 * Separately smooths position, scale and rotation with angle wrapping.
 */
export class TrackingSmoother {
  private positionSmoother: VectorSmoother;
  private scaleSmoother: ExponentialSmoother;
  private rotationSmoother: ExponentialSmoother;

  constructor(smoothingFactor: number) {
    this.positionSmoother = new VectorSmoother(smoothingFactor);
    this.scaleSmoother = new ExponentialSmoother(smoothingFactor);
    this.rotationSmoother = new ExponentialSmoother(smoothingFactor);
  }

  smoothPosition(x: number, y: number): Vec2 {
    return this.positionSmoother.smooth(x, y);
  }

  smoothScale(scale: number): number {
    return this.scaleSmoother.smooth(scale);
  }

  smoothRotation(rotation: number): number {
    return this.rotationSmoother.smooth(wrapAngle(rotation));
  }

  reset(): void {
    this.positionSmoother.reset();
    this.scaleSmoother.reset();
    this.rotationSmoother.reset();
  }
}
