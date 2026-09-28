import Phaser from 'phaser';
import { BALL_DECEL, GRAVITY, projectX, projectY } from '../config';
import type { Footballer } from './Footballer';

export class Ball {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  prevX = 0;
  owner: Footballer | null = null;
  lastTeam: 0 | 1 = 0;
  lastKicker: Footballer | null = null;
  intendedReceiver: Footballer | null = null;
  shotBy: Footballer | null = null;
  private roll = 0;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow-ball').setAlpha(0.35).setDepth(5);
    this.sprite = scene.add.sprite(0, 0, 'ball', '0').setOrigin(0.5, 1);
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.owner = null;
    this.intendedReceiver = null;
    this.shotBy = null;
  }

  kick(by: Footballer, vx: number, vy: number, vz: number): void {
    this.owner = null;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.lastTeam = by.team;
    this.lastKicker = by;
    this.intendedReceiver = null;
    this.shotBy = null;
  }

  /** Advance a loose ball by one substep. The caller keeps each substep short so nothing tunnels. */
  integrate(dt: number): void {
    this.prevX = this.x;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.z > 0 || this.vz !== 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -40) {
          this.vz = -this.vz * 0.45;
          this.vx *= 0.8;
          this.vy *= 0.8;
        } else {
          this.vz = 0;
        }
      }
    }
    const sp = this.speed;
    if (sp > 0) {
      const decel = this.z > 0 ? 8 : BALL_DECEL;
      const next = Math.max(0, sp - decel * dt);
      this.vx *= next / sp;
      this.vy *= next / sp;
    }
    this.roll += sp * dt;
  }

  sync(): void {
    const sx = Math.round(projectX(this.x, this.y));
    this.sprite.setPosition(sx, Math.round(projectY(this.y, this.z)) + 1);
    this.sprite.setFrame(Math.floor(this.roll / 6) % 2 === 0 ? '0' : '1');
    this.sprite.setDepth(20 + this.y + 0.3);
    this.shadow.setPosition(sx, Math.round(projectY(this.y, 0)));
  }
}
