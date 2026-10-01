import Phaser from 'phaser';
import { isMuted, menu as menuSound, toggleMute } from '../audio/sfx';
import { PixelText } from '../art/PixelText';
import { VIEW_H, VIEW_W } from '../config';
import {
  applyEaglesResult,
  championId,
  createCup,
  eaglesAreOut,
  eaglesOpponent,
  fixtureDone,
  groupTable,
  involvesEagles,
  isComplete,
  isGroupRound,
  loadCup,
  openNextRound,
  pendingEaglesFixture,
  roundLabel,
  saveCup,
  teamName,
  type CupState,
  type Fixture,
  type GroupId,
  type PenScore,
  type RoundId,
} from '../cup/cup';
import { EAGLES_NING } from '../data/teams';
import { STRINGS } from '../strings';

const GOLD = 0xffd23a;
const EAGLES = EAGLES_NING.id;

interface CupData {
  goals?: [number, number];
  pens?: PenScore;
  showGroups?: boolean;
}

type Mode = 'groups' | 'round' | 'champion';

export class CupScene extends Phaser.Scene {
  private incoming: CupData = {};
  private cup!: CupState;
  private mode: Mode = 'groups';
  private page = 0;
  private round: RoundId | null = null;
  private back: Mode | null = null;
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private prompt: PixelText | null = null;
  private muteLabel!: PixelText;
  private muteShown = '';
  private onEnter!: (event: KeyboardEvent) => void;
  private onLeft!: (event: KeyboardEvent) => void;
  private onRight!: (event: KeyboardEvent) => void;
  private onG!: (event: KeyboardEvent) => void;
  private onMute!: (event: KeyboardEvent) => void;

  constructor() {
    super('cup');
  }

  init(data: CupData): void {
    this.incoming = data ?? {};
  }

  create(): void {
    const cup = loadCup();
    if (!cup) {
      this.scene.start('menu');
      return;
    }
    if (this.incoming.goals) {
      applyEaglesResult(cup, this.incoming.goals[0], this.incoming.goals[1], this.incoming.pens ?? null);
      this.incoming.goals = undefined;
    }
    this.cup = cup;
    this.page = 0;
    this.back = null;
    this.round = null;

    if (isComplete(cup)) this.mode = 'champion';
    else if (this.incoming.showGroups || !cup.fixtures.some((f) => f.round === 'r16')) this.mode = 'groups';
    else this.mode = 'round';

    const bg = this.add.graphics();
    for (let x = 0; x < VIEW_W; x += 32) {
      bg.fillStyle((x / 32) % 2 === 0 ? 0x16351a : 0x122e16);
      bg.fillRect(x, 0, 32, VIEW_H);
    }
    bg.fillStyle(0x0b0b14, 0.72);
    bg.fillRect(0, 0, VIEW_W, VIEW_H);
    this.muteLabel = new PixelText(this, 4, 4, STRINGS.sound, { color: GOLD });
    this.refreshMute();

    if (this.mode === 'round') {
      this.round = openNextRound(cup);
      if (!this.round) this.mode = 'champion';
    }
    this.render();

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([K.ENTER, K.SPACE, K.Z, K.LEFT, K.RIGHT, K.G, K.M]);
    const fresh = (fn: () => void) => (event: KeyboardEvent) => {
      if (!event.repeat) fn();
    };
    this.onEnter = fresh(() => this.confirm());
    this.onLeft = fresh(() => this.stepPage(-1));
    this.onRight = fresh(() => this.stepPage(1));
    this.onG = fresh(() => this.showGroups());
    this.onMute = fresh(() => {
      toggleMute();
      this.refreshMute();
    });
    kb.on('keydown-ENTER', this.onEnter);
    kb.on('keydown-SPACE', this.onEnter);
    kb.on('keydown-Z', this.onEnter);
    kb.on('keydown-LEFT', this.onLeft);
    kb.on('keydown-RIGHT', this.onRight);
    kb.on('keydown-G', this.onG);
    kb.on('keydown-M', this.onMute);
    this.events.once('shutdown', () => {
      kb.off('keydown-ENTER', this.onEnter);
      kb.off('keydown-SPACE', this.onEnter);
      kb.off('keydown-Z', this.onEnter);
      kb.off('keydown-LEFT', this.onLeft);
      kb.off('keydown-RIGHT', this.onRight);
      kb.off('keydown-G', this.onG);
      kb.off('keydown-M', this.onMute);
    });
  }

  update(time: number): void {
    try {
      this.prompt?.setVisible(Math.floor(time / 450) % 2 === 0);
      this.refreshMute();
    } catch {
      /* A label must not stop the cup. */
    }
  }

  private confirm(): void {
    if (this.mode === 'champion') {
      menuSound();
      const cup = createCup();
      saveCup(cup);
      this.cup = cup;
      this.mode = 'groups';
      this.page = 0;
      this.round = null;
      this.back = null;
      this.render();
      return;
    }
    if (this.mode === 'groups') {
      if (this.back === 'round' && this.round) {
        this.back = null;
        this.mode = 'round';
        this.render();
        return;
      }
      this.round = openNextRound(this.cup);
      this.mode = this.round ? 'round' : 'champion';
      this.back = null;
      this.render();
      return;
    }
    const pending = this.round ? pendingEaglesFixture(this.cup, this.round) : null;
    if (pending) {
      const opponent = eaglesOpponent(pending);
      if (!opponent) return;
      this.scene.start('match', {
        countryId: opponent,
        cup: true,
        knockout: !isGroupRound(pending.round),
      });
      return;
    }
    this.round = openNextRound(this.cup);
    this.mode = this.round ? 'round' : 'champion';
    this.render();
  }

  private stepPage(step: number): void {
    if (this.mode !== 'groups') return;
    this.page = (this.page + 2 + step) % 2;
    this.render();
  }

  private showGroups(): void {
    if (this.mode !== 'round') return;
    this.back = 'round';
    this.mode = 'groups';
    this.render();
  }

  private render(): void {
    for (const node of this.nodes) node.destroy();
    this.nodes = [];
    this.prompt = null;
    if (this.mode === 'champion') this.renderChampion();
    else if (this.mode === 'groups') this.renderGroups();
    else this.renderRound();
  }

  private addText(x: number, y: number, text: string, scale = 1, color = 0xffffff, align: 'left' | 'center' | 'right' = 'left'): PixelText {
    const node = new PixelText(this, x, y, text, { scale, color, align });
    this.nodes.push(node);
    return node;
  }

  private renderGroups(): void {
    this.addText(VIEW_W / 2, 2, STRINGS.groups, 2, GOLD, 'center');
    this.addText(VIEW_W / 2, 22, STRINGS.playedDiffPoints, 1, 0xffffff, 'center');
    const start = this.page * 4;
    for (let i = 0; i < 4; i++) {
      const group = this.cup.groups[start + i];
      const x = i % 2 === 0 ? 6 : 198;
      const y = i < 2 ? 36 : 112;
      this.drawGroup(x, y, group.id);
    }
    const hint = this.back ? STRINGS.enterBack : STRINGS.enterNext;
    this.addText(8, 190, STRINGS.moreGroups);
    this.prompt = this.addText(VIEW_W - 8, 190, hint, 1, GOLD, 'right');
  }

  private drawGroup(x: number, y: number, id: GroupId): void {
    const rows = groupTable(this.cup, id);
    const done = rows.every((row) => row.p === 3);
    this.addText(x, y, `Group ${id}`, 1, GOLD);
    rows.forEach((row, i) => {
      const mark = done && i < 2 ? '>' : ' ';
      const gd = String(row.gd).padStart(3, ' ');
      const line = `${mark}${row.name.padEnd(14, ' ')} ${row.p}${gd} ${String(row.pts).padStart(2, ' ')}`;
      const color = row.id === EAGLES ? GOLD : 0xffffff;
      this.addText(x, y + 10 + i * 10, line, 1, color);
    });
  }

  private renderRound(): void {
    const round = this.round;
    if (!round) {
      this.mode = 'champion';
      this.renderChampion();
      return;
    }
    this.addText(VIEW_W / 2, 2, roundLabel(round), 2, GOLD, 'center');
    let y = 22;
    const last = this.lastEaglesMatch();
    if (last && last.round !== round) {
      this.addText(8, y, `${STRINGS.lastScore}  ${this.scoreLine(last)}`, 1, involvesEagles(last) ? GOLD : 0xffffff);
      y += 12;
    }
    if (eaglesAreOut(this.cup) && !isGroupRound(round)) {
      this.addText(8, y, STRINGS.eaglesOut, 1, GOLD);
      y += 12;
    }
    const pending = pendingEaglesFixture(this.cup, round);
    const rows = this.cup.fixtures.filter((f) => f.round === round && f.homeId && f.awayId && f !== pending && fixtureDone(f));
    const step = rows.length > 10 ? 8 : 10;
    rows.forEach((f, i) => {
      const color = involvesEagles(f) ? GOLD : 0xffffff;
      this.addText(8, y + i * step, this.scoreLine(f), 1, color);
    });
    const foot = Math.min(Math.max(y + rows.length * step + 4, 156), 170);
    if (pending) {
      const opp = eaglesOpponent(pending);
      this.addText(VIEW_W / 2, foot, `${EAGLES_NING.name} ${STRINGS.vs} ${opp ? teamName(opp) : ''}`, 1, GOLD, 'center');
      this.prompt = this.addText(VIEW_W / 2, foot + 12, STRINGS.pressEnterToPlay, 2, GOLD, 'center');
    } else {
      this.prompt = this.addText(VIEW_W / 2, Math.min(foot + 8, 188), STRINGS.pressEnterToContinue, 1, GOLD, 'center');
    }
    this.addText(VIEW_W - 4, 4, `G ${STRINGS.groups}`, 1, 0xffffff, 'right');
  }

  private renderChampion(): void {
    const id = championId(this.cup);
    const name = id ? teamName(id) : '';
    this.addText(VIEW_W / 2, 48, name, 2, GOLD, 'center');
    this.addText(VIEW_W / 2, 78, STRINGS.champions, 3, GOLD, 'center');
    if (id === EAGLES) this.addText(VIEW_W / 2, 112, STRINGS.youWin, 2, 0xffffff, 'center');
    else if (eaglesAreOut(this.cup)) this.addText(VIEW_W / 2, 112, STRINGS.eaglesOut, 1, 0xffffff, 'center');
    this.prompt = this.addText(VIEW_W / 2, 160, STRINGS.newCupAgain, 1, GOLD, 'center');
  }

  private lastEaglesMatch(): Fixture | null {
    let last: Fixture | null = null;
    for (const f of this.cup.fixtures) {
      if (involvesEagles(f) && fixtureDone(f)) last = f;
    }
    return last;
  }

  private scoreLine(f: Fixture): string {
    const home = f.homeId ? teamName(f.homeId) : '';
    const away = f.awayId ? teamName(f.awayId) : '';
    if (f.homePens != null && f.awayPens != null && f.homeGoals === f.awayGoals) {
      return `${home} P${f.homePens}-${f.awayPens} ${away}`;
    }
    return `${home} ${f.homeGoals}-${f.awayGoals} ${away}`;
  }

  private refreshMute(): void {
    const text = isMuted() ? STRINGS.mute : STRINGS.sound;
    if (text === this.muteShown) return;
    this.muteShown = text;
    this.muteLabel.setText(text);
  }
}
