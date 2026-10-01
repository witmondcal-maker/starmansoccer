import Phaser from 'phaser';
import { bounce, goal, isMuted, pass, sendOff as sendOffSound, shot, toggleMute, whistle, yellowCard } from '../audio/sfx';
import { PixelText } from '../art/PixelText';
import { ensurePlayerTexture, lookFor, playerTextureKey } from '../art/sprites';
import {
  BALL_DECEL, BOX_LEN, BOX_Y0, BOX_Y1, GOAL_DEPTH, GOAL_H, GOAL_Y0, GOAL_Y1, GRAVITY, MATCH_SECONDS, PENALTY_SPOT,
  PITCH_D, PITCH_L, VIEW_H, VIEW_W, WORLD_SX_MAX, WORLD_SX_MIN, projectX,
} from '../config';
import { EAGLES_NING, findCountry, starters, type Kit, type Team } from '../data/teams';
import { Ball } from '../match/Ball';
import { Footballer, type Side } from '../match/Footballer';
import { STRINGS } from '../strings';

type MatchState = 'kickoff' | 'play' | 'dead' | 'restart' | 'goal' | 'fulltime';
type RestartKind = 'throwIn' | 'corner' | 'goalKick' | 'freeKick' | 'penalty';

interface PendingRestart {
  kind: RestartKind;
  team: Side;
  x: number;
  y: number;
  taker?: Footballer | null;
}

interface GoalLayers {
  back: { key: string; x: number; y: number };
  front: { key: string; x: number; y: number };
}

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'c', Phaser.Input.Keyboard.Key>;

/** 4-4-2 spots in the team's own frame: u from own goal line (fraction of length), v from its left touchline. */
const FORMATION: readonly [number, number][] = [
  [0.01, 0.5], // GK
  [0.2, 0.86], // RB
  [0.2, 0.14], // LB
  [0.17, 0.38], // CB
  [0.17, 0.62], // CB
  [0.33, 0.4], // CM
  [0.36, 0.86], // RM
  [0.33, 0.6], // CM
  [0.47, 0.42], // ST
  [0.47, 0.58], // ST
  [0.36, 0.14], // LM
];

const SPEED = {
  human: 74,
  sprint: 106,
  carry: 0.9,
  mate: 66,
  cpu: 60,
  cpuChase: 64,
  cpuCarry: 50,
  keeper: 62,
};

const TAP_TIME = 0.15;
const PASS_CHARGE = 0.6;
const SHOT_CHARGE = 0.9;
const GOAL_HALF = (GOAL_Y1 - GOAL_Y0) / 2;
/** Seconds a diving keeper stays down after reaching the ball's line. */
const DIVE_LIE = 0.3;
const GOLD = 0xffd23a;
const RED = 0xe8453c;

/** Ball against bodies: a player is a column this wide (ball radius included) and this tall. */
const BODY_R = 5;
const CONTROL_R = 7;
const BODY_H = 18;
/** Fastest loose ball an outfielder can trap; the intended receiver of a pass can take more. */
const TRAP_SPEED = 170;
const RECEIVE_SPEED = 330;
/** Longest distance a loose ball moves in one substep, so it cannot skip a body or a line. */
const SUBSTEP = 1.5;
const SLIDE_SPEED = 150;
const RESTART_WAIT_HUMAN = 4.5;

const clamp = Phaser.Math.Clamp;

function attackDir(team: Side): 1 | -1 {
  return team === 0 ? 1 : -1;
}

function ownGoalX(team: Side): number {
  return team === 0 ? 0 : PITCH_L;
}

function toU(team: Side, x: number): number {
  return team === 0 ? x : PITCH_L - x;
}

function toV(team: Side, y: number): number {
  return team === 0 ? y : PITCH_D - y;
}

function toWorld(team: Side, u: number, v: number): { x: number; y: number } {
  return team === 0 ? { x: u, y: v } : { x: PITCH_L - u, y: PITCH_D - v };
}

function other(team: Side): Side {
  return team === 0 ? 1 : 0;
}

export class MatchScene extends Phaser.Scene {
  private teams!: [Team, Team];
  private squads: [Footballer[], Footballer[]] = [[], []];
  private everyone: Footballer[] = [];
  private ball!: Ball;
  private controlled!: Footballer;
  private state: MatchState = 'kickoff';
  private stateT = 0;
  private timeLeft = MATCH_SECONDS;
  private score: [number, number] = [0, 0];
  private pending: PendingRestart | null = null;
  private restartKind: RestartKind = 'throwIn';
  private taker: Footballer | null = null;
  private kickoffTeam: Side = 0;
  private possession: Side | null = null;
  private zT = -1;
  private xT = -1;
  private cpuReactT = 0;
  private cpuDecideT = 0;
  private cpuKickoffPass = false;
  private cpuChaser: Footballer | null = null;
  private chaserPickT = 0;
  private elapsed = 0;
  private camX = 0;
  private keys!: Keys;
  private scoreText!: [PixelText, PixelText];
  private clockText!: PixelText;
  private banner!: PixelText;
  private bannerSub!: PixelText;
  private bannerT = 0;
  private playerLabel!: PixelText;
  private muteLabel!: PixelText;
  private muteShown = '';
  private cardIcon!: Phaser.GameObjects.Graphics;
  private cardLine!: PixelText;
  private cardName!: PixelText;
  private star!: Phaser.GameObjects.Image;
  private powerBar!: Phaser.GameObjects.Graphics;
  private bookings!: Phaser.GameObjects.Graphics;
  private cupMatch = false;
  private knockout = false;
  private leftMatch = false;

  constructor() {
    super('match');
  }

  init(data: { countryId?: string; cup?: boolean; knockout?: boolean }): void {
    this.cupMatch = !!data.cup;
    this.knockout = !!data.knockout;
    this.leftMatch = false;
    this.teams = [EAGLES_NING, findCountry(data.countryId ?? '')];
    this.squads = [[], []];
    this.everyone = [];
    this.state = 'kickoff';
    this.stateT = 0;
    this.timeLeft = MATCH_SECONDS;
    this.score = [0, 0];
    this.pending = null;
    this.taker = null;
    this.possession = null;
    this.zT = -1;
    this.xT = -1;
    this.cpuReactT = 0;
    this.cpuDecideT = 0;
    this.cpuKickoffPass = false;
    this.cpuChaser = null;
    this.chaserPickT = 0;
    this.elapsed = 0;
    this.bannerT = 0;
  }

  create(): void {
    this.add.image(WORLD_SX_MIN, 0, 'pitch').setOrigin(0, 0).setDepth(0);
    const goals = this.registry.get('goalLayers') as GoalLayers[];
    for (const g of goals) {
      this.add.image(g.back.x, g.back.y, g.back.key).setOrigin(0, 0).setDepth(20 + GOAL_Y0 - 0.5);
      this.add.image(g.front.x, g.front.y, g.front.key).setOrigin(0, 0).setDepth(20 + GOAL_Y1 + 0.5);
    }

    ([0, 1] as Side[]).forEach((side) => {
      const team = this.teams[side];
      starters(team).forEach((info, slot) => {
        const key = playerTextureKey(team, info);
        ensurePlayerTexture(this, key, lookFor(team, info));
        const f = new Footballer(this, key, side, slot, info);
        [f.formU, f.formV] = FORMATION[slot];
        this.squads[side].push(f);
        this.everyone.push(f);
      });
    });
    this.ball = new Ball(this);
    this.controlled = this.squads[0][9];

    this.star = this.add.image(0, 0, 'star').setDepth(900);
    this.powerBar = this.add.graphics().setDepth(910);
    this.bookings = this.add.graphics().setDepth(905);

    const cam = this.cameras.main;
    cam.setBounds(WORLD_SX_MIN, 0, WORLD_SX_MAX - WORLD_SX_MIN, VIEW_H);
    cam.setRoundPixels(true);

    this.createHud();

    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      c: K.C,
    }) as Keys;
    kb.addCapture([K.Z, K.X, K.SPACE, K.ENTER, K.M]);
    const fresh = (fn: () => void) => (event: KeyboardEvent) => {
      if (!event.repeat) fn();
    };
    const canAct = () => this.state === 'play' || this.state === 'restart';
    kb.on('keydown-Z', fresh(() => {
      if (canAct()) this.zT = 0;
    }));
    kb.on('keyup-Z', () => {
      if (this.zT < 0) return;
      const t = this.zT;
      this.zT = -1;
      if (canAct()) this.releasePass(t);
    });
    kb.on('keydown-X', fresh(() => {
      if (!canAct()) return;
      const c = this.controlled;
      if (this.state === 'play' && this.ball.owner !== c) {
        if (!c.onGround && !c.isGK) {
          const d = this.inputDir() ?? { x: c.dirX, y: c.dirY };
          c.startSlide(d.x, d.y, SLIDE_SPEED);
        }
        return;
      }
      this.xT = 0;
    }));
    kb.on('keyup-X', () => {
      if (this.xT < 0) return;
      const t = this.xT;
      this.xT = -1;
      if (canAct()) this.releaseShot(t);
    });
    kb.on('keydown-SPACE', fresh(() => {
      if (this.state === 'play' && this.ball.owner !== this.controlled) this.switchToNearest(true);
      else if (this.state === 'fulltime') this.leaveMatch();
    }));
    kb.on('keydown-ENTER', fresh(() => {
      if (this.state === 'fulltime') this.leaveMatch();
    }));
    kb.on('keydown-M', fresh(() => {
      toggleMute();
      this.refreshMute();
    }));

    this.setupKickoff(0);
    this.camX = projectX(this.ball.x, this.ball.y) - VIEW_W / 2;
    this.syncVisuals(0);
  }

  // ---------------------------------------------------------------- HUD

  private hud<T extends Phaser.GameObjects.GameObject & { setScrollFactor: (x: number, y?: number) => T; setDepth: (d: number) => T }>(
    obj: T,
    depth = 1000,
  ): T {
    obj.setScrollFactor(0, 0);
    obj.setDepth(depth);
    if (obj instanceof Phaser.GameObjects.Container) {
      obj.each((child: Phaser.GameObjects.GameObject) => {
        (child as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0, 0);
      });
    }
    return obj;
  }

  private drawSwatch(g: Phaser.GameObjects.Graphics, x: number, y: number, kit: Kit): void {
    g.fillStyle(0x000000);
    g.fillRect(x, y, 10, 9);
    g.fillStyle(kit.shirt);
    g.fillRect(x + 1, y + 1, 8, 5);
    g.fillStyle(kit.shorts);
    g.fillRect(x + 1, y + 6, 8, 2);
  }

  private createHud(): void {
    const bar = this.hud(this.add.graphics());
    bar.fillStyle(0x0b0b14, 0.88);
    bar.fillRect(0, 0, VIEW_W, 19);
    bar.fillStyle(GOLD);
    bar.fillRect(0, 19, VIEW_W, 1);
    this.drawSwatch(bar, 4, 5, this.teams[0].kit);
    this.drawSwatch(bar, VIEW_W - 14, 5, this.teams[1].kit);
    this.hud(new PixelText(this, 18, 6, this.teams[0].name, { color: GOLD }));
    this.hud(new PixelText(this, VIEW_W - 18, 6, this.teams[1].name, { align: 'right' }));
    this.scoreText = [
      this.hud(new PixelText(this, 150, 2, '0', { scale: 2, align: 'center', color: GOLD })),
      this.hud(new PixelText(this, 234, 2, '0', { scale: 2, align: 'center' })),
    ];
    this.clockText = this.hud(new PixelText(this, VIEW_W / 2, 2, '3:00', { scale: 2, align: 'center' }));
    this.banner = this.hud(new PixelText(this, VIEW_W / 2, 60, '', { scale: 3, align: 'center', color: GOLD }), 1001);
    this.bannerSub = this.hud(new PixelText(this, VIEW_W / 2, 88, '', { scale: 2, align: 'center' }), 1001);
    this.cardIcon = this.hud(this.add.graphics(), 1001).setVisible(false);
    this.cardLine = this.hud(new PixelText(this, VIEW_W / 2 + 10, 92, '', { scale: 2, align: 'center', color: GOLD }), 1001);
    this.cardName = this.hud(new PixelText(this, VIEW_W / 2, 114, '', { scale: 2, align: 'center' }), 1001);
    this.cardLine.setVisible(false);
    this.cardName.setVisible(false);
    this.hud(this.add.image(9, 207, 'star'));
    this.playerLabel = this.hud(new PixelText(this, 17, 204, ''));
    this.muteLabel = this.hud(new PixelText(this, VIEW_W - 4, 204, STRINGS.sound, { align: 'right', color: GOLD }));
    this.refreshMute();
  }

  private refreshMute(): void {
    try {
      const text = isMuted() ? STRINGS.mute : STRINGS.sound;
      if (text === this.muteShown) return;
      this.muteShown = text;
      this.muteLabel.setText(text);
    } catch {
      /* The label is optional. The match keeps running. */
    }
  }

  private showBanner(text: string, sub: string, seconds: number): void {
    this.banner.setText(text).setVisible(true);
    this.bannerSub.setText(sub).setVisible(sub.length > 0);
    this.bannerT = seconds;
    this.hideCard();
  }

  /** Big card notice under the FOUL banner. A second booking shows two yellow cards and SENT OFF. */
  private showCard(name: string, sentOff: boolean): void {
    const line = sentOff ? STRINGS.sentOff : STRINGS.yellowCard;
    this.cardLine.setText(line).setColor(sentOff ? RED : GOLD).setVisible(true);
    this.cardName.setText(name).setVisible(true);
    const g = this.cardIcon.clear().setVisible(true);
    const left = VIEW_W / 2 + 10 - (line.length * 12) / 2 - 18;
    const card = (x: number, y: number) => {
      g.fillStyle(0x0b0b14);
      g.fillRect(x - 1, y - 1, 12, 16);
      g.fillStyle(GOLD);
      g.fillRect(x, y, 10, 14);
      g.fillStyle(0xfff3a0);
      g.fillRect(x + 1, y + 1, 2, 5);
    };
    if (sentOff) {
      card(left - 5, 88);
      card(left, 91);
    } else {
      card(left, 90);
    }
  }

  private hideCard(): void {
    this.cardIcon.setVisible(false);
    this.cardLine.setVisible(false);
    this.cardName.setVisible(false);
  }

  private updateHud(dt: number): void {
    const secs = Math.max(0, Math.ceil(this.timeLeft));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.clockText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    this.scoreText[0].setText(String(this.score[0]));
    this.scoreText[1].setText(String(this.score[1]));
    this.playerLabel.setText(STRINGS.playerLabel(this.controlled.info.number, this.controlled.info.name));
    this.refreshMute();
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) {
        this.banner.setVisible(false);
        this.bannerSub.setVisible(false);
        this.hideCard();
      }
    }
  }

  // ---------------------------------------------------------------- Main loop

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.elapsed += dt;
    if (this.state === 'fulltime') {
      this.refreshMute();
      return;
    }

    this.stateT -= dt;
    switch (this.state) {
      case 'kickoff':
        if (this.stateT <= 0) this.state = 'play';
        break;
      case 'goal':
        if (this.stateT <= 0) this.setupKickoff(this.kickoffTeam);
        break;
      case 'dead':
        if (this.stateT <= 0) this.placeRestart();
        break;
      case 'play':
      case 'restart':
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.fullTime();
          this.syncVisuals(dt);
          return;
        }
        if (this.state === 'restart' && this.stateT <= 0 && this.taker) this.takeRestart(this.taker, null, 0.5, 'auto');
        break;
    }

    this.handleInput(dt);
    this.runAI(dt);
    for (const f of this.everyone) {
      f.integrate(dt);
      this.clampPlayer(f);
    }
    this.separate();
    if (this.state === 'play') this.resolveSlides();
    this.moveBall(dt);
    if (this.state === 'play') this.resolvePossession(dt);

    this.syncVisuals(dt);
  }

  // ---------------------------------------------------------------- Setup

  private kickoffSpot(f: Footballer): { x: number; y: number } {
    const u = f.isGK ? 8 : Math.min(f.formU * PITCH_L * 0.95, PITCH_L / 2 - 30);
    return toWorld(f.team, u, f.formV * PITCH_D);
  }

  private setupKickoff(team: Side): void {
    this.state = 'kickoff';
    this.stateT = 1.4;
    this.kickoffTeam = team;
    this.pending = null;
    this.taker = null;
    this.ball.place(PITCH_L / 2, PITCH_D / 2);
    for (const f of this.everyone) {
      const spot = this.kickoffSpot(f);
      f.x = spot.x;
      f.y = spot.y;
      f.stop();
      f.kickT = 0;
      f.noTouchT = 0;
      f.contactT = 0;
      f.diveT = 0;
      f.holdT = 0;
      f.slideT = 0;
      f.downT = 0;
      f.face(attackDir(f.team), 0);
    }
    const dir = attackDir(team);
    const centre = { x: PITCH_L / 2, y: PITCH_D / 2 };
    const kicker = this.bySlot(team, 9) ?? this.nearestOutfielder(team, centre.x, centre.y);
    kicker.x = PITCH_L / 2 - dir * 6;
    kicker.y = PITCH_D / 2;
    const partner = this.bySlot(team, 8) ?? this.nearestOutfielder(team, centre.x, centre.y, kicker);
    partner.x = PITCH_L / 2 - dir * 16;
    partner.y = PITCH_D / 2 - 16;
    this.ball.owner = kicker;
    this.ball.lastTeam = team;
    this.possession = team;
    if (team === 0) this.controlled = kicker;
    else this.switchToNearest(false);
    this.cpuKickoffPass = team === 1;
    this.cpuDecideT = 0.6;
    this.cpuReactT = 1.5;
    this.zT = -1;
    this.xT = -1;
    this.showBanner(STRINGS.kickOff, '', 1.4);
    whistle();
  }

  // ---------------------------------------------------------------- Human input

  private inputAxes(): { x: number; y: number } {
    const k = this.keys;
    return {
      x: (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0),
      y: (k.down.isDown ? 1 : 0) - (k.up.isDown ? 1 : 0),
    };
  }

  private inputDir(): { x: number; y: number } | null {
    const a = this.inputAxes();
    return a.x === 0 && a.y === 0 ? null : a;
  }

  private handleInput(dt: number): void {
    const active = this.state === 'play' || this.state === 'restart';
    if (!active) {
      this.zT = -1;
      this.xT = -1;
      return;
    }
    const k = this.keys;
    if (this.zT >= 0) this.zT += dt;
    if (this.xT >= 0) this.xT += dt;

    const a = this.inputAxes();
    const me = this.controlled;
    if (me.onGround) return;
    if (this.state === 'restart' && (this.taker === me || this.restartKind === 'penalty')) {
      me.stop();
      return;
    }
    let sp = k.c.isDown ? SPEED.sprint : SPEED.human;
    if (this.ball.owner === me) sp *= SPEED.carry;
    if (a.x !== 0 || a.y !== 0) {
      const d = Math.hypot(a.x, a.y);
      me.vx = (a.x / d) * sp;
      me.vy = (a.y / d) * sp * 0.85;
    } else {
      me.stop();
    }
  }

  private passPower(t: number): number {
    return t < TAP_TIME ? 0 : clamp((t - TAP_TIME) / PASS_CHARGE, 0, 1);
  }

  private shotPower(t: number): number {
    return t < TAP_TIME ? 0.2 : clamp(t / SHOT_CHARGE, 0.2, 1);
  }

  private releasePass(t: number): void {
    const c = this.controlled;
    if (this.state === 'restart') {
      if (this.taker === c) this.takeRestart(c, this.inputDir(), this.passPower(t), 'pass');
      return;
    }
    if (this.ball.owner !== c) return;
    this.passBall(c, this.inputDir() ?? { x: c.dirX, y: c.dirY }, this.passPower(t), null, 0);
  }

  private releaseShot(t: number): void {
    const c = this.controlled;
    if (this.state === 'restart') {
      if (this.taker === c) this.takeRestart(c, this.inputDir(), this.shotPower(t), 'shot');
      return;
    }
    if (this.ball.owner !== c) return;
    this.shoot(c, this.shotPower(t), this.inputDir(), true);
  }

  private switchToNearest(excludeCurrent: boolean): void {
    let best: Footballer | null = null;
    let bestD = Infinity;
    for (const f of this.squads[0]) {
      if (f.isGK || (excludeCurrent && f === this.controlled)) continue;
      const d = f.distTo(this.ball.x, this.ball.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (best) this.controlled = best;
  }

  // ---------------------------------------------------------------- Kicks

  private findPassTarget(p: Footballer, dx: number, dy: number): Footballer | null {
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    let best: Footballer | null = null;
    let bestScore = Infinity;
    for (const m of this.squads[p.team]) {
      if (m === p) continue;
      const ex = m.x - p.x;
      const ey = m.y - p.y;
      const dist = Math.hypot(ex, ey);
      if (dist < 14 || dist > 320) continue;
      const cos = (ex * nx + ey * ny) / dist;
      if (cos < 0.6 || (m.isGK && cos < 0.9)) continue;
      const score = Math.acos(clamp(cos, -1, 1)) * 140 + dist * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  /** Ground pass. With a target the speed is set so the ball arrives; aim assist snaps to the target's run. */
  private passBall(p: Footballer, dir: { x: number; y: number }, power: number, forced: Footballer | null, error: number): void {
    const b = this.ball;
    const len = Math.hypot(dir.x, dir.y) || 1;
    const nx = dir.x / len;
    const ny = dir.y / len;
    const target = forced ?? this.findPassTarget(p, nx, ny);
    const chip = power > 0.75;
    const vz = chip ? 70 + 240 * (power - 0.75) : power * 20;
    const loft = chip ? 0.8 : 1;
    if (target) {
      const dist0 = Math.hypot(target.x - b.x, target.y - b.y);
      const speed = loft * Math.min(360, Math.sqrt(45 * 45 + 2 * BALL_DECEL * dist0) * (1 + power * 0.3));
      const lead = dist0 / speed;
      const tx = target.x + target.vx * lead * 0.8;
      const ty = clamp(target.y + target.vy * lead * 0.8, 2, PITCH_D - 2);
      const ang = Math.atan2(ty - b.y, tx - b.x) + error;
      b.kick(p, Math.cos(ang) * speed, Math.sin(ang) * speed, vz);
      b.intendedReceiver = target;
    } else {
      const speed = loft * (120 + 170 * power);
      b.kick(p, nx * speed, ny * speed, vz);
    }
    p.face(b.vx, b.vy);
    p.kickT = 0.2;
    p.noTouchT = 0.3;
    pass();
  }

  /**
   * Power sets speed and arc: a tap is a soft skimming shot, a full charge is fast and rises towards the bar.
   * Pointing at the goal, or up/down in the attacking half, aims inside the posts (up/down picks a corner);
   * any other direction just blasts the ball that way.
   */
  private shoot(p: Footballer, power: number, dir: { x: number; y: number } | null, human: boolean): void {
    const b = this.ball;
    const d = dir ?? { x: p.dirX, y: p.dirY };
    const len = Math.hypot(d.x, d.y) || 1;
    const nx = d.x / len;
    const ny = d.y / len;
    const forward = nx * attackDir(p.team);
    const atGoal = !human || forward > 0.25 || (forward > -0.25 && toU(p.team, p.x) > PITCH_L / 2);
    let tx: number;
    let ty: number;
    if (atGoal) {
      tx = p.team === 0 ? PITCH_L + 1 : -1;
      if (!human) {
        ty = PITCH_D / 2 + (Math.random() * 2 - 1) * (GOAL_HALF + 10);
      } else if (Math.abs(ny) > 0.3) {
        ty = PITCH_D / 2 + Math.sign(ny) * (GOAL_HALF - 4);
      } else {
        const k = this.keeper(other(p.team));
        ty = PITCH_D / 2 + ((k?.y ?? PITCH_D / 2) <= PITCH_D / 2 ? 1 : -1) * (5 + Math.random() * 5);
      }
    } else {
      tx = b.x + nx * 150;
      ty = b.y + ny * 150;
    }
    const dx = tx - b.x;
    const dy = ty - b.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spread = human ? 0.015 + 0.03 * power : 0.08 + 0.1 * power;
    const ang = Math.atan2(dy, dx) + (Math.random() * 2 - 1) * spread;
    const speed = 170 + 230 * power;
    const t = dist / speed;
    let zAt = 1 + 19 * power * power;
    if (power > 0.85) zAt += Math.random() * 6;
    if (!human) zAt += Math.random() * 8;
    const vzCap = power <= 0.2 ? 30 : 25 + 145 * power * power;
    const vz = clamp((zAt + 0.5 * GRAVITY * t * t) / t, 0, vzCap);
    b.kick(p, Math.cos(ang) * speed, Math.sin(ang) * speed, vz);
    if (atGoal) b.shotBy = p;
    p.face(b.vx, b.vy);
    p.kickT = 0.25;
    p.noTouchT = 0.35;
    shot(power);
  }

  private teamPass(c: Footballer, backward: boolean): void {
    const dir = attackDir(c.team);
    let best: Footballer | null = null;
    let bestScore = -Infinity;
    for (const m of this.squads[c.team]) {
      if (m === c || m.isGK) continue;
      const d = m.distTo(c.x, c.y);
      if (d < 24 || d > 230) continue;
      const progress = (m.x - c.x) * dir;
      let open = 60;
      for (const o of this.squads[other(c.team)]) open = Math.min(open, o.distTo(m.x, m.y));
      const score = backward
        ? -Math.abs(d - 50) - Math.max(0, progress) + open * 0.5
        : progress * 0.4 + open - d * 0.1 + Math.random() * 25;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    if (!best) return;
    const error = c.team === 1 ? (Math.random() - 0.5) * 0.3 : 0;
    this.passBall(c, { x: best.x - c.x, y: best.y - c.y }, 0.1 + Math.random() * 0.3, best, error);
  }

  private keeperDistribute(k: Footballer): void {
    let best: Footballer | null = null;
    let bestScore = -Infinity;
    for (const m of this.squads[k.team]) {
      if (m.isGK) continue;
      const d = m.distTo(k.x, k.y);
      if (d < 50 || d > 280) continue;
      let open = 60;
      for (const o of this.squads[other(k.team)]) open = Math.min(open, o.distTo(m.x, m.y));
      const score = open + toU(k.team, m.x) * 0.05 + Math.random() * 15;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    const target = best ?? this.nearestOutfielder(k.team, PITCH_L / 2, PITCH_D / 2);
    this.passBall(k, { x: target.x - k.x, y: target.y - k.y }, 0.6, target, 0);
    k.holdT = 0;
  }

  // ---------------------------------------------------------------- AI

  private keeper(side: Side): Footballer | undefined {
    return this.squads[side].find((f) => f.isGK);
  }

  private bySlot(side: Side, slot: number): Footballer | undefined {
    return this.squads[side].find((f) => f.slot === slot);
  }

  private nearestOutfielder(team: Side, x: number, y: number, exclude: Footballer | null = null): Footballer {
    let best = this.squads[team].find((f) => !f.isGK && f !== exclude) ?? this.squads[team][0];
    let bestD = Infinity;
    for (const f of this.squads[team]) {
      if (f.isGK || f === exclude) continue;
      const d = f.distTo(x, y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  private formationTarget(f: Footballer): { x: number; y: number } {
    const b = this.ball;
    const attacking = this.possession === f.team;
    const bu = toU(f.team, b.x);
    let u = f.formU * PITCH_L * 0.85 + (bu - PITCH_L * 0.4) * 0.55 + (attacking ? 30 : -10);
    if (f.role === 'FW' && attacking) u += 30;
    let v = f.formV * PITCH_D + (toV(f.team, b.y) - PITCH_D / 2) * 0.3;
    if (attacking && this.state === 'play') {
      u += Math.sin(this.elapsed * 0.7 + f.slot) * 6;
      v += Math.sin(this.elapsed * 0.9 + f.slot * 1.7) * 8;
    }
    const [lo, hi] = f.role === 'DF' ? [0.06, 0.62] : f.role === 'MF' ? [0.14, 0.82] : [0.22, 0.92];
    u = clamp(u, lo * PITCH_L, hi * PITCH_L);
    v = clamp(v, 6, PITCH_D - 6);
    return toWorld(f.team, u, v);
  }

  private runAI(dt: number): void {
    const b = this.ball;
    if (this.state === 'kickoff') {
      for (const f of this.everyone) f.stop();
      return;
    }
    this.cpuReactT -= dt;
    this.chaserPickT -= dt;
    if (this.chaserPickT <= 0 || !this.cpuChaser) {
      this.cpuChaser = this.nearestOutfielder(1, b.x + b.vx * 0.25, b.y + b.vy * 0.25);
      this.chaserPickT = 0.4;
    }
    const humanActive = this.state === 'play' || this.state === 'restart';
    const helper = this.nearestOutfielder(0, b.x, b.y, this.controlled);

    for (const f of this.everyone) {
      if (f === this.controlled && humanActive) continue;
      if (f.onGround) continue;
      if (f.isGK) {
        this.keeperAI(f, dt);
        continue;
      }
      if (this.state === 'restart' && (f === this.taker || this.restartKind === 'penalty')) {
        f.stop();
        continue;
      }
      if (b.owner === f) {
        if (this.state !== 'play') f.stop();
        else if (f.team === 1) this.cpuCarrierAI(f, dt);
        else this.teamPass(f, false);
        continue;
      }
      this.fieldAI(f, helper, dt);
    }
  }

  private fieldAI(f: Footballer, helper: Footballer, dt: number): void {
    const b = this.ball;
    let { x: tx, y: ty } = this.formationTarget(f);
    let sp = f.team === 1 ? SPEED.cpu : SPEED.mate;

    if (this.state === 'play') {
      const owner = b.owner;
      if (!owner) {
        const px = b.x + b.vx * 0.3;
        const py = b.y + b.vy * 0.3;
        if (b.intendedReceiver === f) {
          tx = px;
          ty = py;
          sp *= 1.1;
        } else if (f.team === 1 && f === this.cpuChaser) {
          tx = px;
          ty = py;
          sp = SPEED.cpuChase;
        } else if (f.team === 0 && f === helper) {
          const mine = f.distTo(b.x, b.y);
          if (mine < 90 && mine < this.controlled.distTo(b.x, b.y) * 0.8) {
            tx = px;
            ty = py;
          }
        }
      } else if (owner.team !== f.team && !owner.isGK) {
        if (f.team === 1 && f === this.cpuChaser && this.cpuReactT <= 0) {
          tx = b.x + owner.vx * 0.15;
          ty = b.y;
          sp = clamp(owner.speed * 0.95, 40, SPEED.cpuChase);
          const gap = f.distTo(b.x, b.y);
          if (gap > 3 && gap < 18 && Math.random() < dt * 0.3) {
            const dx = b.x - f.x;
            const dy = b.y - f.y;
            if (!this.fromBehind(f, owner, dx, dy) || Math.random() < 0.15) {
              f.startSlide(dx, dy, SLIDE_SPEED);
              return;
            }
          }
        } else if (f.team === 0 && f === helper) {
          tx = owner.x - 22;
          ty = owner.y;
          sp = 58;
        }
      }
    }

    if ((this.state === 'restart' && this.taker && this.taker.team !== f.team) || this.state === 'dead') {
      const dx = tx - b.x;
      const dy = ty - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 30 && this.state === 'restart') {
        const s = d < 0.01 ? 1 : d;
        tx = b.x + (dx / s) * 30;
        ty = b.y + (dy / s) * 30;
      }
    }
    if (this.state === 'goal' || this.state === 'dead') sp *= 0.6;
    f.moveToward(tx, ty, sp);
  }

  private keeperAI(k: Footballer, dt: number): void {
    const b = this.ball;
    const own = ownGoalX(k.team);
    const dir = attackDir(k.team);
    if (b.owner === k) {
      k.stop();
      k.holdT += dt;
      if (this.state === 'play' && k.holdT > 1.0) this.keeperDistribute(k);
      return;
    }
    if (this.state === 'restart' && (this.taker === k || this.restartKind === 'penalty')) {
      k.stop();
      return;
    }
    if (k.diveT > 0) {
      k.vx = 0;
      k.vy = k.diveT > DIVE_LIE ? k.diveVy : 0;
      return;
    }
    let tx = own + dir * 8;
    let ty = clamp(PITCH_D / 2 + (b.y - PITCH_D / 2) * 0.45, GOAL_Y0 + 3, GOAL_Y1 - 3);
    let sp = SPEED.keeper * (k.team === 0 ? 1.1 : 0.9);
    if (this.state === 'play' && !b.owner) {
      const towardGoal = b.vx * dir < -40 && b.speed > 120;
      if (towardGoal) {
        const t = (k.x - b.x) / b.vx;
        if (t > 0 && t < (k.team === 0 ? 1.2 : 0.6)) {
          const py = b.y + b.vy * t;
          ty = clamp(py, GOAL_Y0 - 4, GOAL_Y1 + 4);
          if (Math.abs(py - k.y) > 5 && t < 0.3) {
            const diveSpeed = k.team === 0 ? 120 : 100;
            k.diveT = Math.min(0.45, Math.abs(py - k.y) / diveSpeed) + DIVE_LIE;
            k.diveVy = Math.sign(py - k.y) * diveSpeed;
            k.facing = dir;
            return;
          }
        }
      } else {
        const inBox = toU(k.team, b.x) < BOX_LEN - 10 && b.y > BOX_Y0 && b.y < BOX_Y1;
        if (inBox && b.speed < 140) {
          let nearest = true;
          const mine = k.distTo(b.x, b.y);
          for (const o of this.squads[other(k.team)]) if (o.distTo(b.x, b.y) < mine) nearest = false;
          if (nearest || mine < 25) {
            tx = b.x;
            ty = b.y;
            sp *= 1.1;
          }
        }
      }
    }
    k.moveToward(tx, ty, sp);
  }

  private cpuCarrierAI(c: Footballer, dt: number): void {
    let threat: Footballer | null = null;
    let threatD = Infinity;
    for (const h of this.squads[0]) {
      if (h.isGK) continue;
      const d = h.distTo(c.x, c.y);
      if (d < threatD) {
        threatD = d;
        threat = h;
      }
    }
    let ty = c.y + (PITCH_D / 2 - c.y) * 0.4;
    if (threat && threatD < 24 && threat.x < c.x + 4) ty += (c.y >= threat.y ? 1 : -1) * 24;
    c.moveToward(c.x - 60, clamp(ty, 8, PITCH_D - 8), SPEED.cpuCarry);

    this.cpuDecideT -= dt;
    if (this.cpuDecideT > 0) return;
    this.cpuDecideT = 0.5 + Math.random() * 0.7;
    if (this.cpuKickoffPass) {
      this.cpuKickoffPass = false;
      this.teamPass(c, true);
      return;
    }
    if (c.x < 150 && Math.random() < 0.55) {
      this.shoot(c, 0.4 + Math.random() * 0.45, null, false);
      return;
    }
    if (threatD < 22 && Math.random() < 0.6) {
      this.teamPass(c, false);
      return;
    }
    if (Math.random() < 0.15) this.teamPass(c, false);
  }

  // ---------------------------------------------------------------- Movement and ball

  private clampPlayer(f: Footballer): void {
    if (this.ball.owner === f && this.state === 'play') {
      f.x = clamp(f.x, 3, PITCH_L - 3);
      f.y = clamp(f.y, 2, PITCH_D - 2);
    } else {
      f.x = clamp(f.x, -24, PITCH_L + 24);
      f.y = clamp(f.y, -6, PITCH_D + 6);
    }
    if (f.isGK) {
      const u = clamp(toU(f.team, f.x), 2, BOX_LEN - 4);
      f.x = f.team === 0 ? u : PITCH_L - u;
      f.y = clamp(f.y, BOX_Y0, BOX_Y1);
    }
  }

  private separate(): void {
    const list = this.everyone;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const c = list[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= 6 || d < 0.001) continue;
        const push = (6 - d) * 0.25;
        const fixedA = a === this.taker || (a.isGK && this.ball.owner === a);
        const fixedC = c === this.taker || (c.isGK && this.ball.owner === c);
        if (!fixedA) {
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
        }
        if (!fixedC) {
          c.x += (dx / d) * push;
          c.y += (dy / d) * push;
        }
      }
    }
  }

  /** A loose ball moves in short substeps; each one checks bodies, keepers, posts and lines. */
  private moveBall(dt: number): void {
    const b = this.ball;
    const o = b.owner;
    if (!o) {
      const travel = Math.hypot(b.vx, b.vy, b.vz) * dt;
      const n = clamp(Math.ceil(travel / SUBSTEP), 1, 40);
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        if (b.integrate(h)) bounce();
        if (this.state === 'play') {
          if (this.ballContacts()) return;
          this.resolveKeepers();
          if (b.owner) return;
          this.checkBallOut();
        } else if (this.state === 'goal') {
          this.keepBallInNet();
        }
      }
      return;
    }
    o.lastOwnedAt = this.elapsed;
    b.prevX = b.x;
    if (o.isGK) {
      b.x = o.x + o.facing * 3;
      b.y = o.y + 0.5;
      b.z = 8;
    } else {
      const bob = this.state === 'play' && o.speed > 10 ? Math.sin(this.elapsed * 14) * 1.2 : 0;
      b.x = o.x + o.dirX * (5 + bob);
      b.y = o.y + o.dirY * 3 + 0.5;
      b.z = 0;
    }
    b.vx = o.vx;
    b.vy = o.vy;
    b.vz = 0;
  }

  // ---------------------------------------------------------------- Rules

  private gainPossession(f: Footballer): void {
    const b = this.ball;
    const prev = this.possession;
    b.owner = f;
    b.vx = 0;
    b.vy = 0;
    b.vz = 0;
    b.lastTeam = f.team;
    b.intendedReceiver = null;
    b.shotBy = null;
    f.holdT = 0;
    f.contactT = 0;
    this.possession = f.team;
    if (f.team === 0) {
      if (!f.isGK) this.controlled = f;
      if (prev !== 0) this.cpuReactT = 1.0;
    } else {
      if (prev !== 1) this.switchToNearest(false);
      this.cpuDecideT = 0.35 + Math.random() * 0.3;
    }
  }

  /** Standing tackle. Barging through a runner from behind is sometimes a foul (never a card). */
  private steal(by: Footballer, from: Footballer): void {
    const lunge = by.speed > 5 ? { x: by.vx, y: by.vy } : { x: from.x - by.x, y: from.y - by.y };
    if (from.speed > 20 && this.fromBehind(by, from, lunge.x, lunge.y) && Math.random() < (by.team === 0 ? 0.2 : 0.3)) {
      this.callFoul(by, from, false);
      return;
    }
    from.noTouchT = 0.8;
    from.contactT = 0;
    this.gainPossession(by);
  }

  /** True when the tackler comes from behind the victim's run and lunges the same way. */
  private fromBehind(tackler: Footballer, victim: Footballer, dx: number, dy: number): boolean {
    let mx = victim.vx;
    let my = victim.vy;
    if (Math.hypot(mx, my) < 20) {
      mx = victim.dirX;
      my = victim.dirY;
    }
    const m = Math.hypot(mx, my) || 1;
    const rx = victim.x - tackler.x;
    const ry = victim.y - tackler.y;
    const r = Math.hypot(rx, ry) || 1;
    const l = Math.hypot(dx, dy) || 1;
    const behind = (mx * rx + my * ry) / (m * r) > 0.55;
    const sameWay = (mx * dx + my * dy) / (m * l) > 0.2;
    return behind && sameWay;
  }

  private resolvePossession(dt: number): void {
    const b = this.ball;
    const owner = b.owner;
    if (owner) {
      if (owner.isGK) return;
      if (owner.team === 1) {
        const c = this.controlled;
        if (c.noTouchT <= 0 && !c.onGround && c.distTo(b.x, b.y) < 8) {
          c.contactT += dt;
          if (c.contactT > 0.12) this.steal(c, owner);
        } else {
          c.contactT = 0;
        }
      } else {
        const ch = this.cpuChaser;
        if (ch && this.cpuReactT <= 0 && ch.noTouchT <= 0 && !ch.onGround && ch.distTo(b.x, b.y) < 8) {
          ch.contactT += dt;
          const needed = owner.speed > 30 ? 1.3 : 1.0;
          if (ch.contactT > needed) {
            if (Math.random() < 0.4) this.steal(ch, owner);
            else ch.contactT = 0.2;
          }
        } else if (ch) {
          ch.contactT = 0;
        }
      }
      return;
    }

    // Outfielders take loose balls in ballContacts; keepers gather anything slow in their box here.
    for (const side of [0, 1] as Side[]) {
      const k = this.keeper(side);
      if (!k || k.noTouchT > 0) continue;
      const inBox = toU(side, b.x) < BOX_LEN && b.y > BOX_Y0 - 4 && b.y < BOX_Y1 + 4;
      const shotIncoming = b.vx * attackDir(side) < -40 && b.speed > 120;
      if (!inBox || shotIncoming || b.z > 18 || k.distTo(b.x, b.y) > 9) continue;
      this.gainPossession(k);
      return;
    }
  }

  /**
   * Loose ball against outfield bodies, every substep. A slow ball at the feet is controlled;
   * anything else that meets a body bounces off legs, chest or head, however fast it is.
   */
  private ballContacts(): boolean {
    const b = this.ball;
    if (b.z > BODY_H) return false;
    let hit: Footballer | null = null;
    let hitD = Infinity;
    for (const f of this.everyone) {
      if (f.isGK) continue;
      if (f === b.lastKicker && f.noTouchT > 0) continue;
      const d = f.distTo(b.x, b.y);
      if (d < CONTROL_R && d < hitD) {
        hit = f;
        hitD = d;
      }
    }
    if (!hit) return false;
    const limit = b.intendedReceiver === hit ? RECEIVE_SPEED : TRAP_SPEED;
    if (hit.noTouchT <= 0 && !hit.onGround && b.z < 9 && b.speed <= limit) {
      this.gainPossession(hit);
      return true;
    }
    if (hitD < BODY_R) this.deflect(hit);
    return false;
  }

  private deflect(f: Footballer): void {
    const b = this.ball;
    const s = b.speed || 1;
    const d = Math.hypot(b.x - f.x, b.y - f.y);
    const gx = d < 0.01 ? -b.vx / s : (b.x - f.x) / d;
    const gy = d < 0.01 ? -b.vy / s : (b.y - f.y) / d;
    // A player is arms and legs, not a smooth pole: even an edge hit mostly sends the ball back.
    let nx = gx * 0.4 - (b.vx / s) * 0.6;
    let ny = gy * 0.4 - (b.vy / s) * 0.6;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const vn = b.vx * nx + b.vy * ny;
    const blockedShot = b.shotBy !== null && vn < 0;
    if (vn < 0) {
      b.vx -= 1.3 * vn * nx;
      b.vy -= 1.3 * vn * ny;
      const scatter = (Math.random() - 0.5) * 0.7;
      const cs = Math.cos(scatter);
      const sn = Math.sin(scatter);
      const vx = (b.vx * cs - b.vy * sn) * 0.7;
      b.vy = (b.vx * sn + b.vy * cs) * 0.7;
      b.vx = vx;
      const impact = -vn;
      if (b.z < 7) b.vz = Math.max(0, b.vz * 0.3) + impact * 0.05;
      else if (b.z < 13) b.vz = 20 + impact * 0.1;
      else b.vz = 40 + impact * 0.15;
    }
    b.x = f.x + gx * (BODY_R + 0.5);
    b.y = f.y + gy * (BODY_R + 0.5);
    b.lastTeam = f.team;
    b.lastKicker = f;
    b.intendedReceiver = null;
    b.shotBy = null;
    f.noTouchT = Math.max(f.noTouchT, 0.15);
    if (blockedShot) this.showBanner(STRINGS.blocked, '', 0.7);
    bounce();
  }

  // ---------------------------------------------------------------- Slides, fouls and cards

  private resolveSlides(): void {
    const b = this.ball;
    for (const s of this.everyone) {
      if (s.slideT <= 0 || s.slideResolved) continue;
      const footX = s.x + s.slideDX * 6;
      const footY = s.y + s.slideDY * 6;
      const ballAtFoot = b.z < 6 && Math.hypot(b.x - footX, b.y - footY) < 8;
      const owner = b.owner;
      if (!owner && ballAtFoot) {
        s.slideResolved = true;
        this.knockBall(s);
        continue;
      }
      for (const o of this.squads[other(s.team)]) {
        if (o.isGK) continue;
        const bodyD = Math.min(o.distTo(s.x, s.y), o.distTo(footX, footY));
        const hasBall = owner === o;
        if (bodyD >= 6 && !(hasBall && ballAtFoot)) continue;
        s.slideResolved = true;
        const behind = this.fromBehind(s, o, s.slideDX, s.slideDY);
        if (hasBall && ballAtFoot && !behind) {
          if (bodyD < 3 && Math.random() < 0.3) this.callFoul(s, o, false);
          else this.knockBall(s);
        } else if (hasBall) {
          this.callFoul(s, o, behind);
        } else {
          const late = this.elapsed - o.lastOwnedAt;
          if (late > 0.25) this.callFoul(s, o, behind || late > 0.5);
        }
        break;
      }
      if (this.state !== 'play') return;
    }
  }

  /** Clean slide: the ball squirts on in the slide direction. */
  private knockBall(s: Footballer): void {
    const b = this.ball;
    const victim = b.owner;
    if (victim) {
      victim.noTouchT = 0.6;
      victim.contactT = 0;
    }
    const spread = (Math.random() - 0.5) * 0.6;
    const ang = Math.atan2(s.slideDY, s.slideDX) + spread;
    b.kick(s, Math.cos(ang) * 110, Math.sin(ang) * 110, 15);
    s.noTouchT = 0.3;
    this.possession = null;
  }

  private inOwnBox(team: Side, x: number, y: number): boolean {
    return toU(team, x) < BOX_LEN && y > BOX_Y0 && y < BOX_Y1;
  }

  /** Whistle: free kick where the foul happened, or a penalty if that was inside the offender's box. */
  private callFoul(offender: Footballer, victim: Footballer, reckless: boolean): void {
    const b = this.ball;
    const x = clamp(victim.x, 4, PITCH_L - 4);
    const y = clamp(victim.y, 3, PITCH_D - 3);
    b.owner = null;
    b.vx = 0;
    b.vy = 0;
    b.vz = 0;
    b.z = 0;
    b.intendedReceiver = null;
    b.shotBy = null;
    this.state = 'dead';
    this.pending = { kind: this.inOwnBox(offender.team, x, y) ? 'penalty' : 'freeKick', team: victim.team, x, y, taker: victim };
    this.possession = null;
    this.zT = -1;
    this.xT = -1;
    offender.noTouchT = 1;
    const label = STRINGS.playerLabel(offender.info.number, offender.info.name);
    if (reckless) {
      offender.yellows++;
      const off = offender.yellows >= 2;
      this.stateT = 2.6;
      this.showBanner(STRINGS.foul, '', this.stateT);
      this.showCard(label, off);
      if (off) this.sendOff(offender);
      whistle();
      if (off) sendOffSound();
      else yellowCard();
    } else {
      this.stateT = 1.4;
      this.showBanner(STRINGS.foul, label, this.stateT);
      whistle();
    }
  }

  /** Second yellow: the player leaves for the rest of the match and nobody replaces him. */
  private sendOff(f: Footballer): void {
    f.removeFromPitch();
    this.everyone = this.everyone.filter((p) => p !== f);
    this.squads[f.team] = this.squads[f.team].filter((p) => p !== f);
    if (this.ball.owner === f) this.ball.owner = null;
    if (this.ball.lastKicker === f) this.ball.lastKicker = null;
    if (this.cpuChaser === f) this.cpuChaser = null;
    if (this.controlled === f) this.switchToNearest(false);
  }

  private resolveKeepers(): void {
    const b = this.ball;
    if (b.owner) return;
    for (const side of [0, 1] as Side[]) {
      const k = this.keeper(side);
      if (!k) continue;
      if (b.vx * attackDir(side) >= -40 || b.speed < 120) continue;
      const crossed = b.prevX !== b.x && (b.prevX - k.x) * (b.x - k.x) <= 0;
      if (!crossed) continue;
      const dy = Math.abs(b.y - k.y);
      const diving = k.diveT > 0;
      const reachY = diving ? 13 : side === 0 ? 7 : 6;
      const reachZ = diving ? 15 : 19;
      if (dy > reachY || b.z > reachZ) continue;
      const chance =
        side === 0
          ? 0.85
          : clamp(1.0 - (b.speed - 160) / 300 - (dy > 7 ? 0.3 : 0) - (b.z > 14 ? 0.2 : 0), 0.12, 0.95);
      if (Math.random() < chance) this.keeperSave(k);
      return;
    }
  }

  private keeperSave(k: Footballer): void {
    const b = this.ball;
    if (b.speed < 250 || Math.random() < 0.45) {
      this.gainPossession(k);
      k.diveT = Math.min(k.diveT, 0.25);
    } else {
      b.x = k.x + attackDir(k.team) * 2;
      b.vx = -b.vx * 0.3;
      b.vy = (Math.random() - 0.5) * 140;
      b.vz = 70;
      b.lastTeam = k.team;
      b.lastKicker = k;
      b.shotBy = null;
      b.intendedReceiver = null;
      k.noTouchT = 0.4;
    }
    this.showBanner(STRINGS.save, '', 0.8);
  }

  private checkBallOut(): void {
    const b = this.ball;
    if (b.owner) return;
    for (const side of [0, 1] as Side[]) {
      const lineX = ownGoalX(side);
      const crossed = side === 0 ? b.x < 0 && b.prevX >= 0 : b.x > PITCH_L && b.prevX <= PITCH_L;
      const inside = side === 0 ? 0.5 : -0.5;
      if (crossed) {
        const nearPost = Math.abs(b.y - GOAL_Y0) < 1.8 || Math.abs(b.y - GOAL_Y1) < 1.8;
        const inMouth = b.y > GOAL_Y0 && b.y < GOAL_Y1;
        if (b.z < GOAL_H && nearPost) {
          b.x = lineX + inside;
          b.vx = -b.vx * 0.5;
          b.vy += b.y < PITCH_D / 2 ? -30 : 30;
          bounce();
          return;
        }
        if (inMouth && b.z >= GOAL_H - 1 && b.z <= GOAL_H + 2) {
          b.x = lineX + inside;
          b.vx = -b.vx * 0.4;
          b.vz = Math.abs(b.vz) * 0.4 + 30;
          bounce();
          return;
        }
        if (inMouth && b.z < GOAL_H - 1) {
          this.goalScored(other(side));
          return;
        }
      }
      const beyond = side === 0 ? b.x < -1 : b.x > PITCH_L + 1;
      if (beyond) {
        if (b.lastTeam === side) this.goOut('corner', other(side), b.x, b.y);
        else this.goOut('goalKick', side, b.x, b.y);
        return;
      }
    }
    if (b.y < -1.5 || b.y > PITCH_D + 1.5) {
      this.goOut('throwIn', other(b.lastTeam), clamp(b.x, 8, PITCH_L - 8), b.y < 0 ? 0 : PITCH_D);
    }
  }

  private goalScored(team: Side): void {
    this.score[team]++;
    this.state = 'goal';
    this.stateT = 2.4;
    this.kickoffTeam = other(team);
    this.possession = null;
    const scorer = this.ball.lastKicker;
    const name = scorer && scorer.team === team ? scorer.info.name : '';
    this.showBanner(STRINGS.goal, name, 2.4);
    goal();
  }

  private keepBallInNet(): void {
    const b = this.ball;
    const right = b.x > PITCH_L;
    const left = b.x < 0;
    if (!right && !left) return;
    const lineX = right ? PITCH_L : 0;
    const dir = right ? 1 : -1;
    const backX = lineX + dir * (GOAL_DEPTH - 2);
    if ((b.x - backX) * dir > 0) {
      b.x = backX;
      b.vx = -b.vx * 0.2;
    }
    if (b.y < GOAL_Y0 + 1 || b.y > GOAL_Y1 - 1) {
      b.y = clamp(b.y, GOAL_Y0 + 1, GOAL_Y1 - 1);
      b.vy = 0;
    }
    if (b.z > GOAL_H - 2) {
      b.z = GOAL_H - 2;
      b.vz = -Math.abs(b.vz) * 0.3;
    }
  }

  private goOut(kind: RestartKind, team: Side, x: number, y: number): void {
    this.state = 'dead';
    this.stateT = 0.9;
    this.pending = { kind, team, x, y };
    this.possession = null;
    this.ball.intendedReceiver = null;
    this.showBanner(STRINGS[kind], '', 1.2);
  }

  private placeRestart(): void {
    const p = this.pending;
    if (!p) {
      this.state = 'play';
      return;
    }
    const dir = attackDir(p.team);
    let tx: number;
    let ty: number;
    let taker: Footballer;
    const fouled = p.taker && !p.taker.sentOff && !p.taker.isGK ? p.taker : null;
    if (p.kind === 'freeKick') {
      tx = p.x;
      ty = p.y;
      taker = fouled ?? this.nearestOutfielder(p.team, tx, ty);
      taker.face(ownGoalX(other(p.team)) - tx, PITCH_D / 2 - ty);
    } else if (p.kind === 'penalty') {
      const goalX = ownGoalX(other(p.team));
      // The taker stands behind the spot; the ball sits at his feet, on the spot.
      tx = goalX - dir * (PENALTY_SPOT + 5);
      ty = PITCH_D / 2 - 0.5;
      taker = fouled ?? this.nearestOutfielder(p.team, tx, ty);
      taker.face(dir, 0);
      const k = this.keeper(other(p.team));
      if (k) {
        k.x = goalX - dir * 3;
        k.y = PITCH_D / 2;
        k.stop();
        k.diveT = 0;
        k.face(-dir, 0);
      }
      for (const f of this.everyone) {
        if (f === taker || f.isGK) continue;
        const side = other(p.team);
        if (toU(side, f.x) < BOX_LEN + 6) {
          f.x = toWorld(side, BOX_LEN + 12 + Math.random() * 24, 0).x;
          f.stop();
        }
      }
    } else if (p.kind === 'goalKick') {
      taker = this.keeper(p.team) ?? this.nearestOutfielder(p.team, ownGoalX(p.team), PITCH_D / 2);
      tx = ownGoalX(p.team) + dir * 22;
      ty = PITCH_D / 2 + (p.y < PITCH_D / 2 ? -14 : 14);
      taker.face(dir, 0);
    } else if (p.kind === 'corner') {
      const goalX = ownGoalX(other(p.team));
      tx = goalX - dir * 1;
      ty = p.y < PITCH_D / 2 ? 1 : PITCH_D - 1;
      taker = this.nearestOutfielder(p.team, tx, ty);
      taker.face(-dir * 0.6, PITCH_D / 2 - ty);
    } else {
      tx = p.x;
      ty = p.y <= 0 ? -1 : PITCH_D + 1;
      taker = this.nearestOutfielder(p.team, tx, ty);
      taker.face(dir * 0.4, ty < 0 ? 1 : -1);
    }
    taker.x = tx;
    taker.y = ty;
    taker.stop();
    taker.holdT = 0;
    this.ball.place(tx, ty);
    this.ball.owner = taker;
    this.ball.lastTeam = p.team;
    this.possession = p.team;
    this.moveBall(0);

    for (const f of this.squads[other(p.team)]) {
      if (f.isGK) continue;
      const dx = f.x - tx;
      const dy = f.y - ty;
      const d = Math.hypot(dx, dy);
      if (d < 30) {
        const s = d < 0.01 ? 1 : d;
        f.x = tx + ((d < 0.01 ? -dir : dx) / s) * 30;
        f.y = clamp(ty + (dy / s) * 30, 0, PITCH_D);
      }
    }

    this.restartKind = p.kind;
    this.taker = taker;
    this.pending = null;
    this.state = 'restart';
    const humanTakes = p.team === 0 && !taker.isGK;
    this.stateT = humanTakes ? RESTART_WAIT_HUMAN : p.kind === 'penalty' ? 1.6 : 1.3;
    if (humanTakes) this.controlled = taker;
    else if (p.team === 1) this.switchToNearest(false);
    this.zT = -1;
    this.xT = -1;
    if (p.kind === 'freeKick' || p.kind === 'penalty') this.showBanner(STRINGS[p.kind], '', 1.2);
  }

  /** `auto` means the wait ran out and the restart takes itself. */
  private takeRestart(t: Footballer, dir: { x: number; y: number } | null, power: number, mode: 'pass' | 'shot' | 'auto'): void {
    const b = this.ball;
    const adir = attackDir(t.team);
    const human = t.team === 0;
    if (this.restartKind === 'penalty') {
      const aim = dir ?? (human ? { x: adir, y: 0 } : { x: adir, y: Math.random() < 0.5 ? -1 : 1 });
      this.shoot(t, mode === 'shot' ? Math.max(power, 0.3) : 0.45, aim, human);
    } else if (this.restartKind === 'freeKick') {
      const nearGoal = PITCH_L - toU(t.team, t.x) < 220;
      if (mode === 'shot') this.shoot(t, power, dir, human);
      else if (mode === 'pass') this.passBall(t, dir ?? { x: t.dirX, y: t.dirY }, power, null, 0);
      else if (nearGoal) this.shoot(t, 0.7, { x: adir, y: 0 }, human);
      else this.teamPass(t, false);
    } else if (this.restartKind === 'goalKick') {
      this.keeperDistribute(t);
    } else if (this.restartKind === 'corner') {
      if (dir) {
        this.passBall(t, dir, Math.max(power, 0.5), null, 0);
      } else {
        const spotX = ownGoalX(other(t.team)) - adir * 55;
        let best: Footballer | null = null;
        let bestD = Infinity;
        for (const m of this.squads[t.team]) {
          if (m === t || m.isGK) continue;
          const d = m.distTo(spotX, PITCH_D / 2);
          if (d < bestD) {
            bestD = d;
            best = m;
          }
        }
        if (best) this.passBall(t, { x: best.x - t.x, y: best.y - t.y }, 0.6, best, 0);
        else this.passBall(t, { x: spotX - t.x, y: PITCH_D / 2 - t.y }, 0.6, null, 0);
      }
    } else {
      const d = dir ?? { x: adir * 0.4, y: t.y < 0 ? 1 : -1 };
      this.passBall(t, d, Math.min(power, 0.4), null, 0);
      const sp = b.speed;
      if (sp > 200) {
        b.vx *= 200 / sp;
        b.vy *= 200 / sp;
      }
      b.z = 10;
      b.vz = 30;
    }
    t.noTouchT = 0.5;
    this.taker = null;
    this.state = 'play';
    this.stateT = 0;
  }

  private fullTime(): void {
    this.state = 'fulltime';
    for (const f of this.everyone) f.stop();
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.zT = -1;
    this.xT = -1;
    this.banner.setVisible(false);
    this.bannerSub.setVisible(false);
    this.bannerT = 0;
    whistle(true);

    const panel = this.hud(this.add.graphics(), 1100);
    panel.fillStyle(0x0b0b14, 0.9);
    panel.fillRect(62, 50, 260, 116);
    panel.fillStyle(GOLD);
    panel.fillRect(62, 50, 260, 1);
    panel.fillRect(62, 165, 260, 1);
    panel.fillRect(62, 50, 1, 116);
    panel.fillRect(321, 50, 1, 116);

    const [home, away] = this.teams;
    const [a, c] = this.score;
    const levelKnockout = this.knockout && a === c;
    const result = levelKnockout ? STRINGS.penalties : a > c ? STRINGS.youWin : a === c ? STRINGS.draw : STRINGS.teamWins(away.name);
    const leave = levelKnockout ? STRINGS.pressEnterForPenalties : this.cupMatch ? STRINGS.pressEnterToContinue : STRINGS.pressEnterForMenu;
    this.hud(new PixelText(this, VIEW_W / 2, 60, STRINGS.fullTime, { scale: 3, color: GOLD, align: 'center' }), 1101);
    this.hud(new PixelText(this, VIEW_W / 2, 94, `${home.name} ${a} - ${c} ${away.name}`, { align: 'center' }), 1101);
    this.hud(new PixelText(this, VIEW_W / 2, 112, result, { scale: 2, align: 'center', color: a >= c ? GOLD : 0xffffff }), 1101);
    this.hud(new PixelText(this, VIEW_W / 2, 146, leave, { align: 'center' }), 1101);
  }

  private leaveMatch(): void {
    if (this.leftMatch || this.state !== 'fulltime') return;
    this.leftMatch = true;
    if (!this.cupMatch) {
      this.scene.start('menu');
      return;
    }
    const goals: [number, number] = [this.score[0], this.score[1]];
    if (this.knockout && goals[0] === goals[1]) this.scene.start('shootout', { goals });
    else this.scene.start('cup', { goals, showGroups: !this.knockout });
  }

  // ---------------------------------------------------------------- Drawing

  private syncVisuals(dt: number): void {
    for (const f of this.everyone) f.sync();
    this.ball.sync();

    const c = this.controlled;
    const head = c.headScreen();
    this.star.setPosition(head.x, head.y - 6 + Math.round(Math.sin(this.elapsed * 6) * 1.5));
    this.star.setDepth(900);
    this.star.setVisible(this.state !== 'fulltime');

    this.bookings.clear();
    for (const f of this.everyone) {
      if (f.yellows === 0 || f.onGround || f.diveT > 0) continue;
      const h = f.headScreen();
      this.bookings.fillStyle(0x0b0b14);
      this.bookings.fillRect(h.x + 4, h.y - 1, 4, 5);
      this.bookings.fillStyle(GOLD);
      this.bookings.fillRect(h.x + 5, h.y, 2, 3);
    }

    this.powerBar.clear();
    const holding = this.ball.owner === c || this.taker === c;
    if ((this.xT >= 0 || this.zT >= 0) && holding && (this.state === 'play' || this.state === 'restart')) {
      const isShot = this.xT >= 0;
      const p = isShot ? clamp(this.xT / SHOT_CHARGE, 0, 1) : this.passPower(this.zT);
      const x0 = head.x - 10;
      const y0 = head.y - 19;
      this.powerBar.fillStyle(0x0b0b14);
      this.powerBar.fillRect(x0 - 1, y0 - 1, 22, 5);
      this.powerBar.fillStyle(0x4a4a5a);
      this.powerBar.fillRect(x0, y0, 20, 3);
      const color = !isShot ? 0x4aa8ff : p < 0.5 ? 0x5ad84a : p < 0.85 ? GOLD : 0xe8453c;
      this.powerBar.fillStyle(color);
      this.powerBar.fillRect(x0, y0, Math.max(1, Math.round(20 * p)), 3);
    }

    const b = this.ball;
    const target = projectX(b.x, b.y) + clamp(b.vx * 0.25, -50, 50) - VIEW_W / 2;
    this.camX += (target - this.camX) * Math.min(1, dt * 5);
    this.camX = clamp(this.camX, WORLD_SX_MIN, WORLD_SX_MAX - VIEW_W);
    this.cameras.main.scrollX = Math.round(this.camX);

    this.updateHud(dt);
  }
}
