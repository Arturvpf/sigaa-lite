import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { mensagemDeErro } from '../api/errors';
import { useAuth } from '../auth/auth-context';
import { areaDoPerfil, type Perfil } from '../auth/session';
import { Icone } from '../components/Icone';

/** Prefixo de rota de cada perfil: só volta para a página pedida se ela for da área certa. */
const prefixoDoPerfil: Record<Perfil, string> = { ALUNO: '/aluno', SECRETARIA: '/secretaria' };

export function LoginPage() {
  const { usuario, entrar, sessaoExpirada } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');

  const login = useMutation({
    mutationFn: () => entrar(username.trim(), senha || undefined),
  });

  // Um único caminho de redirecionamento: assim que houver usuário (login concluído agora
  // ou sessão já existente), vai para a página pedida antes do login, se for da área dele,
  // ou para a área do perfil.
  if (usuario) {
    const from = (location.state as { from?: string } | null)?.from;
    const destino = from?.startsWith(prefixoDoPerfil[usuario.perfil])
      ? from
      : areaDoPerfil(usuario.perfil);
    return <Navigate to={destino} replace />;
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (username.trim()) login.mutate();
  }

  return (
    <main className="pagina-centralizada">
      <div className="login">
        <div className="login__marca">
          <span className="marca__icone">
            <Icone nome="marca" tamanho={26} />
          </span>
          <h1>SIGAA Lite</h1>
          <p>Matrícula do semestre, sem fila e sem papel.</p>
        </div>

        {sessaoExpirada && (
          <p className="aviso aviso--info" role="status">
            <Icone nome="info" />
            <span>Sua sessão expirou. Entre novamente para continuar.</span>
          </p>
        )}

        <form className="cartao formulario-login" onSubmit={enviar} noValidate>
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
            className="botao botao--primario botao--grande"
            type="submit"
            disabled={!username.trim() || login.isPending}
          >
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
