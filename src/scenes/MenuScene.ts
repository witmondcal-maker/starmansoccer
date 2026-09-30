import Phaser from 'phaser';
import { PixelText } from '../art/PixelText';
import { ensurePlayerTexture, lookFor, playerTextureKey } from '../art/sprites';
import { VIEW_H, VIEW_W } from '../config';
import { COUNTRIES, EAGLES_NING, type Team } from '../data/teams';
import { STRINGS } from '../strings';

const COLS = 4;
const CELL_W = 94;
const CELL_H = 15;
const GRID_X = 4;
const GRID_Y = 44;
const GOLD = 0xffd23a;

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private cursor!: Phaser.GameObjects.Graphics;
  private rival!: Phaser.GameObjects.Sprite;
  private rivalName!: PixelText;
  private prompt!: PixelText;

  constructor() {
    super('menu');
  }

  create(): void {
    this.index = (this.registry.get('countryIndex') as number | undefined) ?? 0;

    const bg = this.add.graphics();
    for (let x = 0; x < VIEW_W; x += 32) {
      bg.fillStyle((x / 32) % 2 === 0 ? 0x2f7a2c : 0x2a6e27);
      bg.fillRect(x, 0, 32, VIEW_H);
    }
    bg.fillStyle(0x0b0b14, 0.55);
    bg.fillRect(0, 0, VIEW_W, VIEW_H);

    this.add.image(VIEW_W / 2 - 142, 16, 'star').setScale(2);
    this.add.image(VIEW_W / 2 + 142, 16, 'star').setScale(2);
    new PixelText(this, VIEW_W / 2, 6, STRINGS.title, { scale: 3, color: GOLD, align: 'center' });
    new PixelText(this, VIEW_W / 2, 32, STRINGS.chooseCountry, { align: 'center' });

    const swatches = this.add.graphics();
    COUNTRIES.forEach((team, i) => {
      const cx = GRID_X + (i % COLS) * CELL_W;
      const cy = GRID_Y + Math.floor(i / COLS) * CELL_H;
      swatches.fillStyle(0x0b0b14);
      swatches.fillRect(cx + 2, cy, 10, 9);
      swatches.fillStyle(team.kit.shirt);
      swatches.fillRect(cx + 3, cy + 1, 8, 5);
      swatches.fillStyle(team.kit.shorts);
      swatches.fillRect(cx + 3, cy + 6, 8, 2);
      new PixelText(this, cx + 14, cy + 1, team.name);
    });
    this.cursor = this.add.graphics();

    const hero = EAGLES_NING.squad[9];
    const heroKey = playerTextureKey(EAGLES_NING, hero);
    ensurePlayerTexture(this, heroKey, lookFor(EAGLES_NING, hero));
    this.add.sprite(150, 164, heroKey, 'stand').setOrigin(0.5, 1).setScale(3);
    new PixelText(this, 128, 128, EAGLES_NING.name, { color: GOLD, align: 'right' });
    new PixelText(this, VIEW_W / 2, 124, STRINGS.vs, { scale: 2, align: 'center' });
    this.rival = this.add.sprite(234, 164, '__DEFAULT').setOrigin(0.5, 1).setScale(3).setFlipX(true);
    this.rivalName = new PixelText(this, 256, 128, '');

    new PixelText(this, VIEW_W / 2, 169, STRINGS.controlsLine1, { align: 'center' });
    new PixelText(this, VIEW_W / 2, 179, STRINGS.controlsLine2, { align: 'center' });
    this.prompt = new PixelText(this, VIEW_W / 2, 190, STRINGS.pressEnterToPlay, { color: GOLD, align: 'center' });

    const band = this.add.graphics();
    band.fillStyle(0x0b0b14, 0.85);
    band.fillRect(0, 201, VIEW_W, VIEW_H - 201);
    band.fillStyle(GOLD);
    band.fillRect(0, 201, VIEW_W, 1);
    new PixelText(this, VIEW_W / 2, 204, STRINGS.credits, { align: 'center', mixedCase: true });

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE, K.ENTER, K.Z]);
    const n = COUNTRIES.length;
    const move = (step: number) => {
      this.index = (this.index + n + step) % n;
      this.refresh();
    };
    kb.on('keydown-LEFT', () => move(-1));
    kb.on('keydown-RIGHT', () => move(1));
    kb.on('keydown-UP', () => move(-COLS));
    kb.on('keydown-DOWN', () => move(COLS));
    const start = (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.registry.set('countryIndex', this.index);
      this.scene.start('match', { countryId: COUNTRIES[this.index].id });
    };
    kb.on('keydown-ENTER', start);
    kb.on('keydown-Z', start);
    kb.on('keydown-SPACE', start);

    this.refresh();
  }

  update(time: number): void {
    this.prompt.setVisible(Math.floor(time / 450) % 2 === 0);
  }

  private refresh(): void {
    const cx = GRID_X + (this.index % COLS) * CELL_W;
    const cy = GRID_Y + Math.floor(this.index / COLS) * CELL_H;
    this.cursor.clear();
    this.cursor.fillStyle(GOLD);
    this.cursor.fillRect(cx, cy - 2, CELL_W - 2, 1);
    this.cursor.fillRect(cx, cy + 11, CELL_W - 2, 1);
    this.cursor.fillRect(cx, cy - 2, 1, 14);
    this.cursor.fillRect(cx + CELL_W - 3, cy - 2, 1, 14);

    const team: Team = COUNTRIES[this.index];
    const star = team.squad[9];
    const key = playerTextureKey(team, star);
    ensurePlayerTexture(this, key, lookFor(team, star));
    this.rival.setTexture(key, 'stand');
    this.rivalName.setText(team.name);
  }
}
