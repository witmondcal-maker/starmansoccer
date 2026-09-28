---
name: starman-soccer
description: Implements and changes Starman Soccer, a desktop browser football game in the style of International Superstar Soccer Deluxe (Phaser 3, TypeScript, Vite). Use when building or changing the match, controls, pitch, pixel art, CPU, scoreboard, kickoff, teams, country squads, or Eagle's Ning. Also use when the user mentions o jogo, elenco, passe, chute, partida, or seleção.
---

# Starman Soccer

## Before editing

1. Read [gameplay.md](references/gameplay.md) for the match, controls, and what a 7–9 year old must be able to do.
2. Read [roster.md](references/roster.md) before adding or renaming a player or team.
3. Stay inside the v1 list in `AGENTS.md`. If a request is on the "do not build yet" list, say so and wait.

## Implementation order

Build the playable loop before polish:

1. Boot, menu (Eagle's Ning versus one of the 16 countries), and an empty match scene at 384×216 with pixel art scaling.
2. Pitch, ball, and both teams in a 4-4-2 side view. Camera follows the ball.
3. Human control: move, pass, shoot. Then sprint and switch player.
4. CPU that passes and shoots, slowly enough that a child can win.
5. Goals, English scoreboard, 3:00 clock, restarts when the ball leaves play, full time.

## Verify

When a playable build exists, run the dev server and check in the browser:

- Start a match as Eagle's Ning against any country.
- Pass to a teammate and shoot. A charged shot shows a power bar.
- A goal updates the score and restarts from kickoff.
- The clock reaches full time and shows the result.
- Sprites stay sharp when the window is scaled. Text is English and large enough to read.
