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
| Z | Pass. Tap for a short ground pass. Hold for a stronger pass. |
| X | Shoot. Hold to fill a power bar, release to kick. A tap still shoots. |
| C | Sprint |
| Space | Switch to the teammate nearest the ball |

Aim assist pulls a pass slightly toward a teammate so most passes arrive. The power bar must be visible while X is held.

## Clock and restarts

- One period of 3:00, counting down. At 0:00, stop play and show the score.
- Kickoff starts the match and follows every goal. A short pause, then play. No cutscene.
- Ball out of play: throw-in, goal kick, or corner, placed automatically. No fouls, offside, or cards.

## CPU for ages 7–9

- The CPU waits a beat before challenging and does not surround the ball carrier.
- Its shots are often off target. Its goalkeeper can be beaten by a placed shot.
- Eagle's Ning should be able to score more than once in a match without perfect inputs.

## Look

Pixel art, SNES-sized sprites, thick outlines, flat colors. Eagle's Ning wears a navy shirt, gold shorts, and white socks, with a star on the chest. Country kits are simple and original. Do not copy an official crest or a current national kit.

Show the score and the clock in large English text: `Eagle's Ning` and the country name.
