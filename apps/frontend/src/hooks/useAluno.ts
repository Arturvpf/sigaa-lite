import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alunoApi, chavesAluno } from '../api/aluno';
import { ApiError, mensagemDeErro } from '../api/errors';
import { useToast } from '../components/toast/toast-context';

export function useOfertas(busca: string, pagina: number) {
  return useQuery({
    queryKey: chavesAluno.ofertas(busca, pagina),
    queryFn: ({ signal }) => alunoApi.listarOfertas(busca, pagina, signal),
    // Mantém a página anterior na tela enquanto a próxima carrega (sem "piscar")
    placeholderData: keepPreviousData,
  });
}

export function useMinhasMatriculas() {
  return useQuery({
    queryKey: chavesAluno.matriculas,
    queryFn: ({ signal }) => alunoApi.listarMatriculas(signal),
  });
}

export function useProgresso() {
  return useQuery({
    queryKey: chavesAluno.progresso,
    queryFn: ({ signal }) => alunoApi.progresso(signal),
  });
}

/**
 * Depois de qualquer tentativa de matricular/cancelar, os dados do aluno são recarregados:
 * no sucesso porque mudaram, e na recusa porque a tela pode estar desatualizada
 * (ex.: outra pessoa ocupou a última vaga).
 */
function useAcaoDoAluno<T>(acao: (id: number) => Promise<T>, mensagemSucesso: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: acao,
    onSuccess: () => toast.mostrar(mensagemSucesso, 'sucesso'),
    onError: (error) => {
      // 401 já leva ao login; os demais erros viram aviso com a mensagem da API
      if (!(error instanceof ApiError && error.status === 401)) {
        toast.mostrar(mensagemDeErro(error), 'erro');
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chavesAluno.tudo }),
  });
}

export function useMatricular() {
  return useAcaoDoAluno(alunoApi.matricular, 'Matrícula realizada.');
}

export function useCancelarMatricula() {
  return useAcaoDoAluno(alunoApi.cancelarMatricula, 'Matrícula cancelada. A vaga foi liberada.');
}
