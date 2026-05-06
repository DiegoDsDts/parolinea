<script lang="ts">
  import type { FeedbackType } from '../types';

  export let word = '';
  export let feedbackType: FeedbackType = null;
</script>

<div class:valid={feedbackType === 'word-valid'} class:duplicate={feedbackType === 'word-duplicate'} class:invalid={feedbackType === 'word-invalid'} class="current-word">
  {word}
</div>

<style>
  .current-word {
    min-height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    color: var(--ink);
    font-size: 2rem;
    font-weight: 850;
    line-height: 1;
    text-align: right;
    text-transform: uppercase;
    word-break: break-all;
  }

  .valid {
    color: var(--success);
  }

  .duplicate {
    color: var(--warning);
  }

  .invalid {
    color: var(--danger);
  }

  @media (max-width: 520px) {
    .current-word {
      min-height: 3rem;
      font-size: 1.55rem;
    }
  }
</style>
