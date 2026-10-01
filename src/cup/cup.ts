/**
 * One World Cup: the draw, the tables, the bracket, and the save.
 * Other matches are scorelines. Eagle's Ning is the only team the player controls.
 */

import { allTeams, EAGLES_NING, findTeam } from '../data/teams';

const SAVE_KEY = 'starmansoccer-cup';

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export const ROUNDS = ['md1', 'md2', 'md3', 'r16', 'qf', 'sf', 'final'] as const;
export type RoundId = (typeof ROUNDS)[number];

export interface Fixture {
  id: string;
  round: RoundId;
  group: GroupId | null;
  homeId: string | null;
  awayId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
}

export interface CupGroup {
  id: GroupId;
  teamIds: [string, string, string, string];
}

export interface CupState {
  version: 1;
  groups: CupGroup[];
  /** Earlier in this list wins a tie on points, goal difference, and goals scored. */
  tieOrder: string[];
  fixtures: Fixture[];
}

export interface TableRow {
  id: string;
  name: string;
  p: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

const EAGLES = EAGLES_NING.id;

function emptyFixture(id: string, round: RoundId, group: GroupId | null, homeId: string | null, awayId: string | null): Fixture {
  return { id, round, group, homeId, awayId, homeGoals: null, awayGoals: null, homePens: null, awayPens: null };
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

export function createCup(): CupState {
  const ids = shuffle(allTeams().map((t) => t.id));
  const groups = GROUP_IDS.map((id, i) => ({
    id,
    teamIds: ids.slice(i * 4, i * 4 + 4) as [string, string, string, string],
  }));
  const fixtures: Fixture[] = [];
  for (const g of groups) {
    const [a, b, c, d] = g.teamIds;
    const rounds: [string, string][][] = [
      [[a, b], [c, d]],
      [[a, c], [b, d]],
      [[a, d], [b, c]],
    ];
    rounds.forEach((pairs, ri) => {
      const round = ROUNDS[ri];
      pairs.forEach(([home, away], j) => {
        fixtures.push(emptyFixture(`${g.id}-${round}-${j}`, round, g.id, home, away));
      });
    });
  }
  return { version: 1, groups, tieOrder: shuffle(ids), fixtures };
}

export function saveCup(cup: CupState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cup));
  } catch {
    /* A full browser store stays quiet. The match still ends. */
  }
}

export function loadCup(): CupState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const cup = JSON.parse(raw) as CupState;
    if (!cup || cup.version !== 1 || !Array.isArray(cup.groups) || cup.groups.length !== 8) return null;
    if (!Array.isArray(cup.fixtures) || !Array.isArray(cup.tieOrder)) return null;
    const ids = cup.groups.flatMap((g) => g.teamIds);
    if (ids.length !== 32 || new Set(ids).size !== 32) return null;
    if (!ids.includes(EAGLES)) return null;
    return cup;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadCup() !== null;
}

export function isGroupRound(round: RoundId): boolean {
  return round === 'md1' || round === 'md2' || round === 'md3';
}

export function involvesEagles(f: Fixture): boolean {
  return f.homeId === EAGLES || f.awayId === EAGLES;
}

export function fixtureDone(f: Fixture): boolean {
  if (f.homeGoals == null || f.awayGoals == null || !f.homeId || !f.awayId) return false;
  if (isGroupRound(f.round)) return true;
  return f.homeGoals !== f.awayGoals || (f.homePens != null && f.awayPens != null && f.homePens !== f.awayPens);
}

export function winnerId(f: Fixture): string | null {
  if (!fixtureDone(f) || !f.homeId || !f.awayId || f.homeGoals == null || f.awayGoals == null) return null;
  if (f.homeGoals > f.awayGoals) return f.homeId;
  if (f.awayGoals > f.homeGoals) return f.awayId;
  if (f.homePens == null || f.awayPens == null) return null;
  return f.homePens > f.awayPens ? f.homeId : f.awayId;
}

export function teamName(id: string): string {
  return findTeam(id).name;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function poisson(mean: number, rand: () => number): number {
  const u = rand();
  let p = Math.exp(-mean);
  let s = p;
  let g = 0;
  while (u > s && g < 6) {
    g += 1;
    p *= mean / g;
    s += p;
  }
  return g;
}

function scoreline(homeStr: number, awayStr: number, rand: () => number): [number, number] {
  const swing = (rand() - 0.5) * 36;
  const home = clamp(1.15 + (homeStr + swing - awayStr) / 40, 0.2, 3.4);
  const away = clamp(1.15 + (awayStr - swing - homeStr) / 40, 0.2, 3.4);
  return [poisson(home, rand), poisson(away, rand)];
}

function takePens(homeStr: number, awayStr: number, rand: () => number): [number, number] {
  let home = 0;
  let away = 0;
  const kick = (att: number, def: number) => rand() < clamp(0.62 + (att - def) / 250, 0.45, 0.82);
  for (let i = 0; i < 5; i++) {
    if (kick(homeStr, awayStr)) home += 1;
    if (kick(awayStr, homeStr)) away += 1;
    const homeLeft = 4 - i;
    const awayLeft = 4 - i;
    if (home > away + awayLeft || away > home + homeLeft) return [home, away];
  }
  for (let i = 0; i < 12 && home === away; i++) {
    const h = kick(homeStr, awayStr);
    const a = kick(awayStr, homeStr);
    if (h) home += 1;
    if (a) away += 1;
  }
  if (home === away) {
    if (homeStr === awayStr) home += 1;
    else if (homeStr > awayStr) home += 1;
    else away += 1;
  }
  return [home, away];
}

/** Writes a scoreline. Knockout draws also get a penalty winner. */
export function simulateFixture(f: Fixture, rand: () => number = Math.random): void {
  if (!f.homeId || !f.awayId || f.homeGoals != null) return;
  const [hg, ag] = scoreline(findTeam(f.homeId).strength, findTeam(f.awayId).strength, rand);
  f.homeGoals = hg;
  f.awayGoals = ag;
  f.homePens = null;
  f.awayPens = null;
  if (!isGroupRound(f.round) && hg === ag) {
    const [hp, ap] = takePens(findTeam(f.homeId).strength, findTeam(f.awayId).strength, rand);
    f.homePens = hp;
    f.awayPens = ap;
  }
}

export function groupTable(cup: CupState, groupId: GroupId): TableRow[] {
  const group = cup.groups.find((g) => g.id === groupId);
  if (!group) return [];
  const rows = new Map<string, TableRow>();
  for (const id of group.teamIds) {
    rows.set(id, { id, name: teamName(id), p: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }
  for (const f of cup.fixtures) {
    if (f.group !== groupId || f.homeGoals == null || f.awayGoals == null || !f.homeId || !f.awayId) continue;
    const home = rows.get(f.homeId);
    const away = rows.get(f.awayId);
    if (!home || !away) continue;
    home.p += 1;
    away.p += 1;
    home.gf += f.homeGoals;
    home.ga += f.awayGoals;
    away.gf += f.awayGoals;
    away.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) home.pts += 3;
    else if (f.homeGoals < f.awayGoals) away.pts += 3;
    else {
      home.pts += 1;
      away.pts += 1;
    }
  }
  for (const row of rows.values()) row.gd = row.gf - row.ga;
  return [...rows.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return cup.tieOrder.indexOf(a.id) - cup.tieOrder.indexOf(b.id);
  });
}

export function groupsComplete(cup: CupState): boolean {
  return cup.fixtures.filter((f) => isGroupRound(f.round)).every((f) => fixtureDone(f));
}

function ranking(cup: CupState, groupId: GroupId): string[] {
  return groupTable(cup, groupId).map((r) => r.id);
}

function fixturesOf(cup: CupState, round: RoundId): Fixture[] {
  return cup.fixtures.filter((f) => f.round === round);
}

export function progress(cup: CupState): void {
  if (groupsComplete(cup) && !cup.fixtures.some((f) => f.round === 'r16')) {
    const w = (g: GroupId) => ranking(cup, g)[0];
    const r = (g: GroupId) => ranking(cup, g)[1];
    const pairs: [string, string][] = [
      [w('A'), r('B')],
      [w('C'), r('D')],
      [w('E'), r('F')],
      [w('G'), r('H')],
      [w('B'), r('A')],
      [w('D'), r('C')],
      [w('F'), r('E')],
      [w('H'), r('G')],
    ];
    pairs.forEach(([home, away], i) => {
      cup.fixtures.push(emptyFixture(`r16-${i}`, 'r16', null, home, away));
    });
    for (let i = 0; i < 4; i++) cup.fixtures.push(emptyFixture(`qf-${i}`, 'qf', null, null, null));
    for (let i = 0; i < 2; i++) cup.fixtures.push(emptyFixture(`sf-${i}`, 'sf', null, null, null));
    cup.fixtures.push(emptyFixture('final-0', 'final', null, null, null));
  }
  const fill = (prev: RoundId, next: RoundId, pairs: [number, number][]) => {
    const source = fixturesOf(cup, prev);
    const dest = fixturesOf(cup, next);
    if (source.length === 0 || dest.length === 0) return;
    if (!source.every((f) => winnerId(f))) return;
    pairs.forEach(([a, b], i) => {
      const slot = dest[i];
      if (!slot || slot.homeId) return;
      slot.homeId = winnerId(source[a]);
      slot.awayId = winnerId(source[b]);
    });
  };
  fill('r16', 'qf', [[0, 1], [2, 3], [4, 5], [6, 7]]);
  fill('qf', 'sf', [[0, 1], [2, 3]]);
  fill('sf', 'final', [[0, 1]]);
}

/** The first round that still has a team waiting to play. */
export function firstIncompleteRound(cup: CupState): RoundId | null {
  for (const round of ROUNDS) {
    const list = fixturesOf(cup, round).filter((f) => f.homeId && f.awayId);
    if (list.length === 0) continue;
    if (list.some((f) => !fixtureDone(f))) return round;
  }
  return null;
}

export function simulateRoundExceptEagles(cup: CupState, round: RoundId): void {
  for (const f of fixturesOf(cup, round)) {
    if (!f.homeId || !f.awayId || fixtureDone(f) || involvesEagles(f)) continue;
    simulateFixture(f);
  }
}

export function pendingEaglesFixture(cup: CupState, round: RoundId): Fixture | null {
  return fixturesOf(cup, round).find((f) => f.homeId && f.awayId && involvesEagles(f) && !fixtureDone(f)) ?? null;
}

export function eaglesOpponent(f: Fixture): string | null {
  if (f.homeId === EAGLES) return f.awayId;
  if (f.awayId === EAGLES) return f.homeId;
  return null;
}

export interface PenScore {
  eagles: number;
  opponent: number;
}

/** Records Eagle's Ning's match. Knockout draws need the shootout score. */
export function applyEaglesResult(cup: CupState, goalsFor: number, goalsAgainst: number, pens: PenScore | null): void {
  progress(cup);
  const round = firstIncompleteRound(cup);
  if (!round) return;
  const f = pendingEaglesFixture(cup, round);
  if (!f || !f.homeId || !f.awayId) return;
  const home = f.homeId === EAGLES;
  f.homeGoals = home ? goalsFor : goalsAgainst;
  f.awayGoals = home ? goalsAgainst : goalsFor;
  if (pens && !isGroupRound(f.round)) {
    f.homePens = home ? pens.eagles : pens.opponent;
    f.awayPens = home ? pens.opponent : pens.eagles;
  }
  progress(cup);
  saveCup(cup);
}

export function isComplete(cup: CupState): boolean {
  const final = cup.fixtures.find((f) => f.round === 'final');
  return !!final && !!winnerId(final);
}

export function championId(cup: CupState): string | null {
  const final = cup.fixtures.find((f) => f.round === 'final');
  return final ? winnerId(final) : null;
}

export function eaglesAreOut(cup: CupState): boolean {
  if (!groupsComplete(cup)) return false;
  const ko = cup.fixtures.filter((f) => !isGroupRound(f.round) && involvesEagles(f));
  if (ko.length === 0) return true;
  return ko.every((f) => fixtureDone(f) && winnerId(f) !== EAGLES);
}

export function roundLabel(round: RoundId): string {
  switch (round) {
    case 'md1': return 'Matchday 1';
    case 'md2': return 'Matchday 2';
    case 'md3': return 'Matchday 3';
    case 'r16': return 'Round of 16';
    case 'qf': return 'Quarterfinal';
    case 'sf': return 'Semifinal';
    default: return 'Final';
  }
}

/** Opens the next unfinished round and writes every score that is not Eagle's Ning. */
export function openNextRound(cup: CupState): RoundId | null {
  progress(cup);
  const round = firstIncompleteRound(cup);
  if (!round) {
    saveCup(cup);
    return null;
  }
  simulateRoundExceptEagles(cup, round);
  progress(cup);
  saveCup(cup);
  return round;
}
