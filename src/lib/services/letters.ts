const LETTER_FREQUENCIES: Record<string, number> = {
  A: 11,
  B: 3,
  C: 6,
  D: 3,
  E: 11,
  F: 3,
  G: 2,
  H: 1,
  I: 12,
  L: 5,
  M: 5,
  N: 7,
  O: 9,
  P: 3,
  Q: 1,
  R: 6,
  S: 6,
  T: 5,
  U: 5,
  V: 2,
  Z: 2,
};

export function getRandomLetterByFrequency(): string {
  const totalWeight = Object.values(LETTER_FREQUENCIES).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [letter, weight] of Object.entries(LETTER_FREQUENCIES)) {
    random -= weight;
    if (random <= 0) return letter;
  }

  return 'A';
}

export function createRandomBoard(gridSize: number): string[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => getRandomLetterByFrequency()),
  );
}

export function createEmptyBoard(gridSize: number): string[][] {
  return Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ''));
}
