import type { GameConfig } from '../types';
import { createRandomBoard } from './letters';

export function parseGridSize(gridSize: string): number {
  const parts = gridSize.toLowerCase().split('x');
  if (parts.length === 2 && parts[0] === parts[1]) {
    const parsed = Number.parseInt(parts[0], 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  throw new Error(`Formato griglia non valido: ${gridSize}`);
}

export function generateGameConfig(
  gridSize: number,
  minWordLength: number,
  gameDuration: number,
): GameConfig {
  return {
    grid_size: `${gridSize}x${gridSize}`,
    min_word_length: minWordLength,
    duration_sec: gameDuration,
    board_letters: createRandomBoard(gridSize),
  };
}

export function createManualGameConfig(
  gridSize: number,
  minWordLength: number,
  gameDuration: number,
  boardLetters: string[][],
): GameConfig {
  return {
    grid_size: `${gridSize}x${gridSize}`,
    min_word_length: minWordLength,
    duration_sec: gameDuration,
    board_letters: normalizeBoard(boardLetters),
  };
}

export function normalizeBoard(board: string[][]): string[][] {
  return board.map((row) =>
    row.map((cell) => cell.trim().slice(0, 1).toUpperCase()),
  );
}

export function validateGameConfig(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'La configurazione deve essere un oggetto JSON.' };
  }

  const candidate = config as Partial<GameConfig>;
  if (
    !candidate.grid_size ||
    !candidate.board_letters ||
    candidate.min_word_length === undefined ||
    candidate.duration_sec === undefined
  ) {
    return { valid: false, error: 'Configurazione incompleta.' };
  }

  let gridSize: number;
  try {
    gridSize = parseGridSize(candidate.grid_size);
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Griglia non valida.' };
  }

  if (!Array.isArray(candidate.board_letters) || candidate.board_letters.length !== gridSize) {
    return { valid: false, error: 'Il numero di righe non corrisponde alla dimensione della griglia.' };
  }

  for (const row of candidate.board_letters) {
    if (!Array.isArray(row) || row.length !== gridSize) {
      return { valid: false, error: 'Il numero di colonne non corrisponde alla dimensione della griglia.' };
    }

    for (const cell of row) {
      if (typeof cell !== 'string' || !/^[A-Za-z]$/.test(cell.trim())) {
        return { valid: false, error: 'Ogni cella deve contenere una sola lettera.' };
      }
    }
  }

  if (
    typeof candidate.min_word_length !== 'number' ||
    !Number.isInteger(candidate.min_word_length) ||
    candidate.min_word_length < 2 ||
    candidate.min_word_length > 12
  ) {
    return { valid: false, error: 'La lunghezza minima deve essere un intero tra 2 e 12.' };
  }

  if (
    typeof candidate.duration_sec !== 'number' ||
    !Number.isInteger(candidate.duration_sec) ||
    candidate.duration_sec < 0
  ) {
    return { valid: false, error: 'La durata deve essere un numero intero non negativo.' };
  }

  return { valid: true };
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Illimitato';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}
