<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRightToLine, Clipboard, Home, Pause, Play, Share2, Square } from 'lucide-svelte';
  import AphorismCard from './lib/components/AphorismCard.svelte';
  import ConfirmModal from './lib/components/ConfirmModal.svelte';
  import DictionaryModal from './lib/components/DictionaryModal.svelte';
  import GameBoard from './lib/components/GameBoard.svelte';
  import GameTimer from './lib/components/GameTimer.svelte';
  import HomeBoard from './lib/components/HomeBoard.svelte';
  import InfoBoard from './lib/components/InfoBoard.svelte';
  import LoadingOverlay from './lib/components/LoadingOverlay.svelte';
  import Modal from './lib/components/Modal.svelte';
  import SettingsBoard from './lib/components/SettingsBoard.svelte';
  import WordList from './lib/components/WordList.svelte';
  import { dictionaryClient, dictionaryStatus } from './lib/services/dictionaryClient';
  import {
    generateGameConfig,
    getSolutionScoreRange,
    parseGridSize,
    type SolutionScoreRange,
  } from './lib/services/gameConfig';
  import { getWordScore, sortWords } from './lib/services/scoring';
  import type {
    ActiveTab,
    BoardCell,
    EffectiveTheme,
    FeedbackType,
    GameConfig,
    GameMode,
    StartGameOptions,
    ThemePreference,
    WordItem,
  } from './lib/types';

  const THEME_STORAGE_KEY = 'parolinea/theme-preference';
  const TARGETED_BOARD_ATTEMPT_LIMIT = 40;

  let activeTab: ActiveTab = 'game';
  let gameMode: GameMode = 'config';
  let gameConfig: GameConfig | null = null;
  let boardCells: BoardCell[][] = [];
  let board: string[][] = [];
  let selectedIndices: number[] = [];
  let currentWord = '';
  let feedbackType: FeedbackType = null;
  let foundWords = new Set<string>();
  let foundWordsList: WordItem[] = [];
  let allSolutionsList: WordItem[] = [];
  let gameActive = false;
  let isPaused = false;
  let calculationProgress = 0;
  let calculationWordsFound = 0;
  let generationAttempt = 0;
  let generationTargetRange: SolutionScoreRange | null = null;
  let timerResetKey = 0;
  let feedbackTimeout: number | null = null;
  let submissionVersion = 0;
  let lastSubmittedWordIndices: number[] | null = null;
  let selectedDefinitionWord = '';
  let definitionOpen = false;
  let exportOpen = false;
  let exportCopied = false;
  let toastMessage = '';
  let confirmOpen = false;
  let confirmTitle = '';
  let confirmMessage = '';
  let confirmLabel = 'Conferma';
  let confirmDanger = false;
  let confirmAction: (() => void) | null = null;
  let confirmShouldResume = false;
  let homeStartSignal = 0;
  let generationVersion = 0;
  let lastGameOptions: StartGameOptions = {};

  let themePreference: ThemePreference = 'system';
  let systemTheme: EffectiveTheme = 'light';

  $: effectiveTheme = themePreference === 'system' ? systemTheme : themePreference;
  $: document.documentElement.dataset.theme = effectiveTheme;
  $: board = boardCells.map((row) => row.map((cell) => cell.letter));
  $: totalScore = foundWordsList.reduce((sum, item) => sum + item.score, 0);
  $: totalPossibleScore = allSolutionsList.reduce((sum, item) => sum + item.score, 0);
  $: recapFoundWords = new Set(foundWordsList.map((item) => item.word));
  $: solutionItems = allSolutionsList.map((item) => {
    const found = recapFoundWords.has(item.word);
    return {
      ...item,
      found,
      displayScore: found ? `+${item.score}` : String(item.score),
    };
  });
  $: scorePercent = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0;
  $: recapGridSize = gameConfig ? parseGridSize(gameConfig.grid_size) : 4;
  $: staticTileFont = `calc(var(--board-size) * ${0.45 / recapGridSize})`;
  $: loadingVisible = $dictionaryStatus.loading || gameMode === 'loading';
  $: loadingTitle = gameMode === 'loading' ? 'Creazione dello schema' : 'Avvio di Parolinea';
  $: loadingDetail =
    gameMode === 'loading'
      ? `${generationAttempt > 1 ? `Tentativo ${generationAttempt}: ` : ''}Analisi soluzioni: ${calculationWordsFound.toLocaleString('it-IT')} parole candidate${generationTargetRange ? ' nel range scelto' : ''}`
      : $dictionaryStatus.wordsLoaded > 0
        ? `${$dictionaryStatus.wordsLoaded.toLocaleString('it-IT')} parole caricate`
        : 'Caricamento dizionario italiano';
  $: exportJson = gameConfig ? JSON.stringify(gameConfig, null, 2) : '';

  onMount(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      themePreference = savedTheme;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme = mediaQuery.matches ? 'dark' : 'light';
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      systemTheme = event.matches ? 'dark' : 'light';
    };

    mediaQuery.addEventListener('change', updateSystemTheme);
    dictionaryClient.ensureReady().catch((error) => {
      showToast(error instanceof Error ? error.message : 'Errore durante il caricamento del dizionario.');
    });

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme);
      clearFeedbackTimer();
      dictionaryClient.cancelSolve();
    };
  });

  function setActiveTab(tab: ActiveTab) {
    if (tab !== 'game' && gameMode === 'play') {
      isPaused = true;
    }
    activeTab = tab;
  }

  function setThemePreference(nextTheme: ThemePreference) {
    themePreference = nextTheme;
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function showToast(message: string) {
    toastMessage = message;
    window.setTimeout(() => {
      if (toastMessage === message) toastMessage = '';
    }, 3200);
  }

  function clearFeedbackTimer() {
    if (feedbackTimeout !== null) {
      window.clearTimeout(feedbackTimeout);
      feedbackTimeout = null;
    }
  }

  function resetRoundState() {
    clearFeedbackTimer();
    submissionVersion += 1;
    selectedIndices = [];
    currentWord = '';
    feedbackType = null;
    foundWords = new Set();
    foundWordsList = [];
    allSolutionsList = [];
    lastSubmittedWordIndices = null;
    gameActive = false;
    isPaused = false;
    calculationProgress = 0;
    calculationWordsFound = 0;
    generationAttempt = 0;
    generationTargetRange = null;
  }

  function getSolutionScore(words: WordItem[]): number {
    return words.reduce((sum, item) => sum + item.score, 0);
  }

  function isScoreInRange(score: number, range: SolutionScoreRange | null): boolean {
    if (!range) return true;
    return score >= range.min && (range.max === null || score <= range.max);
  }

  function getScoreDistanceFromRange(score: number, range: SolutionScoreRange): number {
    if (score < range.min) return range.min - score;
    if (range.max !== null && score > range.max) return score - range.max;
    return 0;
  }

  function createBoardCells(boardLetters: string[][]): BoardCell[][] {
    return boardLetters.map((row, rowIndex) =>
      row.map((letter, colIndex) => ({
        id: `${rowIndex}-${colIndex}`,
        letter,
      })),
    );
  }

  function rotateMatrixClockwise<T>(matrix: T[][]): T[][] {
    const gridSize = matrix.length;
    return Array.from({ length: gridSize }, (_, rowIndex) =>
      Array.from({ length: gridSize }, (_, colIndex) => matrix[gridSize - 1 - colIndex][rowIndex]),
    );
  }

  async function startNewGame(config: GameConfig, options: StartGameOptions = {}) {
    dictionaryClient.cancelSolve();
    resetRoundState();
    lastGameOptions = { ...options };
    const currentGenerationVersion = generationVersion + 1;
    generationVersion = currentGenerationVersion;
    gameMode = 'loading';
    activeTab = 'game';

    try {
      const gridSize = parseGridSize(config.grid_size);
      generationTargetRange = getSolutionScoreRange(options.wordQuantityMode ?? 'random', gridSize, config.min_word_length);
      const maxAttempts = generationTargetRange ? TARGETED_BOARD_ATTEMPT_LIMIT : 1;
      let selectedConfig = config;
      let selectedSolutions: WordItem[] = [];
      let bestCandidate: { config: GameConfig; solutions: WordItem[]; distance: number } | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        generationAttempt = attempt;
        calculationProgress = 0;
        calculationWordsFound = 0;

        const candidateConfig =
          attempt === 1
            ? config
            : generateGameConfig(gridSize, config.min_word_length, config.duration_sec);
        const solutions = await dictionaryClient.solveBoard(
          candidateConfig.board_letters.flat(),
          gridSize,
          candidateConfig.min_word_length,
          ({ progress, wordsFound }) => {
            calculationProgress = progress;
            calculationWordsFound = wordsFound;
          },
        );

        if (generationVersion !== currentGenerationVersion) return;

        const possibleScore = getSolutionScore(solutions);
        if (isScoreInRange(possibleScore, generationTargetRange)) {
          selectedConfig = candidateConfig;
          selectedSolutions = solutions;
          bestCandidate = null;
          break;
        }

        if (generationTargetRange) {
          const distance = getScoreDistanceFromRange(possibleScore, generationTargetRange);
          if (!bestCandidate || distance < bestCandidate.distance) {
            bestCandidate = { config: candidateConfig, solutions, distance };
          }
        }
      }

      if (bestCandidate) {
        selectedConfig = bestCandidate.config;
        selectedSolutions = bestCandidate.solutions;
        showToast('Range non trovato: avvio lo schema piu vicino.');
      }

      gameConfig = selectedConfig;
      boardCells = createBoardCells(selectedConfig.board_letters);
      allSolutionsList = selectedSolutions;
      gameMode = 'play';
      gameActive = true;
      isPaused = false;
      timerResetKey += 1;
    } catch (error) {
      if (error instanceof Error && error.message === 'Calcolo annullato.') return;
      showToast(error instanceof Error ? error.message : 'Errore durante l’avvio della partita.');
      gameMode = 'config';
      gameActive = false;
    }
  }

  function isAdjacent(indexA: number, indexB: number): boolean {
    if (!gameConfig) return false;
    const gridSize = parseGridSize(gameConfig.grid_size);
    const rowA = Math.floor(indexA / gridSize);
    const colA = indexA % gridSize;
    const rowB = Math.floor(indexB / gridSize);
    const colB = indexB % gridSize;

    return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
  }

  function updateCurrentWord(indices: number[]) {
    if (!gameConfig) return;
    const gridSize = parseGridSize(gameConfig.grid_size);
    currentWord = indices
      .map((index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        return board[row][col];
      })
      .join('')
      .toLowerCase();
  }

  function rotateBoardClockwise() {
    if (!gameConfig || !gameActive || isPaused) return;

    clearFeedbackTimer();
    submissionVersion += 1;
    selectedIndices = [];
    currentWord = '';
    feedbackType = null;
    lastSubmittedWordIndices = null;

    boardCells = rotateMatrixClockwise(boardCells);
  }

  async function copyExportJson() {
    if (!exportJson) return;

    try {
      await navigator.clipboard.writeText(exportJson);
      exportCopied = true;
      window.setTimeout(() => {
        exportCopied = false;
      }, 1800);
    } catch {
      showToast('Impossibile copiare negli appunti.');
    }
  }

  function openExportModal() {
    exportCopied = false;
    exportOpen = true;
  }

  function handleDicePress(index: number) {
    if (!gameActive || isPaused) return;
    clearFeedbackTimer();
    submissionVersion += 1;
    feedbackType = null;
    selectedIndices = [index];
    updateCurrentWord(selectedIndices);
  }

  function handleDiceMove(index: number) {
    if (!gameActive || isPaused) return;

    const existingIndex = selectedIndices.indexOf(index);
    if (existingIndex >= 0) {
      if (existingIndex === selectedIndices.length - 1) return;
      if (existingIndex !== selectedIndices.length - 2) return;

      selectedIndices = selectedIndices.slice(0, existingIndex + 1);
      updateCurrentWord(selectedIndices);
      return;
    }

    const lastIndex = selectedIndices[selectedIndices.length - 1];
    if (lastIndex === undefined || !isAdjacent(lastIndex, index)) return;

    selectedIndices = [...selectedIndices, index];
    updateCurrentWord(selectedIndices);
  }

  function handleDiceRelease() {
    if (!gameConfig || !gameActive || isPaused) return;

    if (currentWord.length >= gameConfig.min_word_length) {
      submitCurrentWord();
      return;
    }

    selectedIndices = [];
    currentWord = '';
  }

  function handleDiceTap(index: number): boolean {
    if (!gameConfig || !gameActive || isPaused || !lastSubmittedWordIndices || lastSubmittedWordIndices.length < 2) {
      return false;
    }

    const previousLastIndex = lastSubmittedWordIndices[lastSubmittedWordIndices.length - 1];
    const previousPenultimateIndex = lastSubmittedWordIndices[lastSubmittedWordIndices.length - 2];
    if (previousPenultimateIndex === undefined || previousLastIndex === undefined) return false;
    if (index === previousLastIndex || !isAdjacent(previousPenultimateIndex, index)) return false;

    const nextIndices = [...lastSubmittedWordIndices.slice(0, -1), index];
    const reusedTile = nextIndices.slice(0, -1).includes(index);
    if (reusedTile) return false;

    selectedIndices = nextIndices;
    updateCurrentWord(selectedIndices);
    submitCurrentWord();
    return true;
  }

  async function submitCurrentWord() {
    if (!gameConfig) return;
    const version = submissionVersion + 1;
    submissionVersion = version;
    const submittedWord = currentWord.toLowerCase();
    const submittedIndices = [...selectedIndices];
    lastSubmittedWordIndices = null;

    try {
      const isValid = await dictionaryClient.checkWord(submittedWord);
      if (submissionVersion !== version) return;
      lastSubmittedWordIndices = submittedIndices;

      if (isValid) {
        if (foundWords.has(submittedWord)) {
          feedbackType = 'word-duplicate';
        } else {
          const score = getWordScore(submittedWord);
          foundWords = new Set(foundWords).add(submittedWord);
          foundWordsList = sortWords([...foundWordsList, { word: submittedWord, score }]);
          feedbackType = 'word-valid';
        }
      } else {
        feedbackType = 'word-invalid';
      }

      clearFeedbackTimer();
      feedbackTimeout = window.setTimeout(() => {
        feedbackType = null;
        selectedIndices = [];
        currentWord = '';
        feedbackTimeout = null;
      }, 190);
    } catch {
      feedbackType = 'word-invalid';
      showToast('Controllo parola non riuscito.');
    }
  }

  function openConfirm(options: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }) {
    confirmTitle = options.title;
    confirmMessage = options.message;
    confirmLabel = options.confirmLabel;
    confirmDanger = options.danger ?? false;
    confirmAction = options.onConfirm;
    confirmShouldResume = gameMode === 'play' && !isPaused;
    if (confirmShouldResume) isPaused = true;
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    confirmAction = null;
    if (confirmShouldResume) {
      isPaused = false;
      confirmShouldResume = false;
    }
  }

  function confirmDialogAction() {
    const action = confirmAction;
    confirmOpen = false;
    confirmAction = null;
    confirmShouldResume = false;
    action?.();
  }

  function completeGoHome() {
    dictionaryClient.cancelSolve();
    resetRoundState();
    gameConfig = null;
    boardCells = [];
    gameMode = 'config';
    activeTab = 'game';
  }

  function goHome() {
    if (gameMode === 'play') {
      openConfirm({
        title: 'Torna alla home',
        message: 'La partita in corso verra persa.',
        confirmLabel: 'Torna home',
        danger: true,
        onConfirm: completeGoHome,
      });
      return;
    }

    completeGoHome();
  }

  function endGame(manual: boolean) {
    if (manual) {
      openConfirm({
        title: 'Mostra soluzioni',
        message: 'Vuoi chiudere la partita e vedere tutte le soluzioni?',
        confirmLabel: 'Mostra',
        onConfirm: () => endGame(false),
      });
      return;
    }

    clearFeedbackTimer();
    selectedIndices = [];
    currentWord = '';
    feedbackType = null;
    gameActive = false;
    isPaused = false;
    gameMode = 'recap';
  }

  function startNewGameWithSameSettings() {
    if (!gameConfig) return;
    const gridSize = parseGridSize(gameConfig.grid_size);
    startNewGame(
      generateGameConfig(gridSize, gameConfig.min_word_length, gameConfig.duration_sec),
      lastGameOptions,
    );
  }

  function startDefaultGame() {
    if (!$dictionaryStatus.ready) return;
    startNewGame(generateGameConfig(5, 5, 0));
  }

  function startFromCommandBar() {
    if (!$dictionaryStatus.ready) return;

    if (activeTab === 'game' && gameMode === 'config') {
      homeStartSignal += 1;
      return;
    }

    startDefaultGame();
  }

  function openDefinition(word: string) {
    selectedDefinitionWord = word;
    definitionOpen = true;
  }

  function reloadDictionary() {
    dictionaryClient.reload();
    dictionaryClient.ensureReady().catch((error) => {
      showToast(error instanceof Error ? error.message : 'Errore durante il caricamento del dizionario.');
    });
  }
</script>

<div class="app-shell">
  <main class="app-main">
    <div class="top-blank" aria-hidden="true"></div>

    <section class="board-stage" aria-label="Area principale">
      <div class="board-info">
        {#if activeTab === 'game' && gameMode === 'play' && gameConfig}
          <div
            class:valid={feedbackType === 'word-valid'}
            class:duplicate={feedbackType === 'word-duplicate'}
            class:invalid={feedbackType === 'word-invalid'}
            class="board-title current-title"
          >
            {currentWord || ''}
          </div>
          <div class="board-meta">
            <strong>{totalScore} / {allSolutionsList.length > 0 ? totalPossibleScore : '?'} ({allSolutionsList.length > 0 ? scorePercent : '?'}%)</strong>
            <GameTimer
              seconds={gameConfig.duration_sec}
              active={gameActive}
              paused={isPaused}
              resetKey={timerResetKey}
              onEnd={() => endGame(false)}
            />
          </div>
        {:else if activeTab === 'game' && gameMode === 'recap'}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Riepilogo</span>
          </div>
          <div class="board-meta">
            <strong>{totalScore} / {totalPossibleScore} ({scorePercent}%)</strong>
          </div>
        {:else if activeTab === 'info'}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Info</span>
          </div>
          <div class="board-meta" aria-hidden="true"></div>
        {:else if activeTab === 'settings'}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Impostazioni</span>
          </div>
          <div class="board-meta" aria-hidden="true"></div>
        {:else}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Home</span>
          </div>
          <div class="board-meta" aria-hidden="true"></div>
        {/if}
      </div>

      <div class="board-area">
        {#if activeTab === 'game'}
          {#if $dictionaryStatus.error}
            <section class="state-board">
              <h1>Dizionario non disponibile</h1>
              <p>{$dictionaryStatus.error}</p>
              <button class="button primary" type="button" on:click={reloadDictionary}>Riprova</button>
            </section>
          {:else if gameMode === 'config'}
            <HomeBoard
              dictionaryStatus={$dictionaryStatus}
              startSignal={homeStartSignal}
              onStart={startNewGame}
              onInfo={() => setActiveTab('info')}
              onSettings={() => setActiveTab('settings')}
            />
          {:else if gameMode === 'play' && gameConfig}
            <div class="play-board-slot">
              <GameBoard
                {boardCells}
                {selectedIndices}
                {feedbackType}
                gridSize={parseGridSize(gameConfig.grid_size)}
                {isPaused}
                onDiceSelectStart={handleDicePress}
                onDiceSelectMove={handleDiceMove}
                onDiceSelectEnd={handleDiceRelease}
                onDiceTap={handleDiceTap}
              />
            </div>
          {:else if gameMode === 'recap' && gameConfig}
            <div class="static-board" style={`--grid-size: ${recapGridSize}; --static-tile-font: ${staticTileFont};`}>
              {#each gameConfig.board_letters as row}
                {#each row as letter}
                  <div class="static-tile">{letter}</div>
                {/each}
              {/each}
            </div>
          {/if}
        {:else if activeTab === 'info'}
          <InfoBoard onBack={goHome} />
        {:else}
          <SettingsBoard
            {themePreference}
            onThemeChange={setThemePreference}
            onBack={goHome}
          />
        {/if}
      </div>
    </section>

    <section class="context-panel" aria-label="Area contestuale">
      {#if activeTab === 'game' && gameMode === 'play'}
        <WordList
          title="Parole trovate"
          words={foundWordsList}
          emptyText="Nessuna parola trovata"
          onWordSelect={openDefinition}
        />
      {:else if activeTab === 'game' && gameMode === 'recap'}
        <WordList
          title="Tutte le soluzioni"
          words={solutionItems}
          showFoundState
          onWordSelect={openDefinition}
        />
      {:else}
        <AphorismCard />
      {/if}
    </section>

    <nav class="command-bar" aria-label="Comandi">
      {#if activeTab === 'game' && gameMode === 'play'}
        <button class="button secondary" type="button" on:click={goHome}>
          <Home size={18} />
          Home
        </button>
        <button class="button secondary square rotate-toggle" type="button" aria-label="Ruota schema" on:click={rotateBoardClockwise}>
          <span class="rotate-board-icon" aria-hidden="true">
            <Square class="rotate-board-square" strokeWidth={1.9} />
            <svg class="rotate-board-arrows" viewBox="0 0 36 36" fill="none">
              <path d="M21 5c5.8 0 10 4.2 10 10" />
              <path d="M31 15l-3.2-3.2" />
              <path d="M31 15l3.2-3.2" />
              <path d="M15 31c-5.8 0-10-4.2-10-10" />
              <path d="M5 21l3.2 3.2" />
              <path d="M5 21l-3.2 3.2" />
            </svg>
          </span>
        </button>
        <button class="button secondary square pause-toggle" type="button" aria-label={isPaused ? 'Riprendi' : 'Pausa'} on:click={() => (isPaused = !isPaused)}>
          {#if isPaused}
            <Play strokeWidth={1.4} />
          {:else}
            <Pause strokeWidth={1.4} />
          {/if}
        </button>
        <button class="button reveal" type="button" on:click={() => endGame(true)}>
          <ArrowRightToLine size={19} />
          Soluzioni
        </button>
      {:else if activeTab === 'game' && gameMode === 'recap'}
        <button class="button secondary" type="button" on:click={goHome}>
          <Home size={18} />
          Home
        </button>
        <button class="button secondary square share-toggle" type="button" aria-label="Condividi partita" on:click={openExportModal}>
          <Share2 strokeWidth={1.7} />
        </button>
        <button class="button primary" type="button" on:click={startNewGameWithSameSettings}>
          <Play size={18} />
          Prossima Partita
        </button>
      {:else}
        <button class="button primary start-command" type="button" disabled={!$dictionaryStatus.ready} on:click={startFromCommandBar}>
          <Play size={18} />
          Start
        </button>
      {/if}
    </nav>
  </main>
</div>

<LoadingOverlay
  visible={loadingVisible}
  title={loadingTitle}
  detail={loadingDetail}
  progress={gameMode === 'loading' ? calculationProgress : null}
/>

<DictionaryModal
  open={definitionOpen}
  word={selectedDefinitionWord}
  onClose={() => (definitionOpen = false)}
/>

<Modal open={exportOpen} title="Condividi partita" wide onClose={() => (exportOpen = false)}>
  <div class="export-game">
    <textarea readonly rows="12" spellcheck="false" value={exportJson}></textarea>
    <div class="modal-actions">
      <button class="button secondary" type="button" on:click={() => (exportOpen = false)}>Chiudi</button>
      <button class="button primary" type="button" on:click={copyExportJson}>
        <Clipboard size={18} />
        {exportCopied ? 'Copiato' : 'Copia JSON'}
      </button>
    </div>
  </div>
</Modal>

<ConfirmModal
  open={confirmOpen}
  title={confirmTitle}
  message={confirmMessage}
  confirmLabel={confirmLabel}
  danger={confirmDanger}
  onCancel={closeConfirm}
  onConfirm={confirmDialogAction}
/>

{#if toastMessage}
  <div class="toast" role="status">{toastMessage}</div>
{/if}
