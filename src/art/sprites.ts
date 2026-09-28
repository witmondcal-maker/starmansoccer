import Phaser from 'phaser';
import type { Kit, ShirtPattern, SquadPlayer, Team } from '../data/teams';
import { PixelBuffer } from './PixelBuffer';

export const PLAYER_W = 12;
export const PLAYER_H = 20;

const OUTLINE = 0x140c1c;
const BOOTS = 0x2e2e36;

const HEAD_AND_BODY = [
  '....ooooo...',
  '...ohhhhho..',
  '...ohhhsso..',
  '...ohssoso..',
  '....osssso..',
  '...ooSSSoo..',
  '..oSSSSSSSo.',
  '..oSSS*SSSo.',
  '.oSSS***SSo.',
  '.osSS*S*Sso.',
  '..oSSSSSSSo.',
  '..oPPPPPPPo.',
  '..oPPPoPPPo.',
];

const LEGS: Record<'stand' | 'run1' | 'run2' | 'kick', string[]> = {
  stand: [
    '..osso.osso.',
    '..oKKo.oKKo.',
    '..oKKo.oKKo.',
    '..oKKo.oKKo.',
    '..oBBo.oBBBo',
    '..oooo.ooooo',
    '............',
  ],
  run1: [
    '..osso..oso.',
    '.oKKo....oKo',
    '.oKKo....oKo',
    'oKKo.....oKo',
    'oBBo....oBBo',
    'oooo....oooo',
    '............',
  ],
  run2: [
    '...osssso...',
    '....oKKo....',
    '....oKKo....',
    '....oKKo....',
    '....oBBBo...',
    '....ooooo...',
    '............',
  ],
  kick: [
    '..osso..ooo.',
    '..oKKo.oKKBo',
    '..oKKo..ooo.',
    '..oKKo......',
    '..oBBBo.....',
    '..ooooo.....',
    '............',
  ],
};

const SKINS = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x6b4423];
const HAIRS = [0x2b1b0e, 0x4a2c12, 0x1a1a1a, 0xd8b04a, 0x8a4b1f, 0x5e3a1c];

export interface PlayerLook {
  shirt: number;
  trim: number;
  shorts: number;
  socks: number;
  pattern: ShirtPattern;
  skin: number;
  hair: number;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function lookFor(team: Team, player: SquadPlayer): PlayerLook {
  const kit: Kit = team.kit;
  const h = hash(`${team.id}:${player.number}`);
  const isGK = player.position === 'GK';
  return {
    shirt: isGK ? kit.gkShirt : kit.shirt,
    trim: isGK ? (kit.pattern === 'star' ? kit.trim : 0xf6f6f6) : kit.trim,
    shorts: isGK ? kit.gkShorts : kit.shorts,
    socks: isGK ? kit.gkShirt : kit.socks,
    pattern: isGK ? (kit.pattern === 'star' ? 'star' : 'collar') : kit.pattern,
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 8) % HAIRS.length],
  };
}

export function playerTextureKey(team: Team, player: SquadPlayer): string {
  return `player-${team.id}-${player.number}`;
}

function shirtColor(look: PlayerLook, x: number, y: number, emblem: boolean): number {
  if (emblem && look.pattern === 'star') return look.trim;
  switch (look.pattern) {
    case 'star':
    case 'collar':
      return y === 5 ? look.trim : look.shirt;
    case 'band':
      return y === 7 || y === 8 ? look.trim : look.shirt;
    case 'stripes':
      return y >= 6 && x % 3 === 1 ? look.trim : look.shirt;
    case 'sash':
      return x + y === 14 || x + y === 15 ? look.trim : look.shirt;
    default:
      return look.shirt;
  }
}

function colorize(rows: string[], look: PlayerLook): (number | null)[][] {
  return rows.map((row, y) =>
    [...row].map((ch, x) => {
      switch (ch) {
        case 'o':
          return OUTLINE;
        case 'h':
          return look.hair;
        case 's':
          return look.skin;
        case 'S':
          return shirtColor(look, x, y, false);
        case '*':
          return shirtColor(look, x, y, true);
        case 'P':
          return look.shorts;
        case 'K':
          return look.socks;
        case 'B':
          return BOOTS;
        default:
          return null;
      }
    }),
  );
}

/**
 * One texture per player with frames stand, run1, run2, kick (12×20, facing right) and dive (20×12).
 */
export function ensurePlayerTexture(scene: Phaser.Scene, key: string, look: PlayerLook): void {
  if (scene.textures.exists(key)) return;
  const frames = ['stand', 'run1', 'run2', 'kick'] as const;
  const buf = new PixelBuffer(PLAYER_W * frames.length + PLAYER_H, PLAYER_H);
  let standPixels: (number | null)[][] = [];
  frames.forEach((name, f) => {
    const pixels = colorize([...HEAD_AND_BODY, ...LEGS[name]], look);
    if (name === 'stand') standPixels = pixels;
    pixels.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c !== null) buf.set(f * PLAYER_W + x, y, c);
      }),
    );
  });
  // Dive: the stand frame turned a quarter clockwise, head toward the facing side.
  const diveX = PLAYER_W * frames.length;
  for (let r = 0; r < PLAYER_W; r++) {
    for (let c = 0; c < PLAYER_H; c++) {
      const color = standPixels[PLAYER_H - 1 - c][r];
      if (color !== null) buf.set(diveX + c, r, color);
    }
  }
  const tex = buf.commit(scene, key);
  frames.forEach((name, f) => tex.add(name, 0, f * PLAYER_W, 0, PLAYER_W, PLAYER_H));
  tex.add('dive', 0, diveX, 0, PLAYER_H, PLAYER_W);
}

function drawMap(buf: PixelBuffer, ox: number, rows: string[], palette: Record<string, number>): void {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (c !== undefined) buf.set(ox + x, y, c);
    }),
  );
}

export function createBallTextures(scene: Phaser.Scene): void {
  const frames = [
    ['.ooo.', 'owkwo', 'okwwo', 'owwko', '.ooo.'],
    ['.ooo.', 'okwwo', 'owwko', 'owkwo', '.ooo.'],
  ];
  const palette = { o: 0x101018, w: 0xffffff, k: 0x33333d };
  const buf = new PixelBuffer(10, 5);
  frames.forEach((rows, i) => drawMap(buf, i * 5, rows, palette));
  const tex = buf.commit(scene, 'ball');
  tex.add('0', 0, 0, 0, 5, 5);
  tex.add('1', 0, 5, 0, 5, 5);

  const shadow = new PixelBuffer(10, 3);
  drawMap(shadow, 0, ['.########.', '##########', '.########.'], { '#': 0x000000 });
  shadow.commit(scene, 'shadow-player');

  const ballShadow = new PixelBuffer(5, 2);
  drawMap(ballShadow, 0, ['#####', '.###.'], { '#': 0x000000 });
  ballShadow.commit(scene, 'shadow-ball');
}

export function createStarTexture(scene: Phaser.Scene): void {
  const rows = [
    '....o....',
    '...oyo...',
    '...oyo...',
    'oooyyyooo',
    'oyyyyyyyo',
    '.oyyyyyo.',
    '..oyyyo..',
    '.oyyoyyo.',
    '.oyo.oyo.',
    '.oo...oo.',
  ];
  const buf = new PixelBuffer(9, rows.length);
  drawMap(buf, 0, rows, { o: 0x3a2400, y: 0xffd23a });
  buf.commit(scene, 'star');

  const px = new PixelBuffer(1, 1);
  px.set(0, 0, 0xffffff);
  px.commit(scene, 'px');
}
