<script lang="ts">
  import { Monitor, Moon, RefreshCw, Sun } from 'lucide-svelte';
  import type { DictionaryStatus, ThemePreference } from '../types';

  export let themePreference: ThemePreference = 'system';
  export let dictionaryStatus: DictionaryStatus;
  export let onThemeChange: (theme: ThemePreference) => void = () => {};
  export let onReloadDictionary: () => void = () => {};

  const themeOptions: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
    { value: 'light', label: 'Chiaro', Icon: Sun },
    { value: 'dark', label: 'Scuro', Icon: Moon },
    { value: 'system', label: 'Sistema', Icon: Monitor },
  ];
</script>

<section class="settings-view">
  <header>
    <p class="eyebrow">Parolinea</p>
    <h1>Impostazioni</h1>
  </header>

  <section class="settings-panel">
    <h2>Tema</h2>
    <div class="option-list">
      {#each themeOptions as option}
        <button
          class:selected={themePreference === option.value}
          class="option"
          type="button"
          on:click={() => onThemeChange(option.value)}
        >
          <svelte:component this={option.Icon} size={20} />
          <span>{option.label}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="settings-panel">
    <h2>Dizionario</h2>
    <div class="dictionary-row">
      <div>
        <strong>{dictionaryStatus.ready ? dictionaryStatus.wordsLoaded.toLocaleString('it-IT') : '-'}</strong>
        <span>parole caricate</span>
      </div>
      <button class="button secondary" type="button" on:click={onReloadDictionary}>
        <RefreshCw size={18} />
        Ricarica
      </button>
    </div>
  </section>
</section>

<style>
  .settings-view {
    width: min(100%, 48rem);
    margin-inline: auto;
    display: grid;
    gap: 1rem;
  }

  header {
    display: grid;
    gap: 0.2rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--accent-strong);
    font-size: 0.88rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2 {
    font-size: 1rem;
  }

  .settings-panel {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .option-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .option {
    min-width: 0;
    min-height: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-muted);
    color: var(--ink);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }

  .option.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    color: var(--accent-strong);
  }

  .dictionary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .dictionary-row div {
    display: grid;
    gap: 0.15rem;
  }

  .dictionary-row strong {
    font-size: 1.3rem;
    font-variant-numeric: tabular-nums;
  }

  .dictionary-row span {
    color: var(--muted);
    font-size: 0.9rem;
  }

  @media (max-width: 560px) {
    .option-list {
      grid-template-columns: 1fr;
    }

    .dictionary-row {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
