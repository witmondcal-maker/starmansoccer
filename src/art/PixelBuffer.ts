import Phaser from 'phaser';

/** A raw RGBA buffer that becomes a canvas texture. Every write is a whole pixel, so nothing blurs. */
export class PixelBuffer {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  set(x: number, y: number, color: number, alpha = 255): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const i = (py * this.width + px) * 4;
    this.data[i] = (color >> 16) & 0xff;
    this.data[i + 1] = (color >> 8) & 0xff;
    this.data[i + 2] = color & 0xff;
    this.data[i + 3] = alpha;
  }

  fillRect(x: number, y: number, w: number, h: number, color: number, alpha = 255): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color, alpha);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 255): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(ax, ay, color, alpha);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  commit(scene: Phaser.Scene, key: string): Phaser.Textures.CanvasTexture {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, this.width, this.height);
    if (!tex) throw new Error(`Could not create texture ${key}`);
    const ctx = tex.getContext();
    const img = ctx.createImageData(this.width, this.height);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    return tex;
  }
}
