<section class="info-view">
  <header>
    <p class="eyebrow">Parolinea</p>
    <h1>Regole</h1>
  </header>

  <div class="info-grid">
    <section>
      <h2>Come si gioca</h2>
      <ol>
        <li>Forma parole collegando lettere adiacenti in orizzontale, verticale o diagonale.</li>
        <li>Ogni casella puo essere usata una sola volta nella stessa parola.</li>
        <li>Le parole devono rispettare la lunghezza minima scelta prima della partita.</li>
        <li>La partita termina quando scade il tempo o quando la chiudi manualmente.</li>
      </ol>
    </section>

    <section>
      <h2>Punteggio</h2>
      <dl>
        <div><dt>2 lettere</dt><dd>2 punti</dd></div>
        <div><dt>3 lettere</dt><dd>5 punti</dd></div>
        <div><dt>4 lettere</dt><dd>9 punti</dd></div>
        <div><dt>5 lettere</dt><dd>14 punti</dd></div>
        <div><dt>6 lettere</dt><dd>20 punti</dd></div>
        <div><dt>7 lettere</dt><dd>27 punti</dd></div>
        <div><dt>8+ lettere</dt><dd>35+ punti</dd></div>
      </dl>
    </section>
  </div>
</section>

<style>
  .info-view {
    width: min(100%, 62rem);
    margin-inline: auto;
    display: grid;
    gap: 1rem;
  }

  header {
    display: grid;
    gap: 0.2rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--accent-strong);
    font-size: 0.88rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2 {
    font-size: 1rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  section {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  ol {
    margin: 0.8rem 0 0;
    padding-left: 1.35rem;
  }

  li {
    margin-bottom: 0.55rem;
    line-height: 1.45;
  }

  dl {
    margin: 0.8rem 0 0;
    display: grid;
    gap: 0.55rem;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-weight: 800;
  }

  @media (max-width: 760px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
