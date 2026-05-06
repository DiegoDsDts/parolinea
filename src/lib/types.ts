export type GameMode = 'config' | 'loading' | 'play' | 'recap';
export type ActiveTab = 'game' | 'info' | 'settings';
export type FeedbackType = 'word-valid' | 'word-duplicate' | 'word-invalid' | null;
export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface GameConfig {
  grid_size: string;
  min_word_length: number;
  duration_sec: number;
  board_letters: string[][];
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
