<script lang="ts">
  import { ArrowLeft, Monitor, Moon, Sun, UserRound } from 'lucide-svelte';
  import type { ThemePreference } from '../types';

  export let themePreference: ThemePreference = 'system';
  export let playerName = '';
  export let onThemeChange: (theme: ThemePreference) => void = () => {};
  export let onPlayerNameChange: (name: string) => void = () => {};
  export let onBack: () => void = () => {};

  const themeOptions: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
    { value: 'light', label: 'Chiaro', Icon: Sun },
    { value: 'dark', label: 'Scuro', Icon: Moon },
    { value: 'system', label: 'Sistema', Icon: Monitor },
  ];

  function handlePlayerNameInput(event: Event) {
    onPlayerNameChange((event.currentTarget as HTMLInputElement).value);
  }
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

  <label class="settings-tile name-tile row-2 col-1">
    <UserRound size={24} />
    <span>Nome</span>
    <input
      aria-label="Il tuo nome"
      autocomplete="name"
      maxlength="24"
      placeholder="Il tuo nome"
      type="text"
      value={playerName}
      on:input={handlePlayerNameInput}
    />
  </label>
  <div class="settings-tile empty-tile row-2 col-2" aria-hidden="true"></div>
  <div class="settings-tile empty-tile row-2 col-3" aria-hidden="true"></div>

  <button class="settings-tile back-tile" type="button" on:click={onBack}>
    <ArrowLeft size={24} />
    <span>Indietro</span>
    <small>Home</small>
  </button>

  <div class="settings-tile empty-tile row-3 col-2" aria-hidden="true"></div>
  <div class="settings-tile empty-tile row-3 col-3" aria-hidden="true"></div>
</div>

<style>
  .settings-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    background: var(--tile-border);
  }

  .settings-tile {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.34rem;
    padding: clamp(0.42rem, 1.8vw, 0.72rem);
    border: 0;
    border-radius: 0;
    background: var(--tile);
    color: var(--ink);
    box-shadow: none;
    font: inherit;
    text-align: center;
    transition:
      background 120ms ease;
  }

  button.settings-tile {
    cursor: pointer;
  }

  button.settings-tile:hover {
    background: color-mix(in srgb, var(--accent) 8%, var(--tile));
  }

  button.settings-tile.active {
    background: color-mix(in srgb, var(--accent) 12%, var(--tile));
    color: var(--accent-strong);
  }

  .back-tile {
    grid-column: 1;
    grid-row: 3;
  }

  .empty-tile {
    pointer-events: none;
    background: color-mix(in srgb, var(--tile) 68%, var(--surface-muted));
  }

  .name-tile {
    cursor: text;
  }

  .name-tile:focus-within {
    background: color-mix(in srgb, var(--accent) 10%, var(--tile));
    color: var(--accent-strong);
  }

  .name-tile input {
    width: min(100%, 8.5rem);
    min-width: 0;
    height: 1.95rem;
    padding: 0 0.42rem;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    color: var(--ink);
    font-size: clamp(0.72rem, 2.2vw, 0.9rem);
    font-weight: 750;
    line-height: 1;
    text-align: center;
  }

  .name-tile input::placeholder {
    color: var(--muted);
    opacity: 0.8;
  }

  .row-2 {
    grid-row: 2;
  }

  .row-3 {
    grid-row: 3;
  }

  .col-1 {
    grid-column: 1;
  }

  .col-2 {
    grid-column: 2;
  }

  .col-3 {
    grid-column: 3;
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
