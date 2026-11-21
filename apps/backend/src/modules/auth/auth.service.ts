import { verifyPassword } from '../../shared/auth/password.js';
import type { TokenService } from '../../shared/auth/token-service.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';
import type { LoginInput } from './auth.schemas.js';
import type { UsuarioComAluno, UsuarioRepository } from './usuario.repository.js';

export interface UsuarioDTO {
  id: number;
  username: string;
  perfil: 'SECRETARIA' | 'ALUNO';
  aluno: { id: number; nome: string; curso: { id: number; nome: string } } | null;
}

const credenciaisInvalidas = () =>
  // Mesma resposta para usuário inexistente e senha errada: não revela quais usuários existem
  new UnauthorizedError('CREDENCIAIS_INVALIDAS', 'Usuário ou senha inválidos.');

export function createAuthService(deps: { usuarios: UsuarioRepository; tokens: TokenService }) {
  const { usuarios, tokens } = deps;

  return {
    async login({ username, senha }: LoginInput) {
      const usuario = await usuarios.findByUsername(username);
      if (!usuario) throw credenciaisInvalidas();

      // Senha é opcional no sistema; se o usuário tiver uma, ela é obrigatória no login
      if (usuario.senhaHash) {
        const senhaConfere =
          senha !== undefined && (await verifyPassword(senha, usuario.senhaHash));
        if (!senhaConfere) throw credenciaisInvalidas();
      }

      const { token, expiresIn } = tokens.sign({
        usuarioId: usuario.id,
        perfil: usuario.perfil,
        alunoId: usuario.aluno?.id ?? null,
      });
      return { token, expiresIn, usuario: toDTO(usuario) };
    },

    async me(usuarioId: number): Promise<UsuarioDTO> {
      const usuario = await usuarios.findById(usuarioId);
      // Token válido de um usuário que não existe mais: a sessão deixa de valer
      if (!usuario) throw new UnauthorizedError('TOKEN_INVALIDO', 'Usuário não encontrado.');
      return toDTO(usuario);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

function toDTO(usuario: UsuarioComAluno): UsuarioDTO {
  return {
    id: usuario.id,
    username: usuario.username,
    perfil: usuario.perfil,
    aluno: usuario.aluno,
  };
}
