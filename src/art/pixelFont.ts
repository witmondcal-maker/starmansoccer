import Phaser from 'phaser';
import { PixelBuffer } from './PixelBuffer';

export const FONT_KEY = 'pixel-font';
const CELL_W = 6;
const CELL_H = 8;

/** 5×7 uppercase glyphs. Text is uppercased before it is drawn. */
const GLYPHS: Record<string, string> = {
  ' ': '...../...../...../...../...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  "'": '..#../..#../.#.../...../...../...../.....',
  ',': '...../...../...../...../...../..#../.#...',
  '-': '...../...../...../.###./...../...../.....',
  '.': '...../...../...../...../...../...../..#..',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  ':': '...../..#../..#../...../..#../..#../.....',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
};

/**
 * Lowercase for the mixed-case font: x-height of five rows, ascenders from the top row,
 * descenders in two extra rows below the baseline.
 */
const LOWER: Record<string, string> = {
  a: '..../..../.##./...#/.###/#..#/.###',
  b: '#.../#.../###./#..#/#..#/#..#/###.',
  c: '..../..../.###/#.../#.../#.../.###',
  d: '...#/...#/.###/#..#/#..#/#..#/.###',
  e: '..../..../.##./#..#/####/#.../.###',
  f: '.##/#../###/#../#../#../#..',
  g: '..../..../.###/#..#/#..#/#..#/.###/...#/###.',
  h: '#.../#.../###./#..#/#..#/#..#/#..#',
  i: '.#./.../##./.#./.#./.#./###',
  j: '..#/.../.##/..#/..#/..#/..#/#.#/.#.',
  k: '#.../#.../#..#/#.#./##../#.#./#..#',
  l: '##./.#./.#./.#./.#./.#./###',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  n: '..../..../###./#..#/#..#/#..#/#..#',
  o: '..../..../.##./#..#/#..#/#..#/.##.',
  p: '..../..../###./#..#/#..#/#..#/###./#.../#...',
  q: '..../..../.###/#..#/#..#/#..#/.###/...#/...#',
  r: '..../..../#.##/##../#.../#.../#...',
  s: '..../..../.###/#.../.##./...#/###.',
  t: '.#./.#./###/.#./.#./.#./.##',
  u: '..../..../#..#/#..#/#..#/#..#/.###',
  v: '...../...../#...#/#...#/.#.#./.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
  x: '..../..../#..#/#..#/.##./#..#/#..#',
  y: '..../..../#..#/#..#/#..#/#..#/.###/...#/###.',
  z: '..../..../####/...#/.##./#.../####',
  '|': '#/#/#/#/#/#/#/#/#',
};

export const FONT_MIXED_KEY = 'pixel-font-mixed';
const MIXED_H = 9;
const SPACE_W = 2;

export function createPixelFont(scene: Phaser.Scene): void {
  createUpperFont(scene);
  createMixedFont(scene);
}

function createUpperFont(scene: Phaser.Scene): void {
  const chars = Object.keys(GLYPHS).join('');
  const buf = new PixelBuffer(chars.length * CELL_W, CELL_H);
  [...chars].forEach((ch, i) => {
    GLYPHS[ch].split('/').forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') buf.set(i * CELL_W + x, y, 0xffffff);
      });
    });
  });
  const imageKey = `${FONT_KEY}-image`;
  buf.commit(scene, imageKey);
  const config: Phaser.Types.GameObjects.BitmapText.RetroFontConfig = {
    image: imageKey,
    width: CELL_W,
    height: CELL_H,
    chars,
    charsPerRow: chars.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 2,
  };
  scene.cache.bitmapFont.add(FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, config));
}

/** Upper and lower case with proportional widths, for lines too long for the monospace capitals. */
function createMixedFont(scene: Phaser.Scene): void {
  const glyphs = { ...GLYPHS, ...LOWER };
  const chars = Object.keys(glyphs);
  const texW = chars.length * CELL_W;
  const buf = new PixelBuffer(texW, MIXED_H);
  // Phaser's typings omit xAdvance, but the BitmapText renderer spaces glyphs by it.
  const fontChars: Record<number, Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number }> = {};
  chars.forEach((ch, i) => {
    let min = CELL_W;
    let max = -1;
    glyphs[ch].split('/').forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== '#') return;
        buf.set(i * CELL_W + x, y, 0xffffff);
        min = Math.min(min, x);
        max = Math.max(max, x);
      });
    });
    if (max < 0) {
      min = 0;
      max = SPACE_W - 1;
    }
    const width = max - min + 1;
    const x = i * CELL_W + min;
    fontChars[ch.charCodeAt(0)] = {
      x,
      y: 0,
      width,
      height: MIXED_H,
      centerX: Math.floor(width / 2),
      centerY: Math.floor(MIXED_H / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: width + 1,
      data: {},
      kerning: {},
      u0: x / texW,
      v0: 0,
      u1: (x + width) / texW,
      v1: 1,
    };
  });
  const imageKey = `${FONT_MIXED_KEY}-image`;
  buf.commit(scene, imageKey);
  scene.cache.bitmapFont.add(FONT_MIXED_KEY, {
    data: { retroFont: false, font: imageKey, size: MIXED_H, lineHeight: MIXED_H + 2, chars: fontChars },
    frame: null,
    texture: imageKey,
  });
}
