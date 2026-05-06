<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formatDuration } from '../services/gameConfig';

  export let seconds = 0;
  export let active = false;
  export let paused = false;
  export let resetKey = 0;
  export let onEnd: () => void = () => {};

  let remaining = seconds;
  let previousResetKey = resetKey;
  let endSent = false;
  let intervalId: number | null = null;

  function clearTimer() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  $: if (resetKey !== previousResetKey) {
    previousResetKey = resetKey;
    remaining = seconds;
    endSent = false;
  }

  $: {
    clearTimer();
    if (active && !paused && seconds > 0 && remaining > 0) {
      intervalId = window.setInterval(() => {
        remaining = Math.max(0, remaining - 1);
      }, 1000);
    }
  }

  $: if (active && seconds > 0 && remaining === 0 && !endSent) {
    endSent = true;
    clearTimer();
    onEnd();
  }

  onDestroy(clearTimer);
</script>

<span class="timer" class:paused aria-label="Tempo rimasto">
  {seconds === 0 ? '∞' : formatDuration(remaining)}
</span>

<style>
  .timer {
    min-width: 4.2rem;
    display: inline-flex;
    justify-content: flex-end;
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  .timer.paused {
    color: var(--muted);
  }
</style>
