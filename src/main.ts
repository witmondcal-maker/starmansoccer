import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { MatchScene } from './scenes/MatchScene';

/** Largest whole-number scale that fits. Only a window smaller than 384×216 gets a fractional shrink. */
function integerZoom(): number {
  const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  return fit >= 1 ? Math.floor(fit) : fit;
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0b14',
  physics: { default: 'arcade' },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: integerZoom(),
  },
  scene: [BootScene, MenuScene, MatchScene],
});

window.addEventListener('resize', () => game.scale.setZoom(integerZoom()));

if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
