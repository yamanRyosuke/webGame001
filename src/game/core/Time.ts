export class Time {
  private static _instance: Time;
  
  private _deltaTime = 0;
  private _lastFrameTime = 0;
  private _timeScale = 1;
  private _totalTime = 0;

  static get instance(): Time {
    if (!Time._instance) {
      Time._instance = new Time();
    }
    return Time._instance;
  }

  update(currentTime: number) {
    this._deltaTime = (currentTime - this._lastFrameTime) / 1000;
    this._lastFrameTime = currentTime;
    this._totalTime += this._deltaTime;
  }

  get deltaTime(): number {
    return this._deltaTime * this._timeScale;
  }

  get totalTime(): number {
    return this._totalTime;
  }

  get timeScale(): number {
    return this._timeScale;
  }

  set timeScale(value: number) {
    this._timeScale = Math.max(0, value);
  }
}