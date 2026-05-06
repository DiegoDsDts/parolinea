export function getWordScore(word: string): number {
  const length = word.length;
  if (length === 2) return 2;
  if (length === 3) return 5;
  if (length === 4) return 9;
  if (length === 5) return 14;
  if (length === 6) return 20;
  if (length === 7) return 27;
  if (length === 8) return 35;
  if (length === 9) return 44;
  if (length === 10) return 54;
  if (length === 11) return 65;
  if (length >= 12) return 77;
  return 0;
}

export function sortWords(words: Array<{ word: string; score: number }>) {
  return [...words].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word, 'it');
  });
}
