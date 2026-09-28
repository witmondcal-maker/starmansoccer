import Phaser from 'phaser';
import {
  BOX_LEN, BOX_Y0, BOX_Y1, GOAL_DEPTH, GOAL_H, GOAL_Y0, GOAL_Y1, PENALTY_SPOT, PITCH_D, PITCH_L, PITCH_TOP,
  SIX_LEN, SIX_Y0, SIX_Y1, VIEW_H, WORLD_SX_MAX, WORLD_SX_MIN, projectX, projectY,
} from '../config';
import { PixelBuffer } from './PixelBuffer';

const GRASS_A = 0x44a23c;
const GRASS_B = 0x3a9034;
const LINE = 0xeef5ea;
const STRIPE = 40;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Stands, boards, grass stripes and markings. Drawn once in screen space for the whole world. */
export function createPitchTexture(scene: Phaser.Scene): void {
  const w = WORLD_SX_MAX - WORLD_SX_MIN;
  const buf = new PixelBuffer(w, VIEW_H);
  const plot = (x: number, y: number, color = LINE) =>
    buf.set(projectX(x, y) - WORLD_SX_MIN, projectY(y, 0), color);

  const standBottom = PITCH_TOP - 14;
  const rand = rng(7);
  buf.fillRect(0, 0, w, standBottom, 0x23263a);
  const crowd = [0xe8e8e8, 0xd84a4a, 0x4a7ad8, 0xf2c230, 0x7ac84a, 0xc87ad8, 0xf08a3c, 0x2b2b2b];
  for (let y = 2; y < standBottom - 2; y += 3) {
    for (let x = (y / 3) % 2 === 0 ? 0 : 1; x < w; x += 3) {
      if (rand() < 0.82) {
        const c = crowd[Math.floor(rand() * crowd.length)];
        buf.fillRect(x, y, 2, 2, c);
      }
    }
  }
  const boards = [0x1d2b64, 0xd8262e, 0xf2b705, 0x2fa84f];
  for (let x = 0; x < w; x++) {
    const c = boards[Math.floor(x / 48) % boards.length];
    buf.fillRect(x, standBottom, 1, 6, c);
    buf.set(x, standBottom, 0xffffff);
  }
  buf.fillRect(0, standBottom + 6, w, 1, 0x14141c);

  for (let sy = standBottom + 7; sy < VIEW_H; sy++) {
    const depth = sy - PITCH_TOP;
    for (let px = 0; px < w; px++) {
      const worldX = px + WORLD_SX_MIN - (projectX(0, depth) - 0);
      const stripe = Math.floor((worldX + STRIPE * 100) / STRIPE) % 2;
      buf.set(px, sy, stripe === 0 ? GRASS_A : GRASS_B);
    }
  }

  const hLine = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x++) plot(x, y);
  };
  const vLine = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) plot(x, y);
  };

  hLine(0, PITCH_L, 0);
  hLine(0, PITCH_L, PITCH_D);
  vLine(0, 0, PITCH_D);
  vLine(PITCH_L, 0, PITCH_D);
  vLine(PITCH_L / 2, 0, PITCH_D);

  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    plot(PITCH_L / 2 + Math.cos(a) * 40, PITCH_D / 2 + Math.sin(a) * 22);
  }
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) plot(PITCH_L / 2 + dx, PITCH_D / 2 + dy);

  for (const side of [0, 1]) {
    const gx = side === 0 ? 0 : PITCH_L;
    const dir = side === 0 ? 1 : -1;
    const boxX = gx + dir * BOX_LEN;
    const sixX = gx + dir * SIX_LEN;
    hLine(Math.min(gx, boxX), Math.max(gx, boxX), BOX_Y0);
    hLine(Math.min(gx, boxX), Math.max(gx, boxX), BOX_Y1);
    vLine(boxX, BOX_Y0, BOX_Y1);
    hLine(Math.min(gx, sixX), Math.max(gx, sixX), SIX_Y0);
    hLine(Math.min(gx, sixX), Math.max(gx, sixX), SIX_Y1);
    vLine(sixX, SIX_Y0, SIX_Y1);
    const spotX = gx + dir * PENALTY_SPOT;
    plot(spotX, PITCH_D / 2);
    plot(spotX + 1, PITCH_D / 2);
    for (let a = -1.2; a <= 1.2; a += 0.01) {
      const x = spotX + dir * Math.cos(a) * 34;
      const y = PITCH_D / 2 + Math.sin(a) * 22;
      if ((x - boxX) * dir > 0) plot(x, y);
    }
    for (let a = 0; a <= Math.PI / 2; a += 0.05) {
      plot(gx + dir * Math.sin(a) * 6, Math.cos(a) * 4);
      plot(gx + dir * Math.sin(a) * 6, PITCH_D - Math.cos(a) * 4);
    }
  }

  buf.commit(scene, 'pitch');
}

interface GoalLayer {
  key: string;
  x: number;
  y: number;
}

/**
 * Each goal is split in two layers: the back (net, far post, crossbar) sorts behind players
 * in the goal mouth, the front (near post and near side net) sorts in front of them.
 */
export function createGoalTextures(scene: Phaser.Scene): { back: GoalLayer; front: GoalLayer }[] {
  return [0, 1].map((side) => {
    const gx = side === 0 ? 0 : PITCH_L;
    const dir = side === 0 ? -1 : 1;
    const backX = gx + dir * GOAL_DEPTH;
    const minSX = Math.floor(Math.min(projectX(gx, GOAL_Y0), projectX(backX, GOAL_Y0))) - 3;
    const maxSX = Math.ceil(Math.max(projectX(gx, GOAL_Y1), projectX(backX, GOAL_Y1))) + 3;
    const minSY = Math.floor(projectY(GOAL_Y0, GOAL_H)) - 3;
    const maxSY = Math.ceil(projectY(GOAL_Y1, 0)) + 3;
    const w = maxSX - minSX;
    const h = maxSY - minSY;
    const back = new PixelBuffer(w, h);
    const front = new PixelBuffer(w, h);
    const put = (b: PixelBuffer, x: number, y: number, z: number, color: number, alpha = 255) =>
      b.set(projectX(x, y) - minSX, projectY(y, z) - minSY, color, alpha);
    const NET = 0xffffff;
    const NET_A = 150;
    const xs = (fn: (x: number) => void) => {
      for (let i = 0; i <= GOAL_DEPTH; i++) fn(gx + dir * i);
    };

    // Back plane.
    for (let y = GOAL_Y0; y <= GOAL_Y1; y++) {
      for (let z = 0; z <= GOAL_H; z++) {
        if (y % 3 === 0 || z % 3 === 0) put(back, backX, y, z, NET, NET_A);
      }
    }
    // Roof.
    xs((x) => {
      for (let y = GOAL_Y0; y <= GOAL_Y1; y++) {
        if (Math.abs(x - gx) % 3 === 0 || y % 3 === 0) put(back, x, y, GOAL_H, NET, NET_A);
      }
    });
    // Side nets.
    xs((x) => {
      for (let z = 0; z <= GOAL_H; z++) {
        if (Math.abs(x - gx) % 3 === 0 || z % 3 === 0) {
          put(back, x, GOAL_Y0, z, NET, NET_A);
          put(front, x, GOAL_Y1, z, NET, NET_A);
        }
      }
    });
    // Back frame.
    for (let z = 0; z <= GOAL_H; z++) {
      put(back, backX, GOAL_Y0, z, 0xb8b8c0);
      put(back, backX, GOAL_Y1, z, 0xb8b8c0);
    }
    xs((x) => {
      put(back, x, GOAL_Y0, GOAL_H, 0xd8d8e0);
      put(front, x, GOAL_Y1, GOAL_H, 0xd8d8e0);
    });
    // Posts and crossbar, two pixels thick with a shaded edge.
    for (let z = 0; z <= GOAL_H; z++) {
      put(back, gx, GOAL_Y0, z, 0xffffff);
      back.set(projectX(gx, GOAL_Y0) - minSX + 1, projectY(GOAL_Y0, z) - minSY, 0xa8a8b4);
      put(front, gx, GOAL_Y1, z, 0xffffff);
      front.set(projectX(gx, GOAL_Y1) - minSX + 1, projectY(GOAL_Y1, z) - minSY, 0xa8a8b4);
    }
    for (let y = GOAL_Y0; y <= GOAL_Y1; y += 0.5) {
      put(back, gx, y, GOAL_H, 0xffffff);
      put(back, gx, y, GOAL_H - 1, 0xa8a8b4);
    }

    const key = side === 0 ? 'goal-left' : 'goal-right';
    back.commit(scene, `${key}-back`);
    front.commit(scene, `${key}-front`);
    return {
      back: { key: `${key}-back`, x: minSX, y: minSY },
      front: { key: `${key}-front`, x: minSX, y: minSY },
    };
  });
}
