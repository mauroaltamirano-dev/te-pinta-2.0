import { useState } from 'react';
import { Link } from 'react-router-dom';

type Participant = {
  name: string;
  dozens: number;
  chances: number;
};

const fallbackParticipant: Participant = { name: 'Te Pinta', dozens: 1, chances: 1 };

const participants: Participant[] = [
  { name: 'Myriam Galanti', dozens: 5, chances: 5 },
  { name: 'Olga Albera', dozens: 3, chances: 3 },
  { name: 'Vale Vasquez', dozens: 3, chances: 3 },
  { name: 'Susana', dozens: 2.5, chances: 2 },
  { name: 'Claudia / Claudia Miguel', dozens: 2, chances: 2 },
  { name: 'Fabi', dozens: 2, chances: 2 },
  { name: 'Laura Goffre', dozens: 2, chances: 2 },
  { name: 'Lily', dozens: 2, chances: 2 },
  { name: 'Mabel / Mabel Rojas', dozens: 2, chances: 2 },
  { name: 'Nicolas Hernan', dozens: 2, chances: 2 },
  { name: 'Abuela Berta', dozens: 1.5, chances: 1 },
  { name: 'Chipi', dozens: 1.5, chances: 1 },
  { name: 'Juli celi', dozens: 1.5, chances: 1 },
  { name: 'Ale samman', dozens: 1, chances: 1 },
  { name: 'Bruno', dozens: 1, chances: 1 },
  { name: 'Dani cachin', dozens: 1, chances: 1 },
  { name: 'De Pauli', dozens: 1, chances: 1 },
  { name: 'Fermin Gomez', dozens: 1, chances: 1 },
  { name: 'Jorge Cittadini', dozens: 1, chances: 1 },
  { name: 'Julio', dozens: 1, chances: 1 },
  { name: 'Laurita', dozens: 1, chances: 1 },
  { name: 'Lucho Ferraro', dozens: 1, chances: 1 },
  { name: 'Luciano', dozens: 1, chances: 1 },
  { name: 'Margarita', dozens: 1, chances: 1 },
  { name: 'Mari Crepin', dozens: 1, chances: 1 },
  { name: 'Nicolas Ramazzoti', dozens: 1, chances: 1 },
];

type RaffleResult = {
  first: Participant;
  second: Participant;
  code: string;
};

const pickIndex = (length: number) => {
  if (length <= 0) {
    return 0;
  }

  const maxValidValue = Math.floor(0xffffffff / length) * length;
  const randomValues = new Uint32Array(1);

  do {
    crypto.getRandomValues(randomValues);
  } while ((randomValues[0] ?? 0) >= maxValidValue);

  return (randomValues[0] ?? 0) % length;
};

const getParticipant = (index: number): Participant => participants[index] ?? fallbackParticipant;

const buildTickets = (entries: Participant[]) => {
  return entries.flatMap((participant) =>
    Array.from({ length: participant.chances }, () => participant),
  );
};

const raffleTickets = buildTickets(participants);

const pickFromTickets = (tickets: Participant[]) => {
  return tickets[pickIndex(tickets.length)] ?? fallbackParticipant;
};

const runRaffle = (): RaffleResult => {
  const first = pickFromTickets(raffleTickets);
  const secondTickets = buildTickets(
    participants.filter((participant) => participant.name !== first.name),
  );
  const second = pickFromTickets(secondTickets.length > 0 ? secondTickets : raffleTickets);

  return {
    first,
    second,
    code: crypto.randomUUID().slice(0, 8).toUpperCase(),
  };
};

export const RafflePage = () => {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [highlightedName, setHighlightedName] = useState(getParticipant(0).name);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<RaffleResult | null>(null);

  const handleStart = () => {
    setResult(null);
    setStatus('running');
    setCountdown(3);

    const startedAt = Date.now();
    const highlightTimer = window.setInterval(() => {
      setHighlightedName(pickFromTickets(raffleTickets).name);
      const elapsed = Date.now() - startedAt;
      setCountdown(Math.max(1, 3 - Math.floor(elapsed / 1200)));
    }, 90);

    window.setTimeout(() => {
      window.clearInterval(highlightTimer);
      const raffleResult = runRaffle();
      setHighlightedName(raffleResult.first.name);
      setResult(raffleResult);
      setStatus('done');
    }, 4300);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(210,138,45,0.34),transparent_30rem),linear-gradient(135deg,#17325c_0%,#22160f_52%,#b54a32_100%)] px-4 py-6 text-white sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/20"
            to="/"
          >
            Te Pinta
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.2em] text-rojo-pimenton shadow-premium">
            Sorteo oficial
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="text-center lg:text-left">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-oro-horno">
              21/04/2026 al 07/05/2026
            </p>
            <h1 className="mt-4 font-display text-5xl font-black leading-none text-crema-maiz sm:text-7xl lg:text-8xl">
              Sorteo Te Pinta
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-crema-maiz/85">
              Vamos a conocer a las dos personas ganadoras de esta edición especial. Primer y
              segundo puesto se sortean en vivo con ganadores distintos.
            </p>

            <div className="mt-8 rounded-[2rem] border border-white/15 bg-white/10 p-5 text-center shadow-premium backdrop-blur lg:text-left">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-oro-horno">
                Participan compras del período anunciado
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-crema-maiz/80">
                Los datos comerciales quedan reservados: no se muestran clientes, chances ni
                docenas en pantalla.
              </p>
            </div>

            <button
              className="mt-8 rounded-full bg-oro-horno px-9 py-5 text-xl font-black uppercase tracking-[0.14em] text-foreground shadow-[0_24px_80px_rgba(210,138,45,0.35)] transition hover:scale-[1.02] hover:bg-crema-maiz disabled:cursor-wait disabled:opacity-70"
              disabled={status === 'running'}
              onClick={handleStart}
              type="button"
            >
              {status === 'running'
                ? 'Sorteando...'
                : status === 'done'
                  ? 'Sortear otra vez'
                  : 'Iniciar sorteo'}
            </button>
          </section>

          <section className="rounded-[2.5rem] border border-white/15 bg-white/95 p-5 text-foreground shadow-premium sm:p-7">
            {status === 'done' && result ? (
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-rojo-pimenton">
                  Código {result.code}
                </p>
                <div className="mt-6 rounded-[2rem] bg-gradient-to-br from-oro-horno to-crema-maiz p-6 shadow-glow">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-azul-noche-criolla/70">
                    🥇 Primer puesto
                  </p>
                  <h2 className="mt-3 font-display text-5xl font-black text-azul-noche-criolla">
                    {result.first.name}
                  </h2>
                </div>
                <div className="mt-4 rounded-[2rem] border border-border bg-card p-6 shadow-card">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-rojo-pimenton/70">
                    🥈 Segundo puesto
                  </p>
                  <h3 className="mt-3 font-display text-4xl font-black text-rojo-pimenton">
                    {result.second.name}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
                <div className="flex size-24 items-center justify-center rounded-full bg-rojo-pimenton text-5xl font-black text-white shadow-primary-glow">
                  {status === 'running' ? countdown : '🎁'}
                </div>
                <p className="mt-8 text-sm font-black uppercase tracking-[0.28em] text-muted-foreground">
                  {status === 'running' ? 'Girando nombres' : 'Listo para filmar'}
                </p>
                <h2 className="mt-4 min-h-28 font-display text-5xl font-black leading-tight text-azul-noche-criolla sm:text-6xl">
                  {status === 'running' ? highlightedName : 'Apretá iniciar'}
                </h2>
                <p className="mt-4 max-w-md text-muted-foreground">
                  Prepará la cámara, tocá el botón y dejá que se vea el conteo antes de revelar los
                  dos ganadores.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};
