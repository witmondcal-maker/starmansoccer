import Phaser from 'phaser';
import { isMuted, menu as menuSound, toggleMute, unlock } from '../audio/sfx';
import { PixelText } from '../art/PixelText';
import { VIEW_H, VIEW_W } from '../config';
import { createCup, hasSave, saveCup } from '../cup/cup';
import { STRINGS } from '../strings';

const GOLD = 0xffd23a;

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private items: ('new' | 'continue')[] = [];
  private labels: PixelText[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private prompt!: PixelText;
  private muteLabel!: PixelText;
  private muteShown = '';
  private onConfirm!: (event: KeyboardEvent) => void;
  private onUp!: () => void;
  private onDown!: () => void;
  private onMute!: (event: KeyboardEvent) => void;

  constructor() {
    super('menu');
  }

  create(): void {
    this.index = 0;
    this.items = hasSave() ? ['new', 'continue'] : ['new'];

    const bg = this.add.graphics();
    for (let x = 0; x < VIEW_W; x += 32) {
      bg.fillStyle((x / 32) % 2 === 0 ? 0x2f7a2c : 0x2a6e27);
      bg.fillRect(x, 0, 32, VIEW_H);
    }
    bg.fillStyle(0x0b0b14, 0.55);
    bg.fillRect(0, 0, VIEW_W, VIEW_H);

    this.add.image(VIEW_W / 2 - 142, 16, 'star').setScale(2);
    this.add.image(VIEW_W / 2 + 142, 16, 'star').setScale(2);
    new PixelText(this, VIEW_W / 2, 8, STRINGS.title, { scale: 3, color: GOLD, align: 'center' });

    this.cursor = this.add.graphics();
    this.labels = this.items.map((item, i) => {
      const text = item === 'new' ? STRINGS.newCup : STRINGS.continueCup;
      return new PixelText(this, VIEW_W / 2, 64 + i * 22, text, { scale: 2, align: 'center' });
    });

    new PixelText(this, VIEW_W / 2, 130, STRINGS.controlsLine1, { align: 'center' });
    new PixelText(this, VIEW_W / 2, 144, STRINGS.controlsLine2, { align: 'center' });
    this.prompt = new PixelText(this, VIEW_W / 2, 168, STRINGS.pressEnterToContinue, { color: GOLD, align: 'center' });

    const band = this.add.graphics();
    band.fillStyle(0x0b0b14, 0.85);
    band.fillRect(0, 201, VIEW_W, VIEW_H - 201);
    band.fillStyle(GOLD);
    band.fillRect(0, 201, VIEW_W, 1);
    new PixelText(this, VIEW_W / 2, 204, STRINGS.credits, { align: 'center', mixedCase: true });
    this.muteLabel = new PixelText(this, 4, 6, STRINGS.sound, { color: GOLD });
    this.refreshMute();
    this.refresh();

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([K.UP, K.DOWN, K.ENTER, K.SPACE, K.Z, K.M]);
    this.onUp = () => this.move(-1);
    this.onDown = () => this.move(1);
    this.onConfirm = (event?: KeyboardEvent) => {
      if (event?.repeat) return;
      unlock();
      menuSound();
      if (this.items[this.index] === 'new') saveCup(createCup());
      this.scene.start('cup');
    };
    this.onMute = (event?: KeyboardEvent) => {
      if (event?.repeat) return;
      toggleMute();
      this.refreshMute();
    };
    kb.on('keydown-UP', this.onUp);
    kb.on('keydown-DOWN', this.onDown);
    kb.on('keydown-ENTER', this.onConfirm);
    kb.on('keydown-Z', this.onConfirm);
    kb.on('keydown-SPACE', this.onConfirm);
    kb.on('keydown-M', this.onMute);
    this.events.once('shutdown', () => {
      kb.off('keydown-UP', this.onUp);
      kb.off('keydown-DOWN', this.onDown);
      kb.off('keydown-ENTER', this.onConfirm);
      kb.off('keydown-Z', this.onConfirm);
      kb.off('keydown-SPACE', this.onConfirm);
      kb.off('keydown-M', this.onMute);
    });
  }

  update(time: number): void {
    try {
      this.prompt.setVisible(Math.floor(time / 450) % 2 === 0);
      this.refreshMute();
    } catch {
      /* The menu label is optional. */
    }
  }

  private move(step: number): void {
    const n = this.items.length;
    this.index = (this.index + n + step) % n;
    this.refresh();
  }

  private refresh(): void {
    this.cursor.clear();
    this.labels.forEach((label, i) => {
      const on = i === this.index;
      label.setColor(on ? GOLD : 0xffffff);
      if (!on) return;
      const y = 62 + i * 22;
      this.cursor.fillStyle(GOLD);
      this.cursor.fillRect(VIEW_W / 2 - 78, y, 156, 1);
      this.cursor.fillRect(VIEW_W / 2 - 78, y + 16, 156, 1);
    });
  }

  private refreshMute(): void {
    const text = isMuted() ? STRINGS.mute : STRINGS.sound;
    if (text === this.muteShown) return;
    this.muteShown = text;
    this.muteLabel.setText(text);
  }
}
