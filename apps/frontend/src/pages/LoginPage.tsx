import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { mensagemDeErro } from '../api/errors';
import { useAuth } from '../auth/auth-context';
import { areaDoPerfil, type Perfil } from '../auth/session';

/** Prefixo de rota de cada perfil: só volta para a página pedida se ela for da área certa. */
const prefixoDoPerfil: Record<Perfil, string> = { ALUNO: '/aluno', SECRETARIA: '/secretaria' };

export function LoginPage() {
  const { usuario, entrar, sessaoExpirada } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');

  const login = useMutation({
    mutationFn: () => entrar(username.trim(), senha || undefined),
    onSuccess: (logado) => {
      const from = (location.state as { from?: string } | null)?.from;
      const destino = from?.startsWith(prefixoDoPerfil[logado.perfil])
        ? from
        : areaDoPerfil(logado.perfil);
      navigate(destino, { replace: true });
    },
  });

  // Já logado (ex.: abriu /login de novo): vai direto para a própria área
  if (usuario && !login.isPending) {
    return <Navigate to={areaDoPerfil(usuario.perfil)} replace />;
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (username.trim()) login.mutate();
  }

  return (
    <main className="pagina-centralizada">
      <form className="cartao formulario-login" onSubmit={enviar} noValidate>
        <h1>SIGAA Lite</h1>
        <p className="texto-suave">Sistema de matrícula</p>

        {sessaoExpirada && (
          <p className="aviso aviso--info" role="status">
            Sua sessão expirou. Entre novamente para continuar.
          </p>
        )}

        <label className="campo">
          <span>Nome de usuário</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="campo">
          <span>
            Senha <span className="texto-suave">(opcional)</span>
          </span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>

        {login.isError && (
          <p className="aviso aviso--erro" role="alert">
            {mensagemDeErro(login.error)}
          </p>
        )}

        <button
          className="botao botao--primario"
          type="submit"
          disabled={!username.trim() || login.isPending}
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
