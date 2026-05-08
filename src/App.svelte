<script lang="ts">
  import { onMount } from 'svelte';
  import { Flag, Home, Pause, Play, RotateCcw } from 'lucide-svelte';
  import AphorismCard from './lib/components/AphorismCard.svelte';
  import ConfirmModal from './lib/components/ConfirmModal.svelte';
  import DictionaryModal from './lib/components/DictionaryModal.svelte';
  import GameBoard from './lib/components/GameBoard.svelte';
  import GameTimer from './lib/components/GameTimer.svelte';
  import HomeBoard from './lib/components/HomeBoard.svelte';
  import InfoBoard from './lib/components/InfoBoard.svelte';
  import LoadingOverlay from './lib/components/LoadingOverlay.svelte';
  import SettingsBoard from './lib/components/SettingsBoard.svelte';
  import WordList from './lib/components/WordList.svelte';
  import { dictionaryClient, dictionaryStatus } from './lib/services/dictionaryClient';
  import { generateGameConfig, parseGridSize } from './lib/services/gameConfig';
  import { getWordScore, sortWords } from './lib/services/scoring';
  import type {
    ActiveTab,
    EffectiveTheme,
    FeedbackType,
    GameConfig,
    GameMode,
    ThemePreference,
    WordItem,
  } from './lib/types';

  const THEME_STORAGE_KEY = 'parolinea/theme-preference';

  let activeTab: ActiveTab = 'game';
  let gameMode: GameMode = 'config';
  let gameConfig: GameConfig | null = null;
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
  let timerResetKey = 0;
  let feedbackTimeout: number | null = null;
  let submissionVersion = 0;
  let selectedDefinitionWord = '';
  let definitionOpen = false;
  let toastMessage = '';
  let confirmOpen = false;
  let confirmTitle = '';
  let confirmMessage = '';
  let confirmLabel = 'Conferma';
  let confirmDanger = false;
  let confirmAction: (() => void) | null = null;
  let confirmShouldResume = false;
  let homeStartSignal = 0;

  let themePreference: ThemePreference = 'system';
  let systemTheme: EffectiveTheme = 'light';

  $: effectiveTheme = themePreference === 'system' ? systemTheme : themePreference;
  $: document.documentElement.dataset.theme = effectiveTheme;
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
  $: wordPercent = allSolutionsList.length > 0 ? Math.round((foundWordsList.length / allSolutionsList.length) * 100) : 0;
  $: recapGridSize = gameConfig ? parseGridSize(gameConfig.grid_size) : 4;
  $: staticTileFont = `calc(var(--board-size) * ${0.45 / recapGridSize})`;
  $: loadingVisible = $dictionaryStatus.loading || gameMode === 'loading';
  $: loadingTitle = gameMode === 'loading' ? 'Creazione dello schema' : 'Avvio di Parolinea';
  $: loadingDetail =
    gameMode === 'loading'
      ? `Analisi soluzioni: ${calculationWordsFound.toLocaleString('it-IT')} parole candidate`
      : $dictionaryStatus.wordsLoaded > 0
        ? `${$dictionaryStatus.wordsLoaded.toLocaleString('it-IT')} parole caricate`
        : 'Caricamento dizionario italiano';

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
    gameActive = false;
    isPaused = false;
    calculationProgress = 0;
    calculationWordsFound = 0;
  }

  async function startNewGame(config: GameConfig) {
    dictionaryClient.cancelSolve();
    resetRoundState();
    gameConfig = config;
    board = config.board_letters;
    gameMode = 'loading';
    activeTab = 'game';

    try {
      const gridSize = parseGridSize(config.grid_size);
      const solutions = await dictionaryClient.solveBoard(
        config.board_letters.flat(),
        gridSize,
        config.min_word_length,
        ({ progress, wordsFound }) => {
          calculationProgress = progress;
          calculationWordsFound = wordsFound;
        },
      );

      allSolutionsList = solutions;
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

  function handleDicePress(index: number) {
    if (!gameActive || isPaused) return;
    clearFeedbackTimer();
    submissionVersion += 1;
    feedbackType = null;
    selectedIndices = [index];
    updateCurrentWord(selectedIndices);
  }

  function handleDiceMove(index: number) {
    if (!gameActive || isPaused || selectedIndices.includes(index)) return;
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

  async function submitCurrentWord() {
    if (!gameConfig) return;
    const version = submissionVersion + 1;
    submissionVersion = version;
    const submittedWord = currentWord.toLowerCase();

    try {
      const isValid = await dictionaryClient.checkWord(submittedWord);
      if (submissionVersion !== version) return;

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
    board = [];
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
        title: 'Termina partita',
        message: 'Vuoi chiudere la partita e vedere il riepilogo?',
        confirmLabel: 'Termina',
        danger: true,
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

  function restartWithSameConfig() {
    if (gameConfig) startNewGame(gameConfig);
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
            <strong>{totalScore} / {allSolutionsList.length > 0 ? totalPossibleScore : '?'}</strong>
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
            <strong>{foundWordsList.length} / {allSolutionsList.length}</strong>
            <span>{wordPercent}% parole</span>
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
                {board}
                {selectedIndices}
                {feedbackType}
                gridSize={parseGridSize(gameConfig.grid_size)}
                {isPaused}
                onDiceSelectStart={handleDicePress}
                onDiceSelectMove={handleDiceMove}
                onDiceSelectEnd={handleDiceRelease}
              />
            </div>
          {:else if gameMode === 'recap' && gameConfig}
            <div class="static-board" style={`--grid-size: ${recapGridSize}; --static-tile-font: ${staticTileFont};`}>
              {#each board as row}
                {#each row as letter}
                  <div class="static-tile">{letter}</div>
                {/each}
              {/each}
            </div>
          {/if}
        {:else if activeTab === 'info'}
          <InfoBoard />
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
        <button class="button secondary square" type="button" aria-label={isPaused ? 'Riprendi' : 'Pausa'} on:click={() => (isPaused = !isPaused)}>
          {#if isPaused}
            <Play size={19} />
          {:else}
            <Pause size={19} />
          {/if}
        </button>
        <button class="button danger" type="button" on:click={() => endGame(true)}>
          <Flag size={17} />
          Fine
        </button>
      {:else if activeTab === 'game' && gameMode === 'recap'}
        <button class="button secondary" type="button" on:click={goHome}>
          <Home size={18} />
          Home
        </button>
        <button class="button primary" type="button" on:click={restartWithSameConfig}>
          <RotateCcw size={18} />
          Rigioca
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
