/** Página provisória das telas que serão construídas nas próximas fases. */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
      <p className="texto-suave">Em construção.</p>
    </section>
  );
}
