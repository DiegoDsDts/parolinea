<script lang="ts">
  import type { WordItem } from '../types';

  export let words: WordItem[] = [];
  export let title = '';
  export let emptyText = 'Nessuna parola';
  export let showFoundState = false;
  export let onWordSelect: (word: string) => void = () => {};
</script>

<section class="word-list" aria-label={title || 'Lista parole'}>
  {#if title}
    <header>
      <h2>{title}</h2>
      <span>{words.length}</span>
    </header>
  {/if}

  {#if words.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="words">
      {#each words as item}
        <button
          class:found={showFoundState && item.found}
          class:missed={showFoundState && !item.found}
          class="word-row"
          type="button"
          on:click={() => onWordSelect(item.word)}
        >
          <span>{item.word}</span>
          <strong>{item.displayScore ?? item.score}</strong>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .word-list {
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 0.9rem;
    border-bottom: 1px solid var(--border);
  }

  h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  header span {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .empty {
    margin: 0;
    padding: 1rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .words {
    min-height: 0;
    overflow: auto;
    padding: 0.45rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    align-content: start;
    gap: 0.22rem 0.45rem;
  }

  .word-row {
    min-width: 0;
    height: 1.85rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .word-row:hover {
    background: var(--surface-muted);
  }

  .word-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.92rem;
  }

  .word-row strong {
    flex: 0 0 auto;
    color: var(--muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .word-row.found {
    color: var(--success);
    font-weight: 750;
  }

  .word-row.found strong {
    color: var(--success);
  }

  .word-row.missed {
    color: var(--muted);
  }
</style>
