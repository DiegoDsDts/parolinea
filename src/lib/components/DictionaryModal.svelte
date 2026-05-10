<script lang="ts">
  import { ExternalLink } from 'lucide-svelte';
  import Modal from './Modal.svelte';

  export let open = false;
  export let word = '';
  export let onClose: () => void = () => {};

  $: normalizedWord = word.toLowerCase();
  $: sources = [
    {
      label: 'Google',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${normalizedWord} significato`)}`,
    },
    {
      label: 'Wikizionario',
      url: `https://it.wiktionary.org/wiki/${encodeURIComponent(normalizedWord)}`,
    },
    {
      label: 'Dizy',
      url: `https://www.dizy.com/it/voce/${encodeURIComponent(normalizedWord)}`,
    },
  ];
</script>

<Modal {open} title={word ? word.toUpperCase() : 'Parola'} onClose={onClose}>
  <div class="sources">
    {#each sources as source}
      <a class="source-link" href={source.url} target="_blank" rel="noreferrer">
        <span>{source.label}</span>
        <ExternalLink size={16} />
      </a>
    {/each}
  </div>
</Modal>

<style>
  .sources {
    display: grid;
    gap: 0.6rem;
  }

  .source-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface-muted);
    color: var(--ink);
    font-weight: 750;
    text-decoration: none;
  }

  .source-link:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
</style>
