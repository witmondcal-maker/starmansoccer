import Phaser from 'phaser';
import { FONT_KEY, FONT_MIXED_KEY } from './pixelFont';

export interface PixelTextStyle {
  scale?: number;
  color?: number;
  shadow?: number | null;
  align?: 'left' | 'center' | 'right';
  /** Keep the text's own capitals and lowercase, drawn in the proportional mixed-case font. */
  mixedCase?: boolean;
}

/** Pixel-font text with a one-pixel drop shadow so it reads on grass and crowd. */
export class PixelText extends Phaser.GameObjects.Container {
  private readonly main: Phaser.GameObjects.BitmapText;
  private readonly shade: Phaser.GameObjects.BitmapText | null;
  private readonly mixedCase: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: PixelTextStyle = {}) {
    super(scene, x, y);
    const scale = style.scale ?? 1;
    const originX = style.align === 'center' ? 0.5 : style.align === 'right' ? 1 : 0;
    const shadow = style.shadow === undefined ? 0x0b0b14 : style.shadow;
    this.mixedCase = style.mixedCase ?? false;
    const font = this.mixedCase ? FONT_MIXED_KEY : FONT_KEY;
    const shown = this.format(text);
    this.shade = null;
    if (shadow !== null) {
      this.shade = scene.add
        .bitmapText(scale, scale, font, shown)
        .setScale(scale)
        .setOrigin(originX, 0)
        .setTint(shadow);
      this.add(this.shade);
    }
    this.main = scene.add
      .bitmapText(0, 0, font, shown)
      .setScale(scale)
      .setOrigin(originX, 0)
      .setTint(style.color ?? 0xffffff);
    this.add(this.main);
    scene.add.existing(this);
  }

  setText(text: string): this {
    const shown = this.format(text);
    this.main.setText(shown);
    this.shade?.setText(shown);
    return this;
  }

  setColor(color: number): this {
    this.main.setTint(color);
    return this;
  }

  private format(text: string): string {
    return this.mixedCase ? text : text.toUpperCase();
  }
}
