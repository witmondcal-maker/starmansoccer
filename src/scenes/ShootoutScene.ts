import Phaser from 'phaser';
import { goal, isMuted, shot, toggleMute, whistle } from '../audio/sfx';
import { PixelText } from '../art/PixelText';
import { VIEW_H, VIEW_W } from '../config';
import { eaglesOpponent, loadCup, pendingEaglesFixture, firstIncompleteRound, teamName } from '../cup/cup';
import { EAGLES_NING } from '../data/teams';
import { STRINGS } from '../strings';

const GOLD = 0xffd23a;
const AIM = [STRINGS.left, STRINGS.center, STRINGS.right];

/**
 * Five kicks each, then sudden death. Left, center, or right.
 * The same side as the keeper is a save. A tap of X shoots.
 */
export class ShootoutScene extends Phaser.Scene {
  private goals: [number, number] = [0, 0];
  private opponentId = '';
  private aim = 1;
  private eagles = 0;
  private cpu = 0;
  private eaglesTaken = 0;
  private cpuTaken = 0;
  private eaglesMarks: string[] = [];
  private cpuMarks: string[] = [];
  private phase: 'aim' | 'humanShow' | 'cpuWait' | 'cpuShow' | 'done' = 'aim';
  private wait = 0;
  private lastDive = 1;
  private aimText!: PixelText;
  private kickText!: PixelText;
  private info!: PixelText;
  private result!: PixelText;
  private marksText!: PixelText;
  private prompt!: PixelText;
  private muteLabel!: PixelText;
  private muteShown = '';
  private ball!: Phaser.GameObjects.Image;
  private keeper!: Phaser.GameObjects.Graphics;
  private left = false;
  private onLeft!: (event: KeyboardEvent) => void;
  private onRight!: (event: KeyboardEvent) => void;
  private onUp!: (event: KeyboardEvent) => void;
  private onDown!: (event: KeyboardEvent) => void;
  private onShoot!: (event: KeyboardEvent) => void;
  private onEnter!: (event: KeyboardEvent) => void;
  private onMute!: (event: KeyboardEvent) => void;

  constructor() {
    super('shootout');
  }

  init(data: { goals?: [number, number] }): void {
    this.goals = data.goals ?? [0, 0];
    this.aim = 1;
    this.eagles = 0;
    this.cpu = 0;
    this.eaglesTaken = 0;
    this.cpuTaken = 0;
    this.eaglesMarks = [];
    this.cpuMarks = [];
    this.phase = 'aim';
    this.wait = 0;
    this.left = false;
    const cup = loadCup();
    const round = cup ? firstIncompleteRound(cup) : null;
    const pending = cup && round ? pendingEaglesFixture(cup, round) : null;
    this.opponentId = (pending && eaglesOpponent(pending)) || '';
  }

  create(): void {
    if (!this.opponentId) {
      this.scene.start('cup');
      return;
    }
    const bg = this.add.graphics();
    bg.fillStyle(0x14331c);
    bg.fillRect(0, 0, VIEW_W, VIEW_H);
    bg.fillStyle(0x0b0b14, 0.35);
    bg.fillRect(0, 0, VIEW_W, VIEW_H);

    const goalX = 92;
    const goalY = 36;
    const goalW = 200;
    const goalH = 62;
    const posts = this.add.graphics();
    posts.fillStyle(0xf6f6f6);
    posts.fillRect(goalX, goalY, 4, goalH);
    posts.fillRect(goalX + goalW - 4, goalY, 4, goalH);
    posts.fillRect(goalX, goalY, goalW, 4);
    posts.fillStyle(0x1a1a1a, 0.35);
    for (let i = 1; i < 6; i++) posts.fillRect(goalX + 4, goalY + i * 10, goalW - 8, 1);
    this.keeper = this.add.graphics();
    this.ball = this.add.image(0, 0, 'ball').setScale(2);

    new PixelText(this, VIEW_W / 2, 4, STRINGS.penalties, { scale: 2, color: GOLD, align: 'center' });
    new PixelText(this, VIEW_W / 2, 104, `${EAGLES_NING.name} ${this.goals[0]}-${this.goals[1]} ${teamName(this.opponentId)}`, {
      align: 'center',
    });
    this.kickText = new PixelText(this, VIEW_W / 2, 116, '', { scale: 2, color: GOLD, align: 'center' });
    this.marksText = new PixelText(this, VIEW_W / 2, 140, '', { align: 'center' });
    this.aimText = new PixelText(this, VIEW_W / 2, 156, '', { scale: 2, color: GOLD, align: 'center' });
    this.info = new PixelText(this, VIEW_W / 2, 178, STRINGS.arrowsAim, { align: 'center' });
    this.result = new PixelText(this, VIEW_W / 2, 178, '', { scale: 2, align: 'center' });
    this.result.setVisible(false);
    this.prompt = new PixelText(this, VIEW_W / 2, 198, STRINGS.shoot, { color: GOLD, align: 'center' });
    this.muteLabel = new PixelText(this, 4, 4, STRINGS.sound, { color: GOLD });
    this.refreshMute();
    this.placeBall();
    this.drawKeeper(-1);
    this.refreshText();
    whistle();

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([K.LEFT, K.RIGHT, K.UP, K.DOWN, K.X, K.ENTER, K.SPACE, K.M]);
    const fresh = (fn: () => void) => (event: KeyboardEvent) => {
      if (!event.repeat) fn();
    };
    this.onLeft = fresh(() => this.cycle(-1));
    this.onRight = fresh(() => this.cycle(1));
    this.onUp = fresh(() => this.cycle(-1));
    this.onDown = fresh(() => this.cycle(1));
    this.onShoot = fresh(() => this.humanKick());
    this.onEnter = fresh(() => this.finish());
    this.onMute = fresh(() => {
      toggleMute();
      this.refreshMute();
    });
    kb.on('keydown-LEFT', this.onLeft);
    kb.on('keydown-RIGHT', this.onRight);
    kb.on('keydown-UP', this.onUp);
    kb.on('keydown-DOWN', this.onDown);
    kb.on('keydown-X', this.onShoot);
    kb.on('keydown-ENTER', this.onEnter);
    kb.on('keydown-SPACE', this.onEnter);
    kb.on('keydown-M', this.onMute);
    this.events.once('shutdown', () => {
      kb.off('keydown-LEFT', this.onLeft);
      kb.off('keydown-RIGHT', this.onRight);
      kb.off('keydown-UP', this.onUp);
      kb.off('keydown-DOWN', this.onDown);
      kb.off('keydown-X', this.onShoot);
      kb.off('keydown-ENTER', this.onEnter);
      kb.off('keydown-SPACE', this.onEnter);
      kb.off('keydown-M', this.onMute);
    });
  }

  update(_time: number, deltaMs: number): void {
    try {
      this.refreshMute();
      if (this.phase === 'aim' || this.phase === 'done') return;
      this.wait -= Math.min(deltaMs / 1000, 0.05);
      if (this.wait > 0) return;
      if (this.phase === 'humanShow') {
        if (this.shootoutOver()) this.declare();
        else this.beginCpu();
        return;
      }
      if (this.phase === 'cpuWait') {
        this.resolveCpu();
        return;
      }
      if (this.shootoutOver()) this.declare();
      else this.backToAim();
    } catch {
      /* A missed sound must not freeze the shootout. */
    }
  }

  private cycle(step: number): void {
    if (this.phase !== 'aim') return;
    this.aim = (this.aim + 3 + step) % 3;
    this.placeBall();
    this.refreshText();
  }

  private humanKick(): void {
    if (this.phase !== 'aim') return;
    const dive = Math.floor(Math.random() * 3);
    const scored = dive !== this.aim;
    shot(0.45 + this.aim * 0.2);
    if (scored) {
      this.eagles += 1;
      goal();
    }
    this.eaglesTaken += 1;
    this.eaglesMarks.push(scored ? 'G' : '-');
    this.lastDive = dive;
    this.phase = 'humanShow';
    this.wait = 0.75;
    this.drawKeeper(dive);
    this.showResult(scored);
  }

  private beginCpu(): void {
    this.phase = 'cpuWait';
    this.wait = 0.45;
    this.result.setVisible(false);
    this.prompt.setVisible(false);
    this.info.setVisible(true);
    this.info.setText(teamName(this.opponentId));
    this.drawKeeper(-1);
    this.refreshText();
  }

  private resolveCpu(): void {
    const aim = Math.floor(Math.random() * 3);
    const dive = Math.floor(Math.random() * 3);
    const scored = dive !== aim;
    shot(0.5);
    if (scored) {
      this.cpu += 1;
      goal();
    }
    this.cpuTaken += 1;
    this.cpuMarks.push(scored ? 'G' : '-');
    this.lastDive = dive;
    this.aim = aim;
    this.placeBall();
    this.drawKeeper(dive);
    this.phase = 'cpuShow';
    this.wait = 0.75;
    this.showResult(scored);
  }

  private backToAim(): void {
    this.phase = 'aim';
    this.aim = 1;
    this.result.setVisible(false);
    this.placeBall();
    this.drawKeeper(-1);
    this.refreshText();
  }

  private shootoutOver(): boolean {
    const eLeft = kicksLeft(this.eaglesTaken, this.cpuTaken, this.eagles, this.cpu);
    const cLeft = kicksLeft(this.cpuTaken, this.eaglesTaken, this.cpu, this.eagles);
    return this.eagles > this.cpu + cLeft || this.cpu > this.eagles + eLeft;
  }

  private declare(): void {
    this.phase = 'done';
    this.result.setVisible(true);
    this.result.setText(this.eagles > this.cpu ? STRINGS.youWin : STRINGS.teamWins(teamName(this.opponentId)));
    this.result.setColor(GOLD);
    this.info.setVisible(false);
    this.prompt.setText(STRINGS.pressEnterToContinue);
    this.prompt.setVisible(true);
    whistle();
  }

  private finish(): void {
    if (this.phase !== 'done' || this.left) return;
    this.left = true;
    this.scene.start('cup', {
      goals: this.goals,
      pens: { eagles: this.eagles, opponent: this.cpu },
      showGroups: false,
    });
  }

  private showResult(scored: boolean): void {
    this.info.setVisible(false);
    this.prompt.setVisible(false);
    this.result.setVisible(true);
    this.result.setText(scored ? STRINGS.goal : STRINGS.save);
    this.result.setColor(scored ? GOLD : 0xffffff);
    this.refreshText();
  }

  private refreshText(): void {
    const sudden = this.eaglesTaken >= 5 && this.cpuTaken >= 5 && this.eagles === this.cpu && this.phase === 'aim';
    const title = sudden ? STRINGS.suddenDeath : STRINGS.kicks;
    this.kickText.setText(`${title}  ${this.eagles}-${this.cpu}`);
    const mine = this.eaglesMarks.join(' ');
    const theirs = this.cpuMarks.join(' ');
    this.marksText.setText(`${mine}   ${theirs}`.trim());
    if (this.phase === 'aim') {
      this.aimText.setText(`${STRINGS.aim}  ${AIM[this.aim]}`);
      this.prompt.setText(STRINGS.shoot);
      this.prompt.setVisible(true);
      this.info.setText(STRINGS.arrowsAim);
      this.info.setVisible(true);
    } else if (this.phase === 'done' || this.phase === 'cpuWait') {
      this.aimText.setText('');
    } else {
      this.aimText.setText(`${STRINGS.keeper}  ${AIM[this.lastDive]}`);
    }
  }

  private placeBall(): void {
    const xs = [140, 192, 244];
    this.ball.setPosition(xs[this.aim], 78);
  }

  /** dive -1 hides the keeper in the middle, waiting. */
  private drawKeeper(dive: number): void {
    this.keeper.clear();
    const xs = [128, 180, 232];
    const x = dive < 0 ? 180 : xs[dive];
    this.keeper.fillStyle(0xf2c230);
    this.keeper.fillRect(x, 48, 22, 28);
    this.keeper.fillStyle(0x1a1a1a);
    this.keeper.fillRect(x + 4, 54, 14, 8);
    if (dive >= 0) this.aimText.setText(`${STRINGS.keeper}  ${AIM[dive]}`);
  }

  private refreshMute(): void {
    const text = isMuted() ? STRINGS.mute : STRINGS.sound;
    if (text === this.muteShown) return;
    this.muteShown = text;
    this.muteLabel.setText(text);
  }
}

function kicksLeft(taken: number, otherTaken: number, score: number, otherScore: number): number {
  if (taken < 5 || otherTaken < 5) return Math.max(0, 5 - taken);
  if (taken > otherTaken) return 0;
  if (taken < otherTaken) return 1;
  return score === otherScore ? 1 : 0;
}
