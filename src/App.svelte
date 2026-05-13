<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRightToLine, Clipboard, Home, Pause, Play, RotateCcw, Share2, Square } from 'lucide-svelte';
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
    getBoardLetters,
    getChallengeFrom,
    getSolutionScoreRange,
    normalizeGameConfig,
    parseGridSize,
    type SolutionScoreRange,
  } from './lib/services/gameConfig';
  import { getWordScore } from './lib/services/scoring';
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
  const PLAYER_NAME_STORAGE_KEY = 'parolinea/player-name';
  const TARGETED_BOARD_ATTEMPT_LIMIT = 240;
  const RANDOM_BOARD_ATTEMPT_LIMIT = 240;

  let activeTab: ActiveTab = 'game';
  let gameMode: GameMode = 'config';
  let gameConfig: GameConfig | null = null;
  let pendingChallengeConfig: GameConfig | null = null;
  let pendingChallengeOptions: StartGameOptions = {};
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
  let playerName = '';
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
  $: activeChallengeFrom = gameConfig ? getChallengeFrom(gameConfig) : null;
  $: pendingChallengeFrom = pendingChallengeConfig ? getChallengeFrom(pendingChallengeConfig) : null;
  $: recapGridSize = gameConfig ? parseGridSize(gameConfig['grid-size']) : 4;
  $: staticTileFont = `calc(var(--board-size) * ${0.5 / recapGridSize})`;
  $: gameFinished = activeTab === 'game' && gameMode === 'finished';
  $: displayPlayerName = playerName.trim();
  $: playerNameFontSize = displayPlayerName
    ? `clamp(0.58rem, min(calc(var(--board-size) * 0.036), ${17 / Math.max(displayPlayerName.length, 1)}rem), 1.08rem)`
    : '1rem';
  $: loadingVisible = $dictionaryStatus.loading || gameMode === 'loading';
  $: loadingTitle = gameMode === 'loading' ? 'Creazione dello schema' : 'Avvio di Parolinea';
  $: loadingDetail =
    gameMode === 'loading'
      ? `${generationAttempt > 1 ? `Tentativo ${generationAttempt}: ` : ''}`
      : $dictionaryStatus.wordsLoaded > 0
        ? `${$dictionaryStatus.wordsLoaded.toLocaleString('it-IT')} parole caricate`
        : 'Caricamento dizionario italiano';
  $: exportJson = gameConfig ? JSON.stringify(createSharedGameConfig(gameConfig, totalScore, displayPlayerName), null, 2) : '';

  onMount(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      themePreference = savedTheme;
    }

    playerName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? '';

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

  function setPlayerName(nextName: string) {
    playerName = nextName.trimStart().slice(0, 24);
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
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

  function createSharedGameConfig(config: GameConfig, points: number, name: string): GameConfig {
    const normalizedConfig = normalizeGameConfig(config);
    return {
      ...normalizedConfig,
      from: {
        played: true,
        name: name || 'Giocatore',
        points,
      },
    };
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
      const gridSize = parseGridSize(config['grid-size']);
      generationTargetRange = getSolutionScoreRange(options.wordQuantityMode ?? 'random', gridSize, config['min-word-length']);
      const maxAttempts = generationTargetRange ? TARGETED_BOARD_ATTEMPT_LIMIT : RANDOM_BOARD_ATTEMPT_LIMIT;
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
            : generateGameConfig(gridSize, config['min-word-length'], config['duration-sec']);
        const candidateBoardLetters = getBoardLetters(candidateConfig);
        const solutions = await dictionaryClient.solveBoard(
          candidateBoardLetters.flat(),
          gridSize,
          candidateConfig['min-word-length'],
          ({ progress, wordsFound }) => {
            calculationProgress = progress;
            calculationWordsFound = wordsFound;
          },
        );

        if (generationVersion !== currentGenerationVersion) return;

        if (solutions.length === 0) {
          continue;
        }

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

      if (selectedSolutions.length === 0) {
        throw new Error('Non sono riuscito a generare uno schema con soluzioni. Riprova.');
      }

      gameConfig = selectedConfig;
      boardCells = createBoardCells(getBoardLetters(selectedConfig));
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

  function requestStartGame(config: GameConfig, options: StartGameOptions = {}) {
    const challengeFrom = getChallengeFrom(config);
    if (challengeFrom) {
      pendingChallengeConfig = config;
      pendingChallengeOptions = { ...options };
      gameMode = 'challenge';
      activeTab = 'game';
      return;
    }

    startNewGame(config, options);
  }

  function startPendingChallenge() {
    if (!pendingChallengeConfig) return;
    const config = pendingChallengeConfig;
    const options = pendingChallengeOptions;
    pendingChallengeConfig = null;
    pendingChallengeOptions = {};
    startNewGame(config, options);
  }

  function isAdjacent(indexA: number, indexB: number): boolean {
    if (!gameConfig) return false;
    const gridSize = parseGridSize(gameConfig['grid-size']);
    const rowA = Math.floor(indexA / gridSize);
    const colA = indexA % gridSize;
    const rowB = Math.floor(indexB / gridSize);
    const colB = indexB % gridSize;

    return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
  }

  function updateCurrentWord(indices: number[]) {
    if (!gameConfig) return;
    const gridSize = parseGridSize(gameConfig['grid-size']);
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

  function finishGame() {
    clearFeedbackTimer();
    selectedIndices = [];
    currentWord = '';
    feedbackType = null;
    lastSubmittedWordIndices = null;
    gameActive = false;
    isPaused = false;
    gameMode = 'finished';
  }

  function showSolutions() {
    clearFeedbackTimer();
    selectedIndices = [];
    currentWord = '';
    feedbackType = null;
    gameActive = false;
    isPaused = false;
    gameMode = 'recap';
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

    if (currentWord.length >= gameConfig['min-word-length']) {
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
          const score = getWordScore(submittedWord, gameConfig['min-word-length']);
          const nextFoundWords = new Set(foundWords).add(submittedWord);
          const nextFoundWordsList = [{ word: submittedWord, score }, ...foundWordsList];
          foundWords = nextFoundWords;
          foundWordsList = nextFoundWordsList;
          feedbackType = 'word-valid';

          if (allSolutionsList.length > 0 && nextFoundWordsList.length >= allSolutionsList.length) {
            clearFeedbackTimer();
            feedbackTimeout = window.setTimeout(() => {
              feedbackTimeout = null;
              finishGame();
            }, 260);
            return;
          }
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
    pendingChallengeConfig = null;
    pendingChallengeOptions = {};
    boardCells = [];
    gameMode = 'config';
    activeTab = 'game';
  }

  function cancelLoadingAndGoHome() {
    generationVersion += 1;
    completeGoHome();
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
        onConfirm: showSolutions,
      });
      return;
    }

    finishGame();
  }

  function startNewGameWithSameSettings() {
    if (!gameConfig) return;
    const gridSize = parseGridSize(gameConfig['grid-size']);
    startNewGame(
      generateGameConfig(gridSize, gameConfig['min-word-length'], gameConfig['duration-sec']),
      lastGameOptions,
    );
  }

  function restartSameBoard() {
    if (!gameConfig) return;
    const nextGameOptions = { ...lastGameOptions };
    startNewGame(gameConfig, { wordQuantityMode: 'random' });
    lastGameOptions = nextGameOptions;
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
      <div class="board-info" class:home-info={activeTab === 'game' && gameMode === 'config' && !!displayPlayerName}>
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
            <strong class="score-summary">
              <span class="score-points">{totalScore} / {allSolutionsList.length > 0 ? totalPossibleScore : '?'}</span>
              <span class="score-percent">{allSolutionsList.length > 0 ? scorePercent : '?'}%</span>
            </strong>
            {#if activeChallengeFrom}
              <span class="challenge-target">{activeChallengeFrom.name}: {activeChallengeFrom.points.toLocaleString('it-IT')} pt</span>
            {/if}
            <GameTimer
              seconds={gameConfig['duration-sec']}
              active={gameActive}
              paused={isPaused}
              resetKey={timerResetKey}
              onEnd={() => endGame(false)}
            />
          </div>
        {:else if activeTab === 'game' && gameMode === 'challenge' && pendingChallengeFrom}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Sfida</span>
          </div>
          <div class="board-meta challenge-meta">
            <span class="challenge-target">{pendingChallengeFrom.points.toLocaleString('it-IT')} pt</span>
          </div>
        {:else if activeTab === 'game' && gameMode === 'finished'}
          <div class="board-title">
            <strong>Fine partita</strong>
            <span>{foundWordsList.length} / {allSolutionsList.length} parole</span>
          </div>
          <div class="board-meta">
            <strong class="score-summary">
              <span class="score-points">{totalScore} / {totalPossibleScore}</span>
              <span class="score-percent">{scorePercent}%</span>
            </strong>
          </div>
        {:else if activeTab === 'game' && gameMode === 'recap'}
          <div class="board-title">
            <strong>Parolinea</strong>
            <span>Riepilogo</span>
          </div>
          <div class="board-meta">
            <strong class="score-summary">
              <span class="score-points">{totalScore} / {totalPossibleScore}</span>
              <span class="score-percent">{scorePercent}%</span>
            </strong>
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
          <div class="board-meta home-player-meta" aria-hidden={!displayPlayerName}>
            {#if displayPlayerName}
              <span class="player-name" style={`--player-name-font-size: ${playerNameFontSize};`}>{displayPlayerName}</span>
            {/if}
          </div>
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
              onStart={requestStartGame}
              onInfo={() => setActiveTab('info')}
              onSettings={() => setActiveTab('settings')}
            />
          {:else if gameMode === 'challenge' && pendingChallengeFrom}
            <section class="challenge-board" aria-label="Sfida ricevuta">
              <span class="challenge-kicker">Sfida ricevuta</span>
              <h1>{pendingChallengeFrom.name}</h1>
              <p>ha totalizzato</p>
              <strong>{pendingChallengeFrom.points.toLocaleString('it-IT')} pt</strong>
              <button class="button primary" type="button" on:click={startPendingChallenge}>
                <Play size={18} />
                Inizia sfida
              </button>
            </section>
          {:else if (gameMode === 'play' || gameMode === 'finished') && gameConfig}
            <div class="play-board-slot" class:finished={gameFinished}>
              <GameBoard
                {boardCells}
                {selectedIndices}
                {feedbackType}
                gridSize={parseGridSize(gameConfig['grid-size'])}
                {isPaused}
                disabled={gameFinished}
                onDiceSelectStart={handleDicePress}
                onDiceSelectMove={handleDiceMove}
                onDiceSelectEnd={handleDiceRelease}
                onDiceTap={handleDiceTap}
              />
            </div>
          {:else if gameMode === 'recap' && gameConfig}
            <div class="static-board" style={`--grid-size: ${recapGridSize}; --static-tile-font: ${staticTileFont};`}>
              {#each getBoardLetters(gameConfig) as row}
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
            {playerName}
            onThemeChange={setThemePreference}
            onPlayerNameChange={setPlayerName}
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
      {:else if activeTab === 'game' && gameMode === 'finished'}
        <section class="finished-panel" aria-label="Partita finita">
          <button class="finished-solutions" type="button" on:click={showSolutions}>
            <span class="finished-kicker">Partita finita</span>
            <strong>Vedi soluzioni</strong>
            <span class="finished-detail">{foundWordsList.length} parole trovate su {allSolutionsList.length}</span>
            <span class="finished-icon" aria-hidden="true">
              <ArrowRightToLine strokeWidth={1.8} />
            </span>
          </button>
        </section>
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
        <button class="button secondary square home-toggle" type="button" aria-label="Home" on:click={goHome}>
          <Home strokeWidth={1.8} />
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
      {:else if activeTab === 'game' && gameMode === 'finished'}
        <button class="button secondary square home-toggle" type="button" aria-label="Home" on:click={goHome}>
          <Home strokeWidth={1.8} />
        </button>
        <button class="button secondary square share-toggle" type="button" aria-label="Condividi partita" on:click={openExportModal}>
          <Share2 strokeWidth={1.7} />
        </button>
        <button class="button secondary square replay-toggle" type="button" aria-label="Rigioca schema" on:click={restartSameBoard}>
          <RotateCcw strokeWidth={1.8} />
        </button>
        <button class="button primary" type="button" on:click={startNewGameWithSameSettings}>
          <Play size={18} />
          Prossima Partita
        </button>
      {:else if activeTab === 'game' && gameMode === 'challenge'}
        <button class="button secondary square home-toggle" type="button" aria-label="Home" on:click={goHome}>
          <Home strokeWidth={1.8} />
        </button>
      {:else if activeTab === 'game' && gameMode === 'recap'}
        <button class="button secondary square home-toggle" type="button" aria-label="Home" on:click={goHome}>
          <Home strokeWidth={1.8} />
        </button>
        <button class="button secondary square share-toggle" type="button" aria-label="Condividi partita" on:click={openExportModal}>
          <Share2 strokeWidth={1.7} />
        </button>
        <button class="button secondary square replay-toggle" type="button" aria-label="Rigioca schema" on:click={restartSameBoard}>
          <RotateCcw strokeWidth={1.8} />
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
  onCancel={gameMode === 'loading' ? cancelLoadingAndGoHome : null}
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
