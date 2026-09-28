import Phaser from 'phaser';
import { projectX, projectY } from '../config';
import type { Position, SquadPlayer } from '../data/teams';

export type Role = 'GK' | 'DF' | 'MF' | 'FW';
export type Side = 0 | 1;

function roleOf(position: Position): Role {
  switch (position) {
    case 'GK':
      return 'GK';
    case 'RB':
    case 'LB':
    case 'CB':
    case 'DF':
      return 'DF';
    case 'ST':
    case 'FW':
      return 'FW';
    default:
      return 'MF';
  }
}

export class Footballer {
  readonly role: Role;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  dirX = 1;
  dirY = 0;
  /** Formation spot as fractions of the team's own frame (0 = own goal line). */
  formU = 0;
  formV = 0;
  kickT = 0;
  noTouchT = 0;
  contactT = 0;
  diveT = 0;
  diveVy = 0;
  holdT = 0;
  /** Lunge time of a slide tackle, then time lying on the grass afterwards. */
  slideT = 0;
  downT = 0;
  slideDX = 1;
  slideDY = 0;
  slideResolved = false;
  /** Match time when this player last had the ball at his feet. */
  lastOwnedAt = -99;
  yellows = 0;
  sentOff = false;
  private animT = 0;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    textureKey: string,
    readonly team: Side,
    readonly slot: number,
    readonly info: SquadPlayer,
  ) {
    this.role = roleOf(info.position);
    this.shadow = scene.add.image(0, 0, 'shadow-player').setAlpha(0.3).setDepth(5);
    this.sprite = scene.add.sprite(0, 0, textureKey, 'stand').setOrigin(0.5, 0.95);
  }

  get isGK(): boolean {
    return this.role === 'GK';
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  distTo(x: number, y: number): number {
    return Math.hypot(this.x - x, this.y - y);
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
  }

  moveToward(tx: number, ty: number, speed: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) {
      this.stop();
      return;
    }
    const sp = Math.min(speed, d * 5);
    this.vx = (dx / d) * sp;
    this.vy = (dy / d) * sp;
  }

  face(dx: number, dy: number): void {
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    this.dirX = dx / d;
    this.dirY = dy / d;
    if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
  }

  get onGround(): boolean {
    return this.slideT > 0 || this.downT > 0;
  }

  startSlide(dx: number, dy: number, speed: number): void {
    const d = Math.hypot(dx, dy) || 1;
    this.slideDX = dx / d;
    this.slideDY = dy / d;
    this.face(this.slideDX, this.slideDY);
    this.slideT = 0.35;
    this.downT = 0;
    this.slideResolved = false;
    this.vx = this.slideDX * speed;
    this.vy = this.slideDY * speed;
  }

  integrate(dt: number): void {
    if (this.slideT > 0) {
      const decay = Math.max(0, 1 - 2.5 * dt);
      this.vx *= decay;
      this.vy *= decay;
      this.slideT -= dt;
      if (this.slideT <= 0) {
        this.slideT = 0;
        this.downT = 0.35;
      }
    } else if (this.downT > 0) {
      this.stop();
      this.downT = Math.max(0, this.downT - dt);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.speed > 4 && this.diveT <= 0 && !this.onGround) this.face(this.vx, this.vy);
    this.animT += dt * Math.max(0.5, this.speed / 45);
    this.kickT = Math.max(0, this.kickT - dt);
    this.noTouchT = Math.max(0, this.noTouchT - dt);
    this.diveT = Math.max(0, this.diveT - dt);
  }

  removeFromPitch(): void {
    this.sentOff = true;
    this.stop();
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
  }

  sync(): void {
    const sx = Math.round(projectX(this.x, this.y));
    const sy = Math.round(projectY(this.y, 0));
    let frame = 'stand';
    if (this.diveT > 0 || this.onGround) frame = 'dive';
    else if (this.kickT > 0) frame = 'kick';
    else if (this.speed > 8) frame = Math.floor(this.animT * 8) % 2 === 0 ? 'run1' : 'run2';
    this.sprite.setFrame(frame);
    this.sprite.setOrigin(0.5, frame === 'dive' ? 0.85 : 0.95);
    this.sprite.setFlipX(this.facing < 0);
    this.sprite.setPosition(sx, sy);
    this.sprite.setDepth(20 + this.y);
    this.shadow.setPosition(sx, sy);
  }

  /** Screen position of the top of the head, for the star marker and power bar. */
  headScreen(): { x: number; y: number } {
    return {
      x: Math.round(projectX(this.x, this.y)),
      y: Math.round(projectY(this.y, 0)) - 20,
    };
  }
}
