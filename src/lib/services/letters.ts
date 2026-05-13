import dices3x3 from '../assets/3x3-dices.txt?raw';
import dices4x4 from '../assets/4x4-dices.txt?raw';
import dices5x5 from '../assets/5x5-dices.txt?raw';
import dices6x6 from '../assets/6x6-dices.txt?raw';
import dices7x7 from '../assets/7x7-dices.txt?raw';
import dices8x8 from '../assets/8x8-dices.txt?raw';

type Die = string[];

const DICE_FACE_PATTERN = /\(QU\)|[A-Z]/g;
const DICE_SET_SOURCES: Record<number, string> = {
  3: dices3x3,
  4: dices4x4,
  5: dices5x5,
  6: dices6x6,
  7: dices7x7,
  8: dices8x8,
};

function parseDieFaces(value: string): Die {
  return (value.match(DICE_FACE_PATTERN) ?? []).map((face) => (face === '(QU)' ? 'QU' : face));
}

function parseDiceSet(gridSize: number, source: string): Die[] {
  const expectedDiceCount = gridSize * gridSize;
  const diceById = new Map<number, Die>();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+):(.+)$/);
    if (!match) throw new Error(`Formato dado non valido per ${gridSize}x${gridSize}: ${trimmed}`);

    const id = Number.parseInt(match[1], 10);
    const faces = parseDieFaces(match[2]);

    if (!Number.isInteger(id) || id < 1 || id > expectedDiceCount) {
      throw new Error(`Indice dado non valido per ${gridSize}x${gridSize}: ${match[1]}`);
    }

    if (diceById.has(id)) {
      throw new Error(`Dado duplicato nel set ${gridSize}x${gridSize}: ${match[1]}`);
    }

    if (faces.length !== 6) {
      throw new Error(`Il dado ${match[1]} del set ${gridSize}x${gridSize} non ha 6 facce.`);
    }

    diceById.set(id, faces);
  }

  if (diceById.size !== expectedDiceCount) {
    throw new Error(`Il set ${gridSize}x${gridSize} contiene ${diceById.size} dadi invece di ${expectedDiceCount}.`);
  }

  return Array.from({ length: expectedDiceCount }, (_, index) => {
    const die = diceById.get(index + 1);
    if (!die) throw new Error(`Manca il dado ${index + 1} nel set ${gridSize}x${gridSize}.`);
    return die;
  });
}

const DICE_SETS = Object.fromEntries(
  Object.entries(DICE_SET_SOURCES).map(([gridSize, source]) => {
    const parsedGridSize = Number.parseInt(gridSize, 10);
    return [parsedGridSize, parseDiceSet(parsedGridSize, source)];
  }),
) as Record<number, Die[]>;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createRandomBoard(gridSize: number): string[][] {
  const diceSet = DICE_SETS[gridSize];
  if (!diceSet) throw new Error(`Set di dadi non disponibile per griglia ${gridSize}x${gridSize}.`);

  const rolledLetters = shuffle(diceSet).map((die) => die[Math.floor(Math.random() * die.length)]);

  return Array.from({ length: gridSize }, (_, rowIndex) =>
    rolledLetters.slice(rowIndex * gridSize, (rowIndex + 1) * gridSize),
  );
}

export function createEmptyBoard(gridSize: number): string[][] {
  return Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ''));
}
