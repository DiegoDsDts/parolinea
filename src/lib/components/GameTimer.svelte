<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formatDuration } from '../services/gameConfig';

  export let seconds = 0;
  export let countUp = false;
  export let trackElapsed = false;
  export let active = false;
  export let paused = false;
  export let resetKey = 0;
  export let bonusSeconds = 0;
  export let bonusKey = 0;
  export let onEnd: () => void = () => {};
  export let onTick: (elapsedSeconds: number) => void = () => {};
  export let onRemainingTick: (remainingSeconds: number) => void = () => {};

  let remaining = seconds;
  let elapsed = 0;
  let previousResetKey = resetKey;
  let previousBonusKey = bonusKey;
  let endSent = false;
  let intervalId: number | null = null;

  function clearTimer() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function formatElapsed(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  $: if (resetKey !== previousResetKey) {
    previousResetKey = resetKey;
    remaining = seconds;
    elapsed = 0;
    endSent = false;
    onTick(0);
    onRemainingTick(seconds);
  }

  $: if (bonusKey !== previousBonusKey) {
    previousBonusKey = bonusKey;
    if (!countUp && active && seconds > 0 && bonusSeconds > 0) {
      remaining += bonusSeconds;
      onRemainingTick(remaining);
    }
  }

  $: {
    clearTimer();
    if (active && !paused && countUp) {
      intervalId = window.setInterval(() => {
        elapsed += 1;
        onTick(elapsed);
      }, 1000);
    } else if (active && !paused && seconds > 0 && remaining > 0) {
      intervalId = window.setInterval(() => {
        if (trackElapsed) {
          elapsed += 1;
          onTick(elapsed);
        }
        const nextRemaining = Math.max(0, remaining - 1);
        remaining = nextRemaining;
        onRemainingTick(nextRemaining);
      }, 1000);
    }
  }

  $: if (!countUp && active && seconds > 0 && remaining === 0 && !endSent) {
    endSent = true;
    clearTimer();
    onEnd();
  }

  $: urgent = !countUp && active && !paused && seconds > 0 && remaining > 0 && remaining <= 10;

  onDestroy(clearTimer);
</script>

<span class="timer" class:paused class:urgent aria-label={countUp ? 'Tempo trascorso' : 'Tempo rimasto'}>
  {countUp ? formatElapsed(elapsed) : seconds === 0 ? '∞' : formatDuration(remaining)}
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

  .timer.urgent {
    color: var(--warning);
    animation: timer-urgent 420ms ease-in-out infinite alternate;
  }

  @keyframes timer-urgent {
    from {
      transform: scale(1);
      text-shadow: 0 0 0 color-mix(in srgb, var(--warning) 0%, transparent);
    }

    to {
      transform: scale(1.08);
      text-shadow: 0 0 0.75rem color-mix(in srgb, var(--warning) 58%, transparent);
    }
  }
</style>
