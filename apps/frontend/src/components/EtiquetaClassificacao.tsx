import { type Classificacao, ROTULO_CLASSIFICACAO } from '../api/aluno';

/** Destaque visual de como a disciplina conta para o curso do aluno (regra 10). */
export function EtiquetaClassificacao({ classificacao }: { classificacao: Classificacao }) {
  return (
    <span className={`etiqueta etiqueta--${classificacao.toLowerCase().replace('_', '-')}`}>
      {ROTULO_CLASSIFICACAO[classificacao]}
    </span>
  );
}
