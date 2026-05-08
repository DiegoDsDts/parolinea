<script lang="ts">
  import { onMount } from 'svelte';
  import { Check, ChevronDown } from 'lucide-svelte';

  type SelectOption = {
    label: string;
    value: string | number;
  };

  export let value: string | number;
  export let options: SelectOption[] = [];
  export let ariaLabel = 'Seleziona';

  let open = false;
  let root: HTMLElement;
  let trigger: HTMLButtonElement;

  $: selectedOption = options.find((option) => option.value === value) ?? options[0];

  function close() {
    open = false;
  }

  function toggle() {
    open = !open;
  }

  function selectOption(option: SelectOption) {
    value = option.value;
    close();
    trigger?.focus();
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open = true;
    }

    if (event.key === 'Escape') close();
  }

  function handleOptionKeydown(event: KeyboardEvent, option: SelectOption) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(option);
    }

    if (event.key === 'Escape') {
      close();
      trigger?.focus();
    }
  }

  onMount(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (root && !root.contains(event.target as Node)) close();
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  });
</script>

<div class="custom-select" bind:this={root}>
  <button
    bind:this={trigger}
    class:open
    class="select-trigger"
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={ariaLabel}
    on:click={toggle}
    on:keydown={handleTriggerKeydown}
  >
    <span>{selectedOption?.label ?? ''}</span>
    <span class="select-chevron">
      <ChevronDown size={15} strokeWidth={2.4} />
    </span>
  </button>

  {#if open}
    <div class="select-menu" role="listbox" aria-label={ariaLabel}>
      {#each options as option}
        <button
          class:selected={option.value === value}
          class="select-option"
          type="button"
          role="option"
          aria-selected={option.value === value}
          on:click={() => selectOption(option)}
          on:keydown={(event) => handleOptionKeydown(event, option)}
        >
          <span>{option.label}</span>
          {#if option.value === value}
            <Check size={14} strokeWidth={2.5} />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-select {
    position: relative;
    width: 100%;
    min-width: 0;
    margin-top: 0.4rem;
  }

  .select-trigger {
    width: 100%;
    min-height: 2.6rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.35rem;
    padding: 0 0.68rem 0 0.78rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-muted) 86%, var(--surface));
    color: var(--ink);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18);
    font: inherit;
    font-size: clamp(0.86rem, 2.3vw, 1rem);
    font-weight: 850;
    line-height: 1;
    cursor: pointer;
  }

  .select-trigger span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-chevron {
    display: inline-flex;
    color: var(--muted);
    transition: transform 120ms ease;
  }

  .select-trigger.open {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    background: var(--surface);
  }

  .select-trigger.open .select-chevron {
    transform: rotate(180deg);
  }

  .select-menu {
    position: absolute;
    z-index: 50;
    top: calc(100% + 0.34rem);
    left: 0;
    width: max(100%, 8.5rem);
    max-height: min(15rem, 48vh);
    overflow: auto;
    padding: 0.3rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .select-option {
    width: 100%;
    min-height: 2.75rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1rem;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.68rem;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.94rem;
    font-weight: 750;
    text-align: left;
    cursor: pointer;
  }

  .select-option span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-option:hover,
  .select-option:focus-visible {
    background: var(--surface-muted);
  }

  .select-option.selected {
    color: var(--accent-strong);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  @media (max-width: 560px) {
    .select-trigger {
      min-height: 2.9rem;
      padding-inline: 0.82rem 0.72rem;
    }

    .select-option {
      min-height: 3rem;
      font-size: 1rem;
    }
  }
</style>
