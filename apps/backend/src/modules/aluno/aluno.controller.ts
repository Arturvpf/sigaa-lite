import type { RequestHandler } from 'express';
import { getAlunoId } from '../../shared/auth/middlewares.js';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { parse } from '../../shared/http/validate.js';
import { matricularSchema, matriculaParamsSchema } from './aluno.schemas.js';
import type { AlunoService } from './aluno.service.js';

/**
 * O aluno é sempre o do token (getAlunoId). Nenhuma rota recebe o id do aluno
 * pela URL ou pelo corpo (regra 9).
 */
export function createAlunoController(service: AlunoService) {
  const listarOfertas: RequestHandler = async (req, res) => {
    const query = parse(paginationQuerySchema, req.query);
    res.json(await service.listarOfertas(getAlunoId(req), query));
  };

  const listarMatriculas: RequestHandler = async (req, res) => {
    res.json(await service.listarMatriculas(getAlunoId(req)));
  };

  const matricular: RequestHandler = async (req, res) => {
    const { turmaId } = parse(matricularSchema, req.body);
    const matricula = await service.matricular(getAlunoId(req), turmaId);
    res.status(201).json(matricula);
  };

  const cancelarMatricula: RequestHandler = async (req, res) => {
    const { id } = parse(matriculaParamsSchema, req.params);
    await service.cancelarMatricula(getAlunoId(req), id);
    res.status(204).end();
  };

  const progresso: RequestHandler = async (req, res) => {
    res.json(await service.progresso(getAlunoId(req)));
  };

  return { listarOfertas, listarMatriculas, matricular, cancelarMatricula, progresso };
}
