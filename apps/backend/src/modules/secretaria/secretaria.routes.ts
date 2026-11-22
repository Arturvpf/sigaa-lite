import { Router } from 'express';
import { authenticate, requirePerfil } from '../../shared/auth/middlewares.js';
import type { TokenService } from '../../shared/auth/token-service.js';
import { createSecretariaController } from './secretaria.controller.js';
import type { SecretariaService } from './secretaria.service.js';

/** Rotas da secretaria: todas exigem token (401) e perfil SECRETARIA (403). */
export function createSecretariaRoutes(deps: {
  service: SecretariaService;
  tokens: TokenService;
}): Router {
  const controller = createSecretariaController(deps.service);
  const router = Router();

  router.use(authenticate(deps.tokens), requirePerfil('SECRETARIA'));

  router.get('/disciplinas', controller.listarDisciplinas);
  router.post('/disciplinas', controller.criarDisciplina);
  router.get('/disciplinas/:id', controller.buscarDisciplina);
  router.put('/disciplinas/:id', controller.atualizarDisciplina);

  router.get('/professores', controller.listarProfessores);
  router.post('/professores', controller.criarProfessor);

  router.get('/turmas', controller.listarTurmas);
  router.post('/turmas', controller.abrirTurma);
  router.patch('/turmas/:id/vagas', controller.alterarVagas);

  return router;
}
