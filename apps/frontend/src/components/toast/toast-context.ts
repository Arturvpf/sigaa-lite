import { createContext, useContext } from 'react';

export type TipoToast = 'sucesso' | 'erro' | 'info';

export interface ToastContextValue {
  mostrar(mensagem: string, tipo?: TipoToast): void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Mostra avisos rápidos, como "Matrícula realizada" ou "Turma lotada". */
export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return contexto;
}
