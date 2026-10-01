# Starman Soccer

Browser football game for a child aged 7–9, played on a desktop keyboard. The feel to copy is International Superstar Soccer Deluxe (SNES): side view, one controlled player, passes and shots. The game is a World Cup. Eagle's Ning plays its own matches. Every other fixture is a scoreline.

## Decisions already made

- One human versus the CPU. No local two-player mode.
- Desktop browser and keyboard only. No touch controls.
- Pixel art from the first playable build, chunky and readable, not realistic.
- Phaser 3, TypeScript, and Vite. No backend, accounts, or server.
- User interface copy is English. Keep strings in one module so they can be translated later.
- About 3 minutes, one period, then full time. A level knockout match goes to penalties. No extra time.
- 31 real countries plus Eagle's Ning. Every player name is fictional. Never use a real footballer's name or likeness.
- The player's team is Eagle's Ning. The squad is canonical in `.cursor/skills/starman-soccer/references/roster.md`.
- One cup is saved in the browser with localStorage. Continue restores that cup. Quitting during a match does not keep the unfinished match.

## The cup

32 teams in 8 groups of 4. Each team plays the others in the group once. Win 3, draw 1. Tiebreak: goal difference, then goals scored, then a random order stored in the save. The top 2 advance. Knockout: round of 16, quarterfinals, semifinals, final. Winners play runners-up from another group. No third-place match. The human only plays Eagle's Ning. After the final, show the champion and offer a new cup.

## A match is this

Kickoff, move, pass, shoot, slide tackle, goals, scoreboard, clock, and full time. When the ball leaves play, restart with a throw-in, goal kick, or corner. Fouls give a free kick, or a penalty inside the box. Reckless fouls show a yellow card; a second yellow sends the player off with no substitute. A level knockout match is a penalty shootout: X shoots, arrows aim, the keeper dives.

## Do not build until asked

Season, unlocks, shops, two-player, touch, offside, red cards for a single foul, substitutes, set-piece aiming beyond the normal pass and shot buttons, commentary, replays, and online play.

## How to work

- Before changing the match, controls, pitch, or squads, read `.cursor/skills/starman-soccer/SKILL.md` and the reference it points to.
- Keep teams and players in one data module. Do not copy the squad into a second list.
- After a change a player can see, run the game and verify it in the browser: start a match, pass, shoot, score, and reach full time.
- Pixel art stays sharp: nearest-neighbor scaling, integer scale, no blur.
