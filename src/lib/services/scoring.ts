export function getWordScore(word: string, minWordLength: number): number {
  const extraLetters = word.length - minWordLength;
  if (extraLetters < 0) return 0;
  return Math.min(15, 1 + extraLetters * 2);
}

export function sortWords(words: Array<{ word: string; score: number }>) {
  return [...words].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word, 'it');
  });
}
