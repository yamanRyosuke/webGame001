import { VirtualStick } from './VirtualStick';

export interface InputState {
  movement: { x: number; z: number };
  jump: boolean;
  punch: boolean;
  jumpPressed: boolean;
  punchPressed: boolean;
}

export class InputManager {
  private static _instance: InputManager;
  
  private keys = new Set<string>();
  private inputState: InputState = {
    movement: { x: 0, z: 0 },
    jump: false,
    punch: false,
    jumpPressed: false,
    punchPressed: false
  };
  
  private previousInputState: InputState = {
    movement: { x: 0, z: 0 },
    jump: false,
    punch: false,
    jumpPressed: false,
    punchPressed: false
  };

  private virtualStick: VirtualStick | null = null;

  static get instance(): InputManager {
    if (!InputManager._instance) {
      InputManager._instance = new InputManager();
    }
    return InputManager._instance;
  }

  constructor() {
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupTouchEvents();
    this.createVirtualControls();
    
    // Clear any initial key state
    this.keys.clear();
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      e.preventDefault();
    });
  }

  private setupMouseEvents() {
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.inputState.punch = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.inputState.punch = false;
      }
    });
  }

  private setupTouchEvents() {
    // Touch events will be handled by virtual controls
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createVirtualControls() {
    if (!this.isMobile()) return;

    this.virtualStick = new VirtualStick();
    document.body.appendChild(this.virtualStick.getElement());
  }

  private isMobile(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  update() {
    // Store previous state BEFORE updating current state
    const prevJump = this.inputState.jump;
    const prevPunch = this.inputState.punch;

    // Update movement from keyboard
    this.updateMovementFromKeyboard();
    
    // Update movement from virtual stick
    if (this.virtualStick) {
      const stickInput = this.virtualStick.getInput();
      this.inputState.movement.x = stickInput.x;
      this.inputState.movement.z = stickInput.y;
    }

    // Update jump/punch from keyboard
    this.inputState.jump = this.keys.has('Space');
    this.inputState.punch = this.keys.has('KeyJ');

    // Update pressed states (for one-frame events)
    this.inputState.jumpPressed = this.inputState.jump && !prevJump;
    this.inputState.punchPressed = this.inputState.punch && !prevPunch;
    
  }

  private updateMovementFromKeyboard() {
    let x = 0;
    let z = 0;

    // WASD or Arrow keys
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;

    // Normalize diagonal movement
    if (x !== 0 && z !== 0) {
      x *= 0.707;
      z *= 0.707;
    }

    this.inputState.movement.x = x;
    this.inputState.movement.z = z;
  }

  getInputState(): InputState {
    return { ...this.inputState };
  }

  dispose() {
    if (this.virtualStick) {
      this.virtualStick.dispose();
      this.virtualStick = null;
    }
  }
}