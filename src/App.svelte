<script lang="ts">
  import { onMount } from 'svelte';
  import { BookOpen, Gamepad2, Settings } from 'lucide-svelte';
  import DictionaryModal from './lib/components/DictionaryModal.svelte';
  import GameSetup from './lib/components/GameSetup.svelte';
  import GameView from './lib/components/GameView.svelte';
  import InfoView from './lib/components/InfoView.svelte';
  import LoadingOverlay from './lib/components/LoadingOverlay.svelte';
  import RecapView from './lib/components/RecapView.svelte';
  import SettingsView from './lib/components/SettingsView.svelte';
  import { dictionaryClient, dictionaryStatus } from './lib/services/dictionaryClient';
  import { parseGridSize } from './lib/services/gameConfig';
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
  const tabs: Array<{ id: ActiveTab; label: string; Icon: typeof Gamepad2 }> = [
    { id: 'game', label: 'Gioca', Icon: Gamepad2 },
    { id: 'info', label: 'Info', Icon: BookOpen },
    { id: 'settings', label: 'Impostazioni', Icon: Settings },
  ];

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

  let themePreference: ThemePreference = 'system';
  let systemTheme: EffectiveTheme = 'light';

  $: effectiveTheme = themePreference === 'system' ? systemTheme : themePreference;
  $: document.documentElement.dataset.theme = effectiveTheme;
  $: totalScore = foundWordsList.reduce((sum, item) => sum + item.score, 0);
  $: totalPossibleScore = allSolutionsList.reduce((sum, item) => sum + item.score, 0);
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

  function goHome() {
    if (gameMode === 'play') {
      const confirmed = window.confirm(
        'Sei sicuro di voler tornare alla schermata iniziale? La partita in corso verra persa.',
      );
      if (!confirmed) return;
    }

    dictionaryClient.cancelSolve();
    resetRoundState();
    gameConfig = null;
    board = [];
    gameMode = 'config';
    activeTab = 'game';
  }

  function endGame(manual: boolean) {
    if (manual) {
      const confirmed = window.confirm('Sei sicuro di voler terminare la partita?');
      if (!confirmed) return;
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
  <header class="app-header">
    <div class="brand">
      <span aria-hidden="true">P</span>
      <div>
        <strong>Parolinea</strong>
        <small>Gioco di parole</small>
      </div>
    </div>

    <nav class="top-tabs" aria-label="Navigazione principale">
      {#each tabs as tab}
        <button class:active={activeTab === tab.id} type="button" on:click={() => setActiveTab(tab.id)}>
          <svelte:component this={tab.Icon} size={18} />
          {tab.label}
        </button>
      {/each}
    </nav>
  </header>

  <main class:play-main={activeTab === 'game' && gameMode === 'play'} class="app-main">
    {#if activeTab === 'game'}
      {#if $dictionaryStatus.error}
        <section class="error-panel">
          <h1>Dizionario non disponibile</h1>
          <p>{$dictionaryStatus.error}</p>
          <button class="button primary" type="button" on:click={reloadDictionary}>Riprova</button>
        </section>
      {:else if gameMode === 'config'}
        <GameSetup dictionaryStatus={$dictionaryStatus} onStart={startNewGame} />
      {:else if gameMode === 'play' && gameConfig}
        <GameView
          {gameConfig}
          {board}
          {selectedIndices}
          {currentWord}
          {feedbackType}
          {foundWordsList}
          {totalScore}
          {totalPossibleScore}
          allSolutionsCount={allSolutionsList.length}
          {gameActive}
          {isPaused}
          {timerResetKey}
          onDiceSelectStart={handleDicePress}
          onDiceSelectMove={handleDiceMove}
          onDiceSelectEnd={handleDiceRelease}
          onHome={goHome}
          onPauseToggle={() => (isPaused = !isPaused)}
          onEndGame={endGame}
          onWordSelect={openDefinition}
        />
      {:else if gameMode === 'recap' && gameConfig}
        <RecapView
          {foundWordsList}
          {allSolutionsList}
          {board}
          {gameConfig}
          onHome={goHome}
          onRestart={restartWithSameConfig}
          onWordSelect={openDefinition}
        />
      {/if}
    {:else if activeTab === 'info'}
      <InfoView />
    {:else}
      <SettingsView
        {themePreference}
        dictionaryStatus={$dictionaryStatus}
        onThemeChange={setThemePreference}
        onReloadDictionary={reloadDictionary}
      />
    {/if}
  </main>

  <nav class="bottom-tabs" aria-label="Navigazione principale mobile">
    {#each tabs as tab}
      <button class:active={activeTab === tab.id} type="button" on:click={() => setActiveTab(tab.id)}>
        <svelte:component this={tab.Icon} size={20} />
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>
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

{#if toastMessage}
  <div class="toast" role="status">{toastMessage}</div>
{/if}
