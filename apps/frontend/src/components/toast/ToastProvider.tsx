import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext, type TipoToast } from './toast-context';

interface Toast {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

const DURACAO_MS = 5000;

/**
 * Fila de avisos no canto da tela. Erros usam role="alert" (lidos na hora pelo leitor de tela);
 * os demais, role="status".
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(1);

  const fechar = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensagem: string, tipo: TipoToast = 'info') => {
      const id = proximoId.current++;
      setToasts((atuais) => [...atuais, { id, mensagem, tipo }]);
      setTimeout(() => fechar(id), DURACAO_MS);
    },
    [fechar],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toasts">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tipo}`}
            role={toast.tipo === 'erro' ? 'alert' : 'status'}
          >
            <span>{toast.mensagem}</span>
            <button
              type="button"
              className="toast__fechar"
              aria-label="Fechar aviso"
              onClick={() => fechar(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
