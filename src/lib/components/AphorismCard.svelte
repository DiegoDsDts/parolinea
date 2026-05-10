<script lang="ts">
  import { onMount, tick } from 'svelte';

  const APHORISMS = [
    {
      text: "Nell'oscurità le parole pesano il doppio.",
      author: 'Elias Canetti',
    },
    {
      text: 'Frasi in una sola parola. Frasi interminabili.',
      author: 'Elias Canetti',
    },
    {
      text: 'Non ci sono più parole potenti. Capita di dire "Dio" solo per pronunciare una parola che una volta era potente.',
      author: 'Elias Canetti',
    },
    {
      text: 'Talvolta ho la sensazione che le parole siano tutte prive di valore, e mi domando perché ho vissuto. Ma non trovo risposte. E l\'intensità della domanda a poco a poco viene meno, e io mi siedo alla scrivania ed è di nuovo a far parole.',
      author: 'Elias Canetti',
    },
    {
      text: 'Ogni frase può avere il suo effetto, anche la più dimenticata, anche fra mille anni.',
      author: 'Elias Canetti',
    },
    {
      text: 'Le semplici parole non bastano. Devono trasmettere il colore, il fascino e il battito della vita. Devono avere un guizzo di arguzia che produca un suono bonario come una risata attraverso il buco della serratura della mente del lettore.',
      author: 'Corra Harris',
    },
    {
      text: 'Le parole iniziarono i combattimenti e le parole li posero fine.',
      author: 'Marjorie Kinnan Rawlings',
    },
    {
      text: 'Non scelgo la parola giusta, elimino quella sbagliata.',
      author: 'Alfred Edward Housman',
    },
    {
      text: 'C\'è un potere nelle parole. C\'è un potere nell\'essere in grado di spiegare, descrivere e articolare ciò che sai, senti e credi riguardo al mondo e a te stesso.',
      author: 'Tracy Chapman',
    },
    {
      text: 'Le parole possono schiacciare cose che non si vedono.',
      author: 'Jewel Kilcher',
    },
    {
      text: 'I pensieri muoiono nel momento in cui prendono forma le parole.',
      author: 'Arthur Schopenhauer',
    },
    {
      text: 'Che colpa abbiamo, io e voi, se le parole, per sé, sono vuote? Vuote, caro mio. E voi le riempite del senso vostro, nel dirmele; e io nell\'accoglierle, inevitabilmente, le riempio del senso mio. Abbiamo creduto d\'intenderci, non ci siamo intesi affatto.',
      author: 'Luigi Pirandello',
    },
    {
      text: 'Ogni parola pronunciata è falsa. Ogni parola scritta è falsa. Ogni parola, è falsa. Ma cosa c\'è senza la parola?',
      author: 'Elias Canetti',
    },
    {
      text: 'Le parole sono la più potente droga usata dall\'uomo.',
      author: 'Rudyard Kipling',
    },
    {
      text: 'Non conosco nulla al mondo che abbia tanto potere quanto la parola. A volte ne scrivo una, e la guardo, fino a quando non comincia a splendere.',
      author: 'Emily Dickinson',
    },
    {
      text: 'Dicono di più su un’epoca le parole che non si usano più che le parole che si abusano.',
      author: 'Stanislaw Jerzy Lec',
    },
    {
      text: 'Quando pronuncio la parola Futuro\nla prima sillaba va già nel passato.\nQuando pronuncio la parola Silenzio,\nlo distruggo.\nQuando pronuncio la parola Niente,\ncreo qualche cosa che non entra in alcun nulla.',
      author: 'Wisława Szymborska',
    },
    {
      text: 'Uno è padrone di ciò che tace e schiavo di ciò di cui parla.',
      author: 'Sigmund Freud',
    },
    {
      text: 'La parola è per metà di colui che parla, per metà di colui che l’ascolta.',
      author: 'Michel de Montaigne',
    },
    {
      text: 'Leggendo i grandi autori di aforismi, si ha l\'impressione che si conoscessero tutti bene tra loro.',
      author: 'Elias Canetti',
    },
    {
      text: 'Conoscere un\'altra lingua significa avere una seconda anima.',
      author: 'Carlo Magno',
    },
    {
      text: 'La lingua non è oggi peggiore rispetto a ieri. È più pratica. Come il mondo in cui viviamo.',
      author: 'Noam Chomsky',
    },
    {
      text: 'Ogni parola che si pronuncia fa pensare al suo contrario.',
      author: 'Wolfgang Goethe',
    },
    {
      text: 'Una parola è morta quando vien detta, dicono alcuni. Io dico che comincia a vivere soltanto allora.',
      author: 'Emily Dickinson',
    },
    {
      text: 'Le parole fanno un effetto in bocca e un altro negli orecchi.',
      author: 'Alessandro Manzoni',
    },
    {
      text: 'Modella l\'azione alla parola, la parola all\'azione. ',
      author: 'William Shakespeare',
    },
    {
      text: 'Chi ama veramente le parole fa di tutto per farti rimanere senza.',
      author: 'Fabrizio Caramagna',
    },
  ];

  const MAX_QUOTE_SIZE_REM = 1.18;
  const MIN_QUOTE_SIZE_REM = 0.72;
  const QUOTE_SIZE_STEP_REM = 0.04;

  let aphorism = APHORISMS[0];
  let root: HTMLElement;
  let quoteSize = MAX_QUOTE_SIZE_REM;

  async function fitText() {
    if (!root) return;

    quoteSize = MAX_QUOTE_SIZE_REM;
    await tick();

    while (root.scrollHeight > root.clientHeight && quoteSize > MIN_QUOTE_SIZE_REM) {
      quoteSize = Math.max(MIN_QUOTE_SIZE_REM, quoteSize - QUOTE_SIZE_STEP_REM);
      await tick();
    }
  }

  onMount(() => {
    aphorism = APHORISMS[Math.floor(Math.random() * APHORISMS.length)];

    const observer = new ResizeObserver(() => {
      fitText();
    });

    if (root) observer.observe(root);
    fitText();

    return () => {
      observer.disconnect();
    };
  });
</script>

<div class="aphorism-card" bind:this={root}>
  <div class="aphorism-content">
    <blockquote style={`--quote-size: ${quoteSize}rem;`}>
      <span aria-hidden="true">“&nbsp</span>{aphorism.text}<span aria-hidden="true">&nbsp”</span>
    </blockquote>
    <p class="aphorism-author">{aphorism.author}</p>
  </div>
</div>

<style>
  .aphorism-card {
    height: 100%;
    min-height: 0;
    display: grid;
    align-content: center;
    margin: 0;
    overflow: hidden;
    padding: 0.85rem clamp(1.55rem, 5vw, 3rem);
    border: 2px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .aphorism-content {
    width: fit-content;
    max-width: 100%;
    display: grid;
    gap: 1.16rem;
    justify-self: start;
    padding-right: 0.45rem;
  }

  blockquote {
    max-width: 100%;
    margin: 0;
    color: var(--ink);
    font-family: Charter, "Bitstream Charter", "Iowan Old Style", "Palatino Linotype", Palatino, ui-serif, serif;
    font-size: var(--quote-size);
    font-style: italic;
    font-weight: 500;
    line-height: 1.42;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  blockquote span {
    color: var(--muted);
    font-size: 1.12em;
    line-height: 0;
  }

  .aphorism-author {
    justify-self: end;
    margin: 0;
    transform: translateX(0.85rem);
    color: var(--muted);
    font-family: Charter, "Bitstream Charter", "Iowan Old Style", "Palatino Linotype", Palatino, ui-serif, serif;
    font-size: 0.82rem;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
    text-align: right;
  }

  .aphorism-author::before {
    content: "- ";
  }
</style>
