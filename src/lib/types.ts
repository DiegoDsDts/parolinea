export type GameMode = 'config' | 'challenge' | 'loading' | 'play' | 'finished' | 'recap';
export type ActiveTab = 'game' | 'info' | 'settings';
export type FeedbackType = 'word-valid' | 'word-duplicate' | 'word-invalid' | null;
export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';
export type WordQuantityMode = 'random' | 'low' | 'medium' | 'high';

export interface StartGameOptions {
  wordQuantityMode?: WordQuantityMode;
}

export interface GameConfig {
  'grid-size': string;
  'min-word-length': number;
  'duration-sec': number;
  letters: string;
  from?: GameConfigFrom;
}

export interface GameChallengeFrom {
  played: true;
  name: string;
  points: number;
}

export interface GameConfigFrom {
  played?: boolean;
  name?: string;
  points?: number;
}

export interface BoardCell {
  id: string;
  letter: string;
}

export interface WordItem {
  word: string;
  score: number;
  found?: boolean;
  displayScore?: string;
}

export interface DictionaryStatus {
  ready: boolean;
  loading: boolean;
  error: string | null;
  wordsLoaded: number;
  phase: 'idle' | 'loading' | 'ready' | 'error';
}

export interface SolveProgress {
  progress: number;
  wordsFound: number;
}
