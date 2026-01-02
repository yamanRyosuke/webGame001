export class HUD {
  private hudElement!: HTMLElement;
  private timeDisplay!: HTMLElement;
  private creatureDisplay!: HTMLElement;
  private debugPanel!: HTMLElement;
  private speedSlider!: HTMLInputElement;
  private speedValue!: HTMLElement;
  private meteorSpeedSlider!: HTMLInputElement;
  private meteorSpeedValue!: HTMLElement;
  private meteorFreqSlider!: HTMLInputElement;
  private meteorFreqValue!: HTMLElement;
  
  private onSpeedChange?: (speed: number) => void;
  private onMeteorSpeedChange?: (speed: number) => void;
  private onMeteorFreqChange?: (freq: number) => void;
  
  constructor() {
    this.createHUD();
  }

  private createHUD() {
    this.hudElement = document.createElement('div');
    this.hudElement.id = 'game-hud';
    this.hudElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 18px;
      font-weight: bold;
    `;

    // Time display (top left)
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px 15px;
      border-radius: 5px;
    `;
    this.timeDisplay.textContent = '01:00';

    // Creature count (top right)
    this.creatureDisplay = document.createElement('div');
    this.creatureDisplay.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px 15px;
      border-radius: 5px;
    `;
    this.creatureDisplay.textContent = '3/3';

    // Debug panel (bottom left)
    this.createDebugPanel();

    this.hudElement.appendChild(this.timeDisplay);
    this.hudElement.appendChild(this.creatureDisplay);
    this.hudElement.appendChild(this.debugPanel);

    document.body.appendChild(this.hudElement);
  }

  updateTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    // Warning color when time is low
    if (seconds < 10) {
      this.timeDisplay.style.color = '#ff4444';
    } else {
      this.timeDisplay.style.color = 'white';
    }
  }

  updateCreatures(alive: number, total: number = 3) {
    this.creatureDisplay.textContent = `${alive}/${total}`;
    
    // Warning color when creatures are low
    if (alive <= 1) {
      this.creatureDisplay.style.color = '#ff4444';
    } else {
      this.creatureDisplay.style.color = 'white';
    }
  }

  show() {
    this.hudElement.style.display = 'block';
  }

  hide() {
    this.hudElement.style.display = 'none';
  }

  private createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 8px;
      pointer-events: auto;
      min-width: 200px;
    `;

    // Panel title
    const title = document.createElement('div');
    title.textContent = 'Debug Controls';
    title.style.cssText = `
      font-size: 14px;
      margin-bottom: 10px;
      color: #ccc;
    `;

    // Speed control container
    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    `;

    // Speed label
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed:';
    speedLabel.style.cssText = `
      font-size: 12px;
      color: white;
      min-width: 50px;
    `;

    // Speed slider
    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '1';
    this.speedSlider.max = '10';
    this.speedSlider.value = '4';
    this.speedSlider.step = '0.5';
    this.speedSlider.style.cssText = `
      flex: 1;
      height: 6px;
      background: #333;
      border-radius: 3px;
      outline: none;
    `;

    // Speed value display
    this.speedValue = document.createElement('span');
    this.speedValue.textContent = '4.0';
    this.speedValue.style.cssText = `
      font-size: 12px;
      color: #4299e1;
      min-width: 30px;
      font-family: monospace;
    `;

    // Event listener for slider
    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = value.toFixed(1);
      if (this.onSpeedChange) {
        this.onSpeedChange(value);
      }
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(this.speedSlider);
    speedContainer.appendChild(this.speedValue);

    // Meteor speed control
    const meteorSpeedContainer = this.createSliderControl(
      'Meteor Speed:',
      '5', '20', '12', '0.5',
      (value) => {
        const numValue = parseFloat(value);
        this.meteorSpeedValue.textContent = numValue.toFixed(1);
        if (this.onMeteorSpeedChange) {
          this.onMeteorSpeedChange(numValue);
        }
      }
    );
    this.meteorSpeedSlider = meteorSpeedContainer.slider;
    this.meteorSpeedValue = meteorSpeedContainer.valueDisplay;

    // Meteor frequency control (note: higher value = slower spawning)
    const meteorFreqContainer = this.createSliderControl(
      'Meteor Freq:',
      '0.3', '3.0', '1.0', '0.1',
      (value) => {
        const numValue = parseFloat(value);
        this.meteorFreqValue.textContent = numValue.toFixed(1);
        if (this.onMeteorFreqChange) {
          this.onMeteorFreqChange(numValue);
        }
      }
    );
    this.meteorFreqSlider = meteorFreqContainer.slider;
    this.meteorFreqValue = meteorFreqContainer.valueDisplay;

    this.debugPanel.appendChild(title);
    this.debugPanel.appendChild(speedContainer);
    this.debugPanel.appendChild(meteorSpeedContainer.container);
    this.debugPanel.appendChild(meteorFreqContainer.container);
  }

  private createSliderControl(label: string, min: string, max: string, value: string, step: string, onChange: (value: string) => void) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    `;

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      font-size: 12px;
      color: white;
      min-width: 80px;
    `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.step = step;
    slider.style.cssText = `
      flex: 1;
      height: 6px;
      background: #333;
      border-radius: 3px;
      outline: none;
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.cssText = `
      font-size: 12px;
      color: #4299e1;
      min-width: 30px;
      font-family: monospace;
    `;

    slider.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      onChange(val);
    });

    container.appendChild(labelElement);
    container.appendChild(slider);
    container.appendChild(valueDisplay);

    return { container, slider, valueDisplay };
  }

  setSpeedChangeCallback(callback: (speed: number) => void) {
    this.onSpeedChange = callback;
  }

  setMeteorSpeedChangeCallback(callback: (speed: number) => void) {
    this.onMeteorSpeedChange = callback;
  }

  setMeteorFreqChangeCallback(callback: (freq: number) => void) {
    this.onMeteorFreqChange = callback;
  }

  dispose() {
    if (this.hudElement.parentNode) {
      document.body.removeChild(this.hudElement);
    }
  }
}