/** Aresta "disciplina exige preRequisito". */
export interface Aresta {
  disciplinaId: number;
  preRequisitoId: number;
}

/**
 * Diz se trocar os pré-requisitos de `disciplinaId` por `novos` criaria um ciclo
 * (ex.: A exige B, B exige C e agora C passaria a exigir A).
 *
 * Função pura, para ser testada sem banco. Ideia: com as novas arestas, haverá ciclo
 * se, partindo de algum novo pré-requisito e seguindo "exige", for possível voltar
 * à própria disciplina. Busca em profundidade com conjunto de visitados.
 */
export function criariaCiclo(arestas: Aresta[], disciplinaId: number, novos: number[]): boolean {
  const exige = new Map<number, number[]>();
  for (const { disciplinaId: de, preRequisitoId: para } of arestas) {
    if (de === disciplinaId) continue; // as arestas atuais desta disciplina serão substituídas
    exige.set(de, [...(exige.get(de) ?? []), para]);
  }

  const visitados = new Set<number>();
  const pilha = [...novos];
  while (pilha.length > 0) {
    const atual = pilha.pop()!;
    if (atual === disciplinaId) return true;
    if (visitados.has(atual)) continue;
    visitados.add(atual);
    pilha.push(...(exige.get(atual) ?? []));
  }
  return false;
}
