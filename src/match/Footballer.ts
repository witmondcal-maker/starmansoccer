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

  integrate(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.speed > 4 && this.diveT <= 0) this.face(this.vx, this.vy);
    this.animT += dt * Math.max(0.5, this.speed / 45);
    this.kickT = Math.max(0, this.kickT - dt);
    this.noTouchT = Math.max(0, this.noTouchT - dt);
    this.diveT = Math.max(0, this.diveT - dt);
  }

  sync(): void {
    const sx = Math.round(projectX(this.x, this.y));
    const sy = Math.round(projectY(this.y, 0));
    let frame = 'stand';
    if (this.diveT > 0) frame = 'dive';
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
