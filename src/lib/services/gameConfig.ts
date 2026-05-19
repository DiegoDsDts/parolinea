import type { GameChallengeFrom, GameConfig, WordItem, WordQuantityMode } from '../types';
import { createRandomBoard } from './letters';

const CHALLENGE_FORMAT_VERSION = '1';
const CHALLENGE_FIELD_SEPARATOR = '|';
const COMPACT_QU_CELL = '~';
const BASE_36_RADIX = 36;

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

function encodeBase36(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Numero sfida non valido.');
  }

  return value.toString(BASE_36_RADIX);
}

function decodeBase36(value: string, fieldName: string): number {
  if (!/^[0-9a-z]+$/i.test(value)) {
    throw new Error(`${fieldName} non valido.`);
  }

  const decoded = Number.parseInt(value, BASE_36_RADIX);
  if (!Number.isInteger(decoded) || decoded < 0) {
    throw new Error(`${fieldName} non valido.`);
  }

  return decoded;
}

function encodeUtf8Base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeUtf8Base64Url(value: string): string {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) {
    throw new Error('Token sfida non valido.');
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function boardToCompactLetters(config: GameConfig): string {
  return getBoardLetters(config)
    .flat()
    .map((cell) => (cell === 'QU' ? COMPACT_QU_CELL : cell.toLowerCase()))
    .join('');
}

function compactLettersToBoard(compactLetters: string, gridSize: number): string[][] {
  const cells: string[] = [];

  for (const char of compactLetters) {
    if (char === COMPACT_QU_CELL) {
      cells.push('QU');
      continue;
    }

    if (/^[a-z]$/i.test(char)) {
      cells.push(char.toUpperCase());
      continue;
    }

    throw new Error('Griglia sfida non valida.');
  }

  if (cells.length !== gridSize * gridSize) {
    throw new Error('Griglia sfida non valida.');
  }

  return Array.from({ length: gridSize }, (_, rowIndex) =>
    cells.slice(rowIndex * gridSize, rowIndex * gridSize + gridSize),
  );
}

function serializeFoundWords(words: WordItem[]): string {
  return words
    .slice()
    .reverse()
    .map((item) => item.word.trim().toLowerCase())
    .filter(Boolean)
    .join(',');
}

export function encodeChallengeConfig(
  config: GameConfig,
  playerName: string,
  points: number,
  foundWords: WordItem[],
): string {
  const normalizedConfig = normalizeGameConfig(config);
  const gridSize = parseGridSize(normalizedConfig['grid-size']);
  const minWordLength = normalizedConfig['min-word-length'];
  const compactGridAndMin = `${encodeBase36(gridSize)}${encodeBase36(minWordLength)}`;
  const fields = [
    CHALLENGE_FORMAT_VERSION,
    compactGridAndMin,
    encodeBase36(normalizedConfig['duration-sec']),
    boardToCompactLetters(normalizedConfig),
    encodeBase36(points),
    encodeURIComponent(playerName.trim() || 'Giocatore'),
    serializeFoundWords(foundWords),
  ];

  return encodeUtf8Base64Url(fields.join(CHALLENGE_FIELD_SEPARATOR));
}

export function decodeChallengeToken(token: string): GameConfig {
  let decodedPayload: string;
  try {
    decodedPayload = decodeUtf8Base64Url(token.trim());
  } catch {
    throw new Error('Link sfida non valido.');
  }

  const fields = decodedPayload.split(CHALLENGE_FIELD_SEPARATOR);
  if (fields.length !== 7 || fields[0] !== CHALLENGE_FORMAT_VERSION || fields[1].length !== 2) {
    throw new Error('Formato sfida non supportato.');
  }

  const gridSize = decodeBase36(fields[1][0], 'Dimensione griglia');
  const minWordLength = decodeBase36(fields[1][1], 'Lunghezza minima');
  const durationSeconds = decodeBase36(fields[2], 'Durata');
  const points = decodeBase36(fields[4], 'Punti');
  let name: string;
  try {
    name = decodeURIComponent(fields[5]).trim() || 'Giocatore';
  } catch {
    throw new Error('Nome sfidante non valido.');
  }

  const decodedConfig: GameConfig = {
    'grid-size': `${gridSize}x${gridSize}`,
    'min-word-length': minWordLength,
    'duration-sec': durationSeconds,
    letters: boardToGridLetters(compactLettersToBoard(fields[3], gridSize)),
    from: {
      played: true,
      name,
      points,
      words: normalizeChallengeWords(fields[6]),
    },
  };
  const validation = validateGameConfig(decodedConfig);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Link sfida non valido.');
  }

  return normalizeGameConfig(decodedConfig);
}

export function createChallengeUrl(token: string): string {
  const challengeUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  challengeUrl.searchParams.set('g', token);
  return challengeUrl.toString();
}

export function extractChallengeToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('?')) {
    return new URLSearchParams(trimmed).get('g')?.trim() || null;
  }

  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed, window.location.origin);
      return parsedUrl.searchParams.get('g')?.trim() || null;
    } catch {
      return null;
    }
  }

  return trimmed;
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
