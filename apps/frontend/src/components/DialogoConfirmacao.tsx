import { type ReactNode, useEffect, useId, useRef } from 'react';

interface DialogoConfirmacaoProps {
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Caixa de confirmação para ações que não se desfazem com um clique (ex.: cancelar matrícula).
 * O foco começa em "voltar" (a opção segura) e Esc fecha.
 */
export function DialogoConfirmacao({
  titulo,
  children,
  textoConfirmar,
  textoCancelar = 'Voltar',
  confirmando = false,
  onConfirmar,
  onCancelar,
}: DialogoConfirmacaoProps) {
  const tituloId = useId();
  const botaoVoltar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoVoltar.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !confirmando) onCancelar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onCancelar, confirmando]);

  return (
    <div className="dialogo__fundo" onClick={() => !confirmando && onCancelar()}>
      <div
        className="dialogo cartao"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={tituloId}>{titulo}</h2>
        <div className="dialogo__corpo">{children}</div>
        <div className="dialogo__acoes">
          <button
            ref={botaoVoltar}
            type="button"
            className="botao"
            onClick={onCancelar}
            disabled={confirmando}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className="botao botao--perigo"
            onClick={onConfirmar}
            disabled={confirmando}
          >
            {confirmando ? 'Aguarde…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
