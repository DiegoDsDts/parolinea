<script lang="ts">
  import { ArrowLeft, Monitor, Moon, Sun } from 'lucide-svelte';
  import type { ThemePreference } from '../types';

  export let themePreference: ThemePreference = 'system';
  export let onThemeChange: (theme: ThemePreference) => void = () => {};
  export let onBack: () => void = () => {};

  const themeOptions: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
    { value: 'light', label: 'Chiaro', Icon: Sun },
    { value: 'dark', label: 'Scuro', Icon: Moon },
    { value: 'system', label: 'Sistema', Icon: Monitor },
  ];
</script>

<div class="settings-board" aria-label="Impostazioni">
  {#each themeOptions as option}
    <button
      class:active={themePreference === option.value}
      class="settings-tile"
      type="button"
      on:click={() => onThemeChange(option.value)}
    >
      <svelte:component this={option.Icon} size={24} />
      <span>{option.label}</span>
      <small>Tema</small>
    </button>
  {/each}

  <button class="settings-tile back-tile" type="button" on:click={onBack}>
    <ArrowLeft size={24} />
    <span>Indietro</span>
    <small>Home</small>
  </button>
</div>

<style>
  .settings-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: var(--board-gap);
  }

  .settings-tile {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.34rem;
    padding: clamp(0.42rem, 1.8vw, 0.72rem);
    border: 1px solid var(--tile-border);
    border-radius: 6px;
    background: var(--tile);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    text-align: center;
  }

  button.settings-tile {
    cursor: pointer;
  }

  button.settings-tile.active {
    border-color: color-mix(in srgb, var(--accent) 48%, var(--tile-border));
    background: color-mix(in srgb, var(--accent) 12%, var(--tile));
    color: var(--accent-strong);
  }

  .back-tile {
    grid-column: 1;
    grid-row: 3;
  }

  .settings-tile span {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: clamp(0.76rem, 2.5vw, 1.02rem);
    font-weight: 850;
    line-height: 1;
  }

  .settings-tile small {
    color: var(--muted);
    font-size: clamp(0.58rem, 1.8vw, 0.76rem);
    font-weight: 750;
    line-height: 1.1;
  }
</style>
