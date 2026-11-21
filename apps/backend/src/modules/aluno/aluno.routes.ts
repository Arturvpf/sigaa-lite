import { Router } from 'express';
import { authenticate, requirePerfil } from '../../shared/auth/middlewares.js';
import type { TokenService } from '../../shared/auth/token-service.js';
import { createAlunoController } from './aluno.controller.js';
import type { AlunoService } from './aluno.service.js';

/** Rotas da área do aluno: todas exigem token (401) e perfil ALUNO (403). */
export function createAlunoRoutes(deps: { service: AlunoService; tokens: TokenService }): Router {
  const controller = createAlunoController(deps.service);
  const router = Router();

  router.use(authenticate(deps.tokens), requirePerfil('ALUNO'));

  router.get('/ofertas', controller.listarOfertas);
  router.get('/matriculas', controller.listarMatriculas);
  router.post('/matriculas', controller.matricular);
  router.delete('/matriculas/:id', controller.cancelarMatricula);
  router.get('/progresso', controller.progresso);

  return router;
}
