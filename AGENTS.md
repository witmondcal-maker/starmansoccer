# Starman Soccer

Browser football game for a child aged 7–9, played on a desktop keyboard. The feel to copy is International Superstar Soccer Deluxe (SNES): side view, one controlled player, passes and shots. The first version is a single match. Nothing else.

## Decisions already made

- One human versus the CPU. No local two-player mode.
- Desktop browser and keyboard only. No touch controls.
- Pixel art from the first playable build, chunky and readable, not realistic.
- Phaser 3, TypeScript, and Vite. No backend, accounts, or server.
- User interface copy is English. Keep strings in one module so they can be translated later.
- About 3 minutes, one period, then full time.
- Opponents: 16 real countries. Every player name is fictional. Never use a real footballer's name or likeness.
- The player's team is Eagle's Ning. The squad is canonical in `.cursor/skills/starman-soccer/references/roster.md`.

## v1 is only this

A menu to pick a country, then a match: kickoff, move, pass, shoot, slide tackle, goals, scoreboard, clock, and full time. When the ball leaves play, restart with a throw-in, goal kick, or corner. Fouls give a free kick, or a penalty inside the box. Reckless fouls show a yellow card; a second yellow sends the player off with no substitute.

## Do not build until asked

Tournament, cup, season, saves, unlocks, shops, two-player, touch, offside, red cards for a single foul, substitutes, set-piece aiming beyond the normal pass and shot buttons, commentary, replays, and online play.

## How to work

- Before changing the match, controls, pitch, or squads, read `.cursor/skills/starman-soccer/SKILL.md` and the reference it points to.
- Keep teams and players in one data module. Do not copy the squad into a second list.
- After a change a player can see, run the game and verify it in the browser: start a match, pass, shoot, score, and reach full time.
- Pixel art stays sharp: nearest-neighbor scaling, integer scale, no blur.
