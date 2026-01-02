import { Time } from './Time';

export class GameLoop {
  private isRunning = false;
  private animationId: number | null = null;
  private updateCallback: (deltaTime: number) => void = () => {};
  private renderCallback: () => void = () => {};

  constructor() {
    this.loop = this.loop.bind(this);
  }

  setUpdateCallback(callback: (deltaTime: number) => void) {
    this.updateCallback = callback;
  }

  setRenderCallback(callback: () => void) {
    this.renderCallback = callback;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.loop(performance.now());
  }

  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop(currentTime: number) {
    if (!this.isRunning) return;

    Time.instance.update(currentTime);
    
    this.updateCallback(Time.instance.deltaTime);
    this.renderCallback();

    this.animationId = requestAnimationFrame(this.loop);
  }
}