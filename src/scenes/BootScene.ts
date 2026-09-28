import Phaser from 'phaser';
import { createGoalTextures, createPitchTexture } from '../art/pitch';
import { createPixelFont } from '../art/pixelFont';
import { createBallTextures, createStarTexture } from '../art/sprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createPixelFont(this);
    createBallTextures(this);
    createStarTexture(this);
    createPitchTexture(this);
    this.registry.set('goalLayers', createGoalTextures(this));
    this.scene.start('menu');
  }
}
