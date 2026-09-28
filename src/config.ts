export const VIEW_W = 384;
export const VIEW_H = 216;

/** Along-pitch length (world X), goal line to goal line. */
export const PITCH_L = 800;
/** Depth from the far sideline (0) to the near sideline (PITCH_D). */
export const PITCH_D = 128;
/** Screen Y of the far sideline. */
export const PITCH_TOP = 70;
/** Horizontal shear per unit of depth, gives the side-view 2.5D slant. */
export const SKEW = 0.3;

export const GOAL_Y0 = PITCH_D / 2 - 15;
export const GOAL_Y1 = PITCH_D / 2 + 15;
export const GOAL_H = 22;
export const GOAL_DEPTH = 14;

export const BOX_LEN = 90;
export const BOX_Y0 = PITCH_D / 2 - 40;
export const BOX_Y1 = PITCH_D / 2 + 40;
export const SIX_LEN = 30;
export const SIX_Y0 = PITCH_D / 2 - 24;
export const SIX_Y1 = PITCH_D / 2 + 24;

export const MATCH_SECONDS = 180;

export const WORLD_SX_MIN = -90;
export const WORLD_SX_MAX = PITCH_L + 90;

export const GRAVITY = 300;
export const BALL_DECEL = 110;

export function projectX(x: number, y: number): number {
  return x + (y - PITCH_D / 2) * SKEW;
}

export function projectY(y: number, z: number): number {
  return PITCH_TOP + y - z;
}

export function toCss(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
