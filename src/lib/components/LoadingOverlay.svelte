<script lang="ts">
  export let visible = false;
  export let title = 'Caricamento';
  export let detail = '';
  export let progress: number | null = null;
</script>

{#if visible}
  <div class="loading-overlay" role="status" aria-live="polite">
    <div class="loading-panel">
      <div class="loader" aria-hidden="true"></div>
      <div class="loading-copy">
        <strong>{title}</strong>
        {#if detail}
          <span>{detail}</span>
        {/if}
      </div>
      {#if progress !== null}
        <div class="progress-track" aria-label="Avanzamento">
          <div class="progress-bar" style={`width: ${Math.max(0, Math.min(100, progress * 100))}%`}></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: color-mix(in srgb, var(--background) 82%, transparent);
    backdrop-filter: blur(8px);
  }

  .loading-panel {
    width: min(100%, 24rem);
    display: grid;
    gap: 1rem;
    justify-items: center;
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .loader {
    width: 2.25rem;
    height: 2.25rem;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 0;
    animation: spin 0.8s linear infinite;
  }

  .loading-copy {
    display: grid;
    gap: 0.35rem;
    text-align: center;
  }

  .loading-copy strong {
    font-size: 1.05rem;
  }

  .loading-copy span {
    color: var(--muted);
    font-size: 0.92rem;
  }

  .progress-track {
    width: 100%;
    height: 0.45rem;
    overflow: hidden;
    border-radius: 0;
    background: var(--surface-muted);
  }

  .progress-bar {
    height: 100%;
    border-radius: 0;
    background: var(--accent);
    transition: width 120ms ease;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
