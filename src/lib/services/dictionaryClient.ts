import { writable } from 'svelte/store';
import type { DictionaryStatus, SolveProgress, WordItem } from '../types';

type WorkerMessage =
  | { type: 'dictionary-progress'; wordsLoaded: number }
  | { type: 'dictionary-ready'; wordsLoaded: number }
  | { type: 'dictionary-error'; error: string }
  | { type: 'check-result'; requestId: number; exists: boolean }
  | { type: 'check-error'; requestId: number; error: string }
  | { type: 'solve-progress'; requestId: number; progress: number; wordsFound: number }
  | { type: 'solve-result'; requestId: number; words: WordItem[] }
  | { type: 'solve-error'; requestId: number; error: string }
  | { type: 'solve-cancelled'; requestId: number };

const initialStatus: DictionaryStatus = {
  ready: false,
  loading: false,
  error: null,
  wordsLoaded: 0,
  phase: 'idle',
};

export const dictionaryStatus = writable<DictionaryStatus>(initialStatus);

class DictionaryClient {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private nextRequestId = 1;
  private checks = new Map<number, { resolve: (exists: boolean) => void; reject: (error: Error) => void }>();
  private solves = new Map<
    number,
    {
      resolve: (words: WordItem[]) => void;
      reject: (error: Error) => void;
      onProgress?: (progress: SolveProgress) => void;
    }
  >();

  ensureReady(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.ensureWorker();

    dictionaryStatus.set({
      ready: false,
      loading: true,
      error: null,
      wordsLoaded: 0,
      phase: 'loading',
    });

    this.initPromise = new Promise((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
      this.worker?.postMessage({ type: 'init' });
    });

    return this.initPromise;
  }

  async checkWord(word: string): Promise<boolean> {
    await this.ensureReady();
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolve, reject) => {
      this.checks.set(requestId, { resolve, reject });
      this.worker?.postMessage({ type: 'check-word', requestId, word });
    });
  }

  async solveBoard(
    board: string[],
    gridSize: number,
    minWordLength: number,
    onProgress?: (progress: SolveProgress) => void,
  ): Promise<WordItem[]> {
    await this.ensureReady();
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolve, reject) => {
      this.solves.set(requestId, { resolve, reject, onProgress });
      this.worker?.postMessage({
        type: 'solve',
        requestId,
        board,
        gridSize,
        minWordLength,
      });
    });
  }

  cancelSolve(): void {
    this.worker?.postMessage({ type: 'cancel-solve' });
  }

  reload(): void {
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.initResolve = null;
    this.initReject = null;
    this.checks.clear();
    this.solves.clear();
    dictionaryStatus.set(initialStatus);
  }

  private ensureWorker(): void {
    if (this.worker) return;

    this.worker = new Worker(new URL('../workers/dictionary.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handleMessage(event.data);
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Errore nel worker del dizionario.');
      dictionaryStatus.set({
        ready: false,
        loading: false,
        error: error.message,
        wordsLoaded: 0,
        phase: 'error',
      });
      this.initReject?.(error);
      this.rejectAll(error);
    };
  }

  private handleMessage(message: WorkerMessage): void {
    if (message.type === 'dictionary-progress') {
      dictionaryStatus.set({
        ready: false,
        loading: true,
        error: null,
        wordsLoaded: message.wordsLoaded,
        phase: 'loading',
      });
      return;
    }

    if (message.type === 'dictionary-ready') {
      dictionaryStatus.set({
        ready: true,
        loading: false,
        error: null,
        wordsLoaded: message.wordsLoaded,
        phase: 'ready',
      });
      this.initResolve?.();
      return;
    }

    if (message.type === 'dictionary-error') {
      const error = new Error(message.error);
      dictionaryStatus.set({
        ready: false,
        loading: false,
        error: error.message,
        wordsLoaded: 0,
        phase: 'error',
      });
      this.initReject?.(error);
      this.rejectAll(error);
      return;
    }

    if (message.type === 'check-result') {
      const pending = this.checks.get(message.requestId);
      pending?.resolve(message.exists);
      this.checks.delete(message.requestId);
      return;
    }

    if (message.type === 'check-error') {
      const pending = this.checks.get(message.requestId);
      pending?.reject(new Error(message.error));
      this.checks.delete(message.requestId);
      return;
    }

    if (message.type === 'solve-progress') {
      const pending = this.solves.get(message.requestId);
      pending?.onProgress?.({
        progress: message.progress,
        wordsFound: message.wordsFound,
      });
      return;
    }

    if (message.type === 'solve-result') {
      const pending = this.solves.get(message.requestId);
      pending?.resolve(message.words);
      this.solves.delete(message.requestId);
      return;
    }

    if (message.type === 'solve-error') {
      const pending = this.solves.get(message.requestId);
      pending?.reject(new Error(message.error));
      this.solves.delete(message.requestId);
      return;
    }

    if (message.type === 'solve-cancelled') {
      const pending = this.solves.get(message.requestId);
      pending?.reject(new Error('Calcolo annullato.'));
      this.solves.delete(message.requestId);
    }
  }

  private rejectAll(error: Error): void {
    for (const [, pending] of this.checks) pending.reject(error);
    for (const [, pending] of this.solves) pending.reject(error);
    this.checks.clear();
    this.solves.clear();
  }
}

export const dictionaryClient = new DictionaryClient();
