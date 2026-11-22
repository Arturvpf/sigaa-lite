import { useEffect, useState } from 'react';

interface CampoBuscaProps {
  /** Valor atual da busca (vindo da URL). */
  valor: string;
  onBuscar: (valor: string) => void;
  placeholder?: string;
  rotulo?: string;
  /** Tempo sem digitar antes de buscar, para não chamar a API a cada tecla. */
  esperaMs?: number;
}

/** Campo de busca com debounce: só dispara a busca quando o usuário para de digitar. */
export function CampoBusca({
  valor,
  onBuscar,
  placeholder = 'Buscar…',
  rotulo = 'Buscar',
  esperaMs = 400,
}: CampoBuscaProps) {
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);

  // Se a URL mudar por fora (voltar do navegador, "limpar busca"), o campo acompanha.
  // Ajuste durante a renderização (padrão recomendado pelo React), sem efeito extra.
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => {
    const normalizado = texto.trim();
    if (normalizado === valor) return;
    const timer = setTimeout(() => onBuscar(normalizado), esperaMs);
    return () => clearTimeout(timer);
  }, [texto, valor, esperaMs, onBuscar]);

  return (
    <label className="campo campo--busca">
      <span className="visualmente-oculto">{rotulo}</span>
      <input
        type="search"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => setTexto(e.target.value)}
      />
    </label>
  );
}
