import type { GameChallengeFrom, GameConfig, WordQuantityMode } from '../types';
import { createRandomBoard } from './letters';

export interface SolutionScoreRange {
  min: number;
  max: number | null;
}

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
    'grid-size': `${gridSize}x${gridSize}`,
    'min-word-length': minWordLength,
    'duration-sec': gameDuration,
    letters: boardToGridLetters(createRandomBoard(gridSize)),
  };
}

export function createManualGameConfig(
  gridSize: number,
  minWordLength: number,
  gameDuration: number,
  boardLetters: string[][],
): GameConfig {
  return {
    'grid-size': `${gridSize}x${gridSize}`,
    'min-word-length': minWordLength,
    'duration-sec': gameDuration,
    letters: boardToGridLetters(boardLetters),
  };
}

export function getSolutionScoreRange(
  mode: WordQuantityMode,
  gridSize: number,
  minWordLength: number,
): SolutionScoreRange | null {
  if (mode === 'random') return null;

  const lengthFactor = Math.max(0.18, 7 - minWordLength);
  const baseScore = Math.max(24, Math.round(gridSize ** 4 * lengthFactor * 0.72));
  const lowMax = Math.round(baseScore * 0.7);
  const mediumMax = Math.round(baseScore * 1.4);

  if (mode === 'low') return { min: 0, max: lowMax };
  if (mode === 'medium') return { min: lowMax + 1, max: mediumMax };
  return { min: mediumMax + 1, max: null };
}

export function formatSolutionScoreRange(range: SolutionScoreRange | null): string {
  if (!range) return '-';
  if (range.max === null) return `>=${range.min.toLocaleString('it-IT')} pt`;
  return `${range.min.toLocaleString('it-IT')}-${range.max.toLocaleString('it-IT')} pt`;
}

export function normalizeBoard(board: string[][]): string[][] {
  return board.map((row) =>
    row.map((cell) => {
      const normalized = cell.trim().toUpperCase();
      if (normalized === 'QU') return 'QU';
      return normalized.slice(0, 1);
    }),
  );
}

function encodeGridCell(cell: string): string {
  return cell === 'QU' ? '(qu)' : cell.toLowerCase();
}

function parseGridRow(row: string): string[] {
  const cells: string[] = [];

  for (let index = 0; index < row.length;) {
    if (row.slice(index, index + 4).toLowerCase() === '(qu)') {
      cells.push('QU');
      index += 4;
      continue;
    }

    const cell = row[index];
    if (cell && /[A-Za-z]/.test(cell)) {
      cells.push(cell.toUpperCase());
      index += 1;
      continue;
    }

    throw new Error(`Cella non valida: ${cell}`);
  }

  return cells;
}

export function boardToGridLetters(board: string[][]): string {
  return normalizeBoard(board)
    .map((row) => row.map(encodeGridCell).join(''))
    .join(',');
}

export function parseGridLetters(gridLetters: string, gridSize: number): string[][] {
  const rows = gridLetters.split(',').map((row) => row.trim());
  const parsedRows = rows.map(parseGridRow);

  if (rows.length !== gridSize || parsedRows.some((row) => row.length !== gridSize)) {
    throw new Error('Le lettere della griglia non corrispondono alla dimensione dichiarata.');
  }

  return parsedRows;
}

export function getBoardLetters(config: GameConfig): string[][] {
  return parseGridLetters(config.letters, parseGridSize(config['grid-size']));
}

export function parseChallengeWords(words: string | undefined): string[] {
  if (typeof words !== 'string') return [];

  const seen = new Set<string>();
  const parsedWords: string[] = [];
  for (const word of words.split(',')) {
    const normalized = word.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    parsedWords.push(normalized);
  }

  return parsedWords;
}

export function normalizeChallengeWords(words: string): string {
  return parseChallengeWords(words).join(',');
}

export function getChallengeFrom(config: GameConfig): GameChallengeFrom | null {
  const from = config.from;
  if (!from || from.played !== true) return null;
  if (typeof from.name !== 'string' || typeof from.points !== 'number') return null;
  const normalizedWords = typeof from.words === 'string' ? normalizeChallengeWords(from.words) : undefined;

  return {
    played: true,
    name: from.name.trim() || 'Giocatore',
    points: from.points,
    ...(normalizedWords !== undefined ? { words: normalizedWords } : {}),
  };
}

export function normalizeGameConfig(config: GameConfig): GameConfig {
  const challengeFrom = getChallengeFrom(config);
  return {
    'grid-size': config['grid-size'],
    'min-word-length': config['min-word-length'],
    'duration-sec': config['duration-sec'],
    letters: boardToGridLetters(getBoardLetters(config)),
    ...(challengeFrom ? { from: challengeFrom } : {}),
  };
}

export function validateGameConfig(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'La configurazione deve essere un oggetto JSON.' };
  }

  const candidate = config as Partial<GameConfig>;
  if (
    !candidate['grid-size'] ||
    candidate.letters === undefined ||
    candidate['min-word-length'] === undefined ||
    candidate['duration-sec'] === undefined
  ) {
    return { valid: false, error: 'Configurazione incompleta.' };
  }

  let gridSize: number;
  try {
    gridSize = parseGridSize(candidate['grid-size']);
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Griglia non valida.' };
  }

  if (typeof candidate.letters !== 'string') {
    return { valid: false, error: 'Le lettere della griglia devono essere una stringa.' };
  }

  try {
    parseGridLetters(candidate.letters, gridSize);
  } catch {
    return { valid: false, error: 'Le lettere della griglia non corrispondono alla dimensione dichiarata.' };
  }

  if (
    typeof candidate['min-word-length'] !== 'number' ||
    !Number.isInteger(candidate['min-word-length']) ||
    candidate['min-word-length'] < 2 ||
    candidate['min-word-length'] > 12
  ) {
    return { valid: false, error: 'La lunghezza minima deve essere un intero tra 2 e 12.' };
  }

  if (
    typeof candidate['duration-sec'] !== 'number' ||
    !Number.isInteger(candidate['duration-sec']) ||
    candidate['duration-sec'] < 0
  ) {
    return { valid: false, error: 'La durata deve essere un numero intero non negativo.' };
  }

  if (candidate.from !== undefined) {
    if (!candidate.from || typeof candidate.from !== 'object' || Array.isArray(candidate.from)) {
      return { valid: false, error: 'Il campo from deve essere un oggetto.' };
    }

    const from = candidate.from as Partial<GameChallengeFrom>;
    if (from.played !== undefined && typeof from.played !== 'boolean') {
      return { valid: false, error: 'Il campo from.played deve essere booleano.' };
    }

    if (from.played === true) {
      if (typeof from.name !== 'string' || !from.name.trim()) {
        return { valid: false, error: 'Il campo from.name deve contenere il nome dello sfidante.' };
      }

      if (typeof from.points !== 'number' || !Number.isInteger(from.points) || from.points < 0) {
        return { valid: false, error: 'Il campo from.points deve essere un intero non negativo.' };
      }

      if (from.words !== undefined && typeof from.words !== 'string') {
        return { valid: false, error: 'Il campo from.words deve essere una stringa di parole separate da virgola.' };
      }
    }
  }

  return { valid: true };
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Illimitato';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}
