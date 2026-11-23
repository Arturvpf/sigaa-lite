import { ApiError } from '../api/errors';

export type ErrosDeCampo = Record<string, string>;

/**
 * Validações dos formulários da secretaria, espelhando as do back-end.
 * Servem para dar retorno imediato; a API valida de novo e é quem decide.
 */
export const MENSAGEM_CH =
  'A carga horária deve ser múltipla de 15, entre 15h e 120h (ex.: 30, 45, 60).';

export function validarDisciplina(valores: { codigo: string; nome: string; ch: string }) {
  const erros: ErrosDeCampo = {};
  const codigo = valores.codigo.replace(/\s+/g, '');
  if (!codigo) erros.codigo = 'Informe o código';
  else if (!/^[A-Za-z0-9]+$/.test(codigo)) erros.codigo = 'O código deve ter só letras e números';
  else if (codigo.length > 20) erros.codigo = 'O código deve ter no máximo 20 caracteres';

  if (!valores.nome.trim()) erros.nome = 'Informe o nome';

  const ch = Number(valores.ch);
  if (!valores.ch.trim()) erros.ch = 'Informe a carga horária';
  else if (!(Number.isInteger(ch) && ch >= 15 && ch <= 120 && ch % 15 === 0)) {
    erros.ch = MENSAGEM_CH;
  }
  return erros;
}

export function validarProfessor(valores: { nome: string; email: string }) {
  const erros: ErrosDeCampo = {};
  if (!valores.nome.trim()) erros.nome = 'Informe o nome';
  if (!valores.email.trim()) erros.email = 'Informe o e-mail';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email.trim())) {
    erros.email = 'Informe um e-mail válido';
  }
  return erros;
}

export function validarVagas(vagas: string, minimo = 1): string | undefined {
  const n = Number(vagas);
  if (!vagas.trim()) return 'Informe o número de vagas';
  if (!Number.isInteger(n)) return 'O número de vagas deve ser inteiro';
  if (n < 1) return 'A turma deve ter pelo menos 1 vaga';
  if (n < minimo)
    return `A turma já tem ${minimo} matriculado(s); as vagas não podem ficar abaixo disso.`;
  return undefined;
}

/** Códigos de recusa da API que dizem respeito a um campo específico do formulário. */
const CAMPO_DO_CODIGO: Record<string, string> = {
  CODIGO_DUPLICADO: 'codigo',
  EMAIL_DUPLICADO: 'email',
  VAGAS_ABAIXO_DOS_MATRICULADOS: 'vagas',
  DISCIPLINA_INEXISTENTE: 'disciplinaId',
  PROFESSOR_INEXISTENTE: 'professorId',
};

/**
 * Converte um erro da API em mensagens por campo: validação (400, com details)
 * e recusas ligadas a um campo (ex.: código duplicado). Outros erros devolvem vazio
 * e são mostrados como aviso geral.
 */
export function errosDaApi(error: unknown): ErrosDeCampo {
  if (!(error instanceof ApiError)) return {};
  if (error.code === 'VALIDACAO' && Array.isArray(error.details)) {
    return Object.fromEntries(
      (error.details as { campo: string; mensagem: string }[]).map((d) => [d.campo, d.mensagem]),
    );
  }
  const campo = CAMPO_DO_CODIGO[error.code];
  return campo ? { [campo]: error.message } : {};
}
