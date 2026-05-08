<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { WordItem } from '../types';

  export let words: WordItem[] = [];
  export let title = '';
  export let emptyText = 'Nessuna parola';
  export let showFoundState = false;
  export let onWordSelect: (word: string) => void = () => {};

  let wordsElement: HTMLDivElement;
  let canScrollRight = false;
  let updateQueued = false;

  function updateScrollHint() {
    if (!wordsElement) {
      canScrollRight = false;
      return;
    }

    canScrollRight = wordsElement.scrollLeft + wordsElement.clientWidth < wordsElement.scrollWidth - 2;
  }

  function scheduleScrollHintUpdate() {
    if (updateQueued) return;
    updateQueued = true;

    tick().then(() => {
      updateQueued = false;
      updateScrollHint();
    });
  }

  $: {
    words;
    scheduleScrollHintUpdate();
  }

  onMount(() => {
    updateScrollHint();
    window.addEventListener('resize', scheduleScrollHintUpdate);

    return () => {
      window.removeEventListener('resize', scheduleScrollHintUpdate);
    };
  });
</script>

<section class:can-scroll-right={canScrollRight} class="word-list" aria-label={title || 'Lista parole'}>
  {#if words.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div bind:this={wordsElement} class="words" on:scroll={updateScrollHint}>
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
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .word-list::after {
    content: "";
    position: absolute;
    top: 1px;
    right: 1px;
    bottom: 1px;
    z-index: 2;
    width: 2.35rem;
    border-radius: 0 7px 7px 0;
    background: linear-gradient(to right, transparent, var(--surface) 78%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }

  .word-list.can-scroll-right::after {
    opacity: 1;
  }

  .empty {
    margin: 0;
    padding: 1rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .words {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.45rem;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    grid-template-rows: repeat(auto-fill, minmax(1.85rem, 1.85rem));
    align-content: start;
    justify-content: start;
    gap: 0.22rem 0.7rem;
  }

  .word-row {
    min-width: 0;
    height: 1.85rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    justify-content: start;
    justify-self: stretch;
    gap: 0.36rem;
    padding: 0 0.36rem;
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
    white-space: nowrap;
    font-size: 0.92rem;
  }

  .word-row strong {
    flex: 0 0 auto;
    justify-self: end;
    color: var(--muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .word-row.found {
    background: var(--success);
    color: white;
    font-weight: 750;
  }

  .word-row.found strong {
    color: white;
  }

  .word-row.found:hover {
    background: var(--accent-strong);
  }

  .word-row.missed {
    color: var(--muted);
  }
</style>
