import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chavesSecretaria, secretariaApi, TAMANHO_MAXIMO } from '../api/secretaria';

export function useDisciplinas(busca: string, pagina: number) {
  return useQuery({
    queryKey: [...chavesSecretaria.disciplinas, { busca, pagina }],
    queryFn: ({ signal }) => secretariaApi.listarDisciplinas(busca, pagina, undefined, signal),
    placeholderData: keepPreviousData,
  });
}

export function useProfessores(busca: string, pagina: number) {
  return useQuery({
    queryKey: [...chavesSecretaria.professores, { busca, pagina }],
    queryFn: ({ signal }) => secretariaApi.listarProfessores(busca, pagina, undefined, signal),
    placeholderData: keepPreviousData,
  });
}

export function useTurmas(busca: string, pagina: number) {
  return useQuery({
    queryKey: [...chavesSecretaria.turmas, { busca, pagina }],
    queryFn: ({ signal }) => secretariaApi.listarTurmas(busca, pagina, undefined, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Opções dos selects do formulário de turma (até 50 de cada).
 * Com muitas disciplinas, o certo seria um campo com busca (autocomplete).
 */
export function useOpcoesTurma(habilitado: boolean) {
  const disciplinas = useQuery({
    queryKey: [...chavesSecretaria.disciplinas, 'opcoes'],
    queryFn: ({ signal }) => secretariaApi.listarDisciplinas('', 1, TAMANHO_MAXIMO, signal),
    enabled: habilitado,
  });
  const professores = useQuery({
    queryKey: [...chavesSecretaria.professores, 'opcoes'],
    queryFn: ({ signal }) => secretariaApi.listarProfessores('', 1, TAMANHO_MAXIMO, signal),
    enabled: habilitado,
  });
  return { disciplinas, professores };
}

/** Mutação que, ao dar certo, recarrega as listagens afetadas. */
function useMutacaoSecretaria<V, R>(
  fn: (variaveis: V) => Promise<R>,
  invalidar: readonly (readonly string[])[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all(invalidar.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export const useSalvarDisciplina = () =>
  useMutacaoSecretaria(
    ({ id, ...dados }: { id?: number; codigo: string; nome: string; ch: number }) =>
      id ? secretariaApi.atualizarDisciplina(id, dados) : secretariaApi.criarDisciplina(dados),
    // Turmas mostram o código/nome da disciplina
    [chavesSecretaria.disciplinas, chavesSecretaria.turmas],
  );

export const useDefinirPreRequisitos = () =>
  useMutacaoSecretaria(
    ({ id, preRequisitoIds }: { id: number; preRequisitoIds: number[] }) =>
      secretariaApi.definirPreRequisitos(id, preRequisitoIds),
    // As ofertas do aluno também mostram pré-requisitos
    [chavesSecretaria.disciplinas, ['aluno']],
  );

/** Todas as disciplinas (até 50), para escolher pré-requisitos. */
export function useTodasDisciplinas() {
  return useQuery({
    queryKey: [...chavesSecretaria.disciplinas, 'opcoes'],
    queryFn: ({ signal }) => secretariaApi.listarDisciplinas('', 1, TAMANHO_MAXIMO, signal),
  });
}

export const useCriarProfessor = () =>
  useMutacaoSecretaria(secretariaApi.criarProfessor, [chavesSecretaria.professores]);

export const useAbrirTurma = () =>
  useMutacaoSecretaria(secretariaApi.abrirTurma, [chavesSecretaria.turmas]);

export const useAlterarVagas = () =>
  useMutacaoSecretaria(
    ({ id, vagas }: { id: number; vagas: number }) => secretariaApi.alterarVagas(id, vagas),
    [chavesSecretaria.turmas],
  );
