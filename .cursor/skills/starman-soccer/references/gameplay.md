# Match and controls

Side view, like International Superstar Soccer Deluxe. The player controls one teammate, marked with a star. Teammates without the ball make short supporting runs. The goalkeeper on the human team dives automatically.

## Pitch model

- Screen X runs from goal to goal. A second axis is depth, from the near sideline to the far one.
- Draw order follows depth. Jump height is not depth.
- The pitch is wider than the view. The camera scrolls on X and keeps the ball in frame.
- Internal resolution is 384×216, scaled by an integer with nearest-neighbor filtering.

## Human controls

| Key | Action |
| --- | --- |
| Arrow keys | Move |
| Z | Pass. Tap for a short ground pass. Hold for a stronger pass; a nearly full bar chips it. |
| X (with the ball) | Shoot. Hold to fill a power bar, release to kick. A tap is a soft shot. |
| X (without the ball) | Slide tackle in the arrow direction, or the way the player faces |
| C | Sprint |
| Space | Switch to the teammate nearest the ball |

Aim assist pulls a pass slightly toward a teammate so most passes arrive. The power bar must be visible while X or Z is held.

## Shots

- Power sets speed and arc together. A tap skims low and slow. Mid power is a low driven shot. Full power is fast and rises toward the bar, and can fly over it.
- Height is separate from depth: the ball has its own height, a shadow on the grass, and bounces.
- Direction at release: the arrow keys, or the facing direction if none are held. Pointing toward the goal (or just up or down in the attacking half) aims inside the posts; up or down picks a corner, otherwise the shot goes away from the keeper. Pointing backward, or up or down in the own half, kicks the ball that way.
- A small random error grows with power. The CPU's error is larger, so its shots often miss.
- The keeper saves shots that reach him low enough and close enough. High shots near the bar and shots placed wide of a diving keeper beat him.

## Ball against players

- The loose ball moves in substeps of at most 1.5 px, so no speed can skip a player, the keeper, a post, or the goal line.
- Every outfield player is a body column: radius 5, height 18. A ball above that flies over heads.
- A slow, low ball at a player's feet is controlled. The intended receiver of a pass can control a faster ball than anyone else.
- Any other ball that meets a body bounces off it, softer and slightly scattered. Off the legs it stays low, off the chest it pops up, off the head it loops. A blocked shot shows BLOCKED.
- The kicker cannot touch his own kick for a moment. The ball is pushed clear of a body so it never sticks inside one.

## Fouls and cards

- A clean slide or standing tackle wins or knocks away the ball. Light shoulder contact is never a foul.
- A foul is a slide that hits the player instead of the ball, a slide through the ball from behind, or a standing challenge that barges a running player from behind (only sometimes).
- A reckless foul is a slide from behind or one that arrives more than half a second after the ball has gone. It shows a yellow card with the offender's number and name. Ordinary fouls show only FOUL.
- A second yellow sends the player off for the rest of the match. His team plays on with ten; no substitute comes on.
- After a foul play stops and FOUL appears in large text. The fouled team takes a direct free kick on the spot, or a penalty if the foul was inside the offender's penalty area.
- Free kick: X shoots, Z passes. Penalty: the ball is on the spot, the keeper stands on his line, everyone else waits outside the box, and X or Z shoots. Either one is taken automatically after about 4.5 seconds if the child does nothing.
- The CPU slides rarely and mostly from the front, so most challenges are clean and cards are rare. Both teams can foul and be fouled.

## Clock and restarts

- One period of 3:00, counting down. At 0:00, stop play and show the score.
- Kickoff starts the match and follows every goal. A short pause, then play. No cutscene.
- Ball out of play: throw-in, goal kick, or corner, placed automatically. No offside.

## CPU for ages 7–9

- The CPU waits a beat before challenging and does not surround the ball carrier.
- Its shots are often off target. Its goalkeeper can be beaten by a placed shot.
- Eagle's Ning should be able to score more than once in a match without perfect inputs.

## Look

Pixel art, SNES-sized sprites, thick outlines, flat colors. Eagle's Ning wears a navy shirt, gold shorts, and white socks, with a star on the chest. Country kits are simple and original. Do not copy an official crest or a current national kit.

Show the score and the clock in large English text: `Eagle's Ning` and the country name.
