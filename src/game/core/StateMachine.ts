import { GameState } from './GameState';

export class StateMachine {
  private currentState: GameState = GameState.Boot;
  private stateHandlers = new Map<GameState, StateHandler>();

  constructor() {
    this.setupValidTransitions();
  }

  private setupValidTransitions() {
    // Boot → Title (loading complete)
    // Title → Play (start game)
    // Play → Result (game over/clear)
    // Result → Play (retry)
    // Result → Title (back to title)
  }

  addStateHandler(state: GameState, handler: StateHandler) {
    this.stateHandlers.set(state, handler);
  }

  getCurrentState(): GameState {
    return this.currentState;
  }

  transitionTo(newState: GameState) {
    if (!this.canTransitionTo(newState)) {
      console.warn(`Invalid transition from ${this.currentState} to ${newState}`);
      return;
    }

    const oldHandler = this.stateHandlers.get(this.currentState);
    if (oldHandler?.onExit) {
      oldHandler.onExit();
    }

    this.currentState = newState;

    const newHandler = this.stateHandlers.get(this.currentState);
    if (newHandler?.onEnter) {
      newHandler.onEnter();
    }
  }

  private canTransitionTo(newState: GameState): boolean {
    const validTransitions: Record<GameState, GameState[]> = {
      [GameState.Boot]: [GameState.Title],
      [GameState.Title]: [GameState.Play],
      [GameState.Play]: [GameState.Result],
      [GameState.Result]: [GameState.Play, GameState.Title]
    };

    return validTransitions[this.currentState]?.includes(newState) || false;
  }

  update(deltaTime: number) {
    const handler = this.stateHandlers.get(this.currentState);
    if (handler?.update) {
      handler.update(deltaTime);
    }
  }

  render() {
    const handler = this.stateHandlers.get(this.currentState);
    if (handler?.render) {
      handler.render();
    }
  }
}

export interface StateHandler {
  onEnter?: () => void;
  onExit?: () => void;
  update?: (deltaTime: number) => void;
  render?: () => void;
}