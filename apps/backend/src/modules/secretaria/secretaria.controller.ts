import type { RequestHandler } from 'express';
import { type PaginationQuery, paginationQuerySchema } from '../../shared/http/pagination.js';
import { parse } from '../../shared/http/validate.js';
import {
  disciplinaSchema,
  idParamsSchema,
  professorSchema,
  turmaSchema,
  vagasBodySchema,
} from './secretaria.schemas.js';
import type { SecretariaService } from './secretaria.service.js';

/** Controller da secretaria: valida a entrada e delega ao service. */
export function createSecretariaController(service: SecretariaService) {
  /** Listagens: todas recebem ?q=&page=&pageSize= validados do mesmo jeito. */
  const listar =
    (fn: (query: PaginationQuery) => Promise<unknown>): RequestHandler =>
    async (req, res) => {
      res.json(await fn(parse(paginationQuerySchema, req.query)));
    };

  return {
    listarDisciplinas: listar(service.listarDisciplinas),

    buscarDisciplina: (async (req, res) => {
      const { id } = parse(idParamsSchema, req.params);
      res.json(await service.buscarDisciplina(id));
    }) satisfies RequestHandler,

    criarDisciplina: (async (req, res) => {
      res.status(201).json(await service.criarDisciplina(parse(disciplinaSchema, req.body)));
    }) satisfies RequestHandler,

    atualizarDisciplina: (async (req, res) => {
      const { id } = parse(idParamsSchema, req.params);
      res.json(await service.atualizarDisciplina(id, parse(disciplinaSchema, req.body)));
    }) satisfies RequestHandler,

    listarProfessores: listar(service.listarProfessores),

    criarProfessor: (async (req, res) => {
      res.status(201).json(await service.criarProfessor(parse(professorSchema, req.body)));
    }) satisfies RequestHandler,

    listarTurmas: listar(service.listarTurmas),

    abrirTurma: (async (req, res) => {
      res.status(201).json(await service.abrirTurma(parse(turmaSchema, req.body)));
    }) satisfies RequestHandler,

    alterarVagas: (async (req, res) => {
      const { id } = parse(idParamsSchema, req.params);
      const { vagas } = parse(vagasBodySchema, req.body);
      res.json(await service.alterarVagas(id, vagas));
    }) satisfies RequestHandler,
  };
}
