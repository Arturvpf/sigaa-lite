import { type ReactNode, useId } from 'react';

interface CampoProps {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  /** Recebe os atributos de acessibilidade para ligar o input ao rótulo e às mensagens. */
  children: (atributos: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/**
 * Campo de formulário com rótulo, texto de ajuda e mensagem de erro.
 * O erro fica ligado ao input por aria-describedby, para leitores de tela.
 */
export function Campo({ rotulo, erro, ajuda, children }: CampoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descricao = [ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ') || undefined;

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': descricao })}
      {ajuda && (
        <span id={idAjuda} className="campo__ajuda">
          {ajuda}
        </span>
      )}
      {erro && (
        <span id={idErro} className="campo__erro">
          {erro}
        </span>
      )}
    </div>
  );
}
