import { type FormEvent, type ReactNode, useEffect, useId } from 'react';

interface JanelaFormularioProps {
  titulo: string;
  textoEnviar: string;
  enviando: boolean;
  /** Erro geral do envio (os erros de campo aparecem junto a cada campo). */
  erroGeral?: string;
  onEnviar: () => void;
  onFechar: () => void;
  children: ReactNode;
}

/** Janela (modal) com um formulário: Esc ou "Cancelar" fecham sem salvar. */
export function JanelaFormulario({
  titulo,
  textoEnviar,
  enviando,
  erroGeral,
  onEnviar,
  onFechar,
  children,
}: JanelaFormularioProps) {
  const tituloId = useId();

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !enviando) onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar, enviando]);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    onEnviar();
  }

  return (
    <div className="dialogo__fundo">
      <form
        className="dialogo cartao formulario"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onSubmit={enviar}
        noValidate
      >
        <h2 id={tituloId}>{titulo}</h2>
        {children}
        {erroGeral && (
          <p className="aviso aviso--erro" role="alert">
            {erroGeral}
          </p>
        )}
        <div className="dialogo__acoes">
          <button type="button" className="botao" onClick={onFechar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--primario" disabled={enviando}>
            {enviando ? 'Salvando…' : textoEnviar}
          </button>
        </div>
      </form>
    </div>
  );
}
