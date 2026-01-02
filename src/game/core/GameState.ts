export enum GameState {
  Boot = 'boot',
  Title = 'title',
  Play = 'play',
  Result = 'result'
}

export type StateTransition = {
  from: GameState;
  to: GameState;
};