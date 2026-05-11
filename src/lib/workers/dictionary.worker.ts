import { getWordScore } from '../services/scoring';
import type { WordItem } from '../types';

type IncomingMessage =
  | { type: 'init' }
  | {
      type: 'check-word';
      requestId: number;
      word: string;
    }
  | {
      type: 'solve';
      requestId: number;
      board: string[];
      gridSize: number;
      minWordLength: number;
    }
  | { type: 'cancel-solve' };

class TrieNode {
  children = new Map<string, TrieNode>();
  isEndOfWord = false;
}

class Trie {
  root = new TrieNode();

  insert(word: string): void {
    let current = this.root;

    for (const char of word) {
      let next = current.children.get(char);
      if (!next) {
        next = new TrieNode();
        current.children.set(char, next);
      }
      current = next;
    }

    current.isEndOfWord = true;
  }

  hasPrefix(prefix: string): boolean {
    let current = this.root;

    for (const char of prefix) {
      const next = current.children.get(char);
      if (!next) return false;
      current = next;
    }

    return true;
  }

  contains(word: string): boolean {
    let current = this.root;

    for (const char of word) {
      const next = current.children.get(char);
      if (!next) return false;
      current = next;
    }

    return current.isEndOfWord;
  }
}

const dictionaryUrl = new URL('../assets/660000_parole_italiane.txt', import.meta.url);
let trie: Trie | null = null;
let wordsLoaded = 0;
let initPromise: Promise<void> | null = null;
let solveVersion = 0;

async function initDictionary(): Promise<void> {
  if (trie) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    postMessage({ type: 'dictionary-progress', wordsLoaded: 0 });

    const response = await fetch(dictionaryUrl);
    if (!response.ok) {
      throw new Error(`Dizionario non disponibile (${response.status})`);
    }

    const text = await response.text();
    const nextTrie = new Trie();
    const lines = text.split(/\r?\n/);
    let loaded = 0;

    for (const line of lines) {
      const word = line.trim().toLowerCase();
      if (!word) continue;
      nextTrie.insert(word);
      loaded += 1;

      if (loaded % 50000 === 0) {
        postMessage({ type: 'dictionary-progress', wordsLoaded: loaded });
      }
    }

    trie = nextTrie;
    wordsLoaded = loaded;
    postMessage({ type: 'dictionary-ready', wordsLoaded });
  })();

  return initPromise;
}

function buildAdjacencyList(gridSize: number): number[][] {
  const totalCells = gridSize * gridSize;
  const adjacencyList: number[][] = Array.from({ length: totalCells }, () => []);

  for (let index = 0; index < totalCells; index += 1) {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;

        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;

        if (nextRow >= 0 && nextRow < gridSize && nextCol >= 0 && nextCol < gridSize) {
          adjacencyList[index].push(nextRow * gridSize + nextCol);
        }
      }
    }
  }

  return adjacencyList;
}

function sortSolutions(words: Set<string>, minWordLength: number): WordItem[] {
  return Array.from(words)
    .map((word) => ({ word, score: getWordScore(word, minWordLength) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.word.localeCompare(b.word, 'it');
    });
}

function solveBoard(
  requestId: number,
  board: string[],
  gridSize: number,
  minWordLength: number,
): void {
  if (!trie) {
    postMessage({ type: 'solve-error', requestId, error: 'Dizionario non pronto.' });
    return;
  }

  const currentVersion = ++solveVersion;
  const lowerBoard = board.map((letter) => letter.toLowerCase());
  const totalCells = gridSize * gridSize;
  const adjacencyList = buildAdjacencyList(gridSize);
  const possibleWords = new Set<string>();
  let startIndex = 0;

  const findWordsStartingAt = (
    index: number,
    visited: boolean[],
    currentWord: string,
  ) => {
    visited[index] = true;
    const nextWord = currentWord + lowerBoard[index];

    if (!trie!.hasPrefix(nextWord)) {
      visited[index] = false;
      return;
    }

    if (nextWord.length >= minWordLength && trie!.contains(nextWord)) {
      possibleWords.add(nextWord);
    }

    for (const neighbor of adjacencyList[index]) {
      if (!visited[neighbor]) {
        findWordsStartingAt(neighbor, visited, nextWord);
      }
    }

    visited[index] = false;
  };

  const processBatch = () => {
    if (currentVersion !== solveVersion) {
      postMessage({ type: 'solve-cancelled', requestId });
      return;
    }

    const end = Math.min(startIndex + 2, totalCells);

    while (startIndex < end) {
      findWordsStartingAt(startIndex, Array.from({ length: totalCells }, () => false), '');
      startIndex += 1;
    }

    postMessage({
      type: 'solve-progress',
      requestId,
      progress: startIndex / totalCells,
      wordsFound: possibleWords.size,
    });

    if (startIndex >= totalCells) {
      postMessage({
        type: 'solve-result',
        requestId,
        words: sortSolutions(possibleWords, minWordLength),
      });
    } else {
      setTimeout(processBatch, 0);
    }
  };

  processBatch();
}

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (message.type === 'init') {
    initDictionary().catch((error) => {
      postMessage({
        type: 'dictionary-error',
        error: error instanceof Error ? error.message : 'Errore durante il caricamento del dizionario.',
      });
    });
    return;
  }

  if (message.type === 'cancel-solve') {
    solveVersion += 1;
    return;
  }

  initDictionary()
    .then(() => {
      if (message.type === 'check-word') {
        postMessage({
          type: 'check-result',
          requestId: message.requestId,
          exists: trie?.contains(message.word.toLowerCase()) ?? false,
        });
      }

      if (message.type === 'solve') {
        solveBoard(message.requestId, message.board, message.gridSize, message.minWordLength);
      }
    })
    .catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Errore durante il caricamento del dizionario.';

      if (message.type === 'check-word') {
        postMessage({ type: 'check-error', requestId: message.requestId, error: errorMessage });
      }

      if (message.type === 'solve') {
        postMessage({ type: 'solve-error', requestId: message.requestId, error: errorMessage });
      }
    });
};
