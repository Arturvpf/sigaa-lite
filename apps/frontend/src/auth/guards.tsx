import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';
import { areaDoPerfil, type Perfil } from './session';

/**
 * Protege uma área por perfil:
 * - sem sessão (nunca logou, saiu ou expirou) → vai para o login, lembrando a página pedida;
 * - perfil errado → "Acesso negado", com link para a própria área.
 */
export function RequirePerfil({ perfil }: { perfil: Perfil }) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (usuario.perfil !== perfil) {
    return <AcessoNegado destino={areaDoPerfil(usuario.perfil)} />;
  }
  return <Outlet />;
}

/** Raiz "/": manda cada um para a sua área (ou para o login). */
export function RedirecionarParaArea() {
  const { usuario } = useAuth();
  return <Navigate to={usuario ? areaDoPerfil(usuario.perfil) : '/login'} replace />;
}

function AcessoNegado({ destino }: { destino: string }) {
  return (
    <main className="pagina-centralizada">
      <div className="cartao" role="alert">
        <h1>Acesso negado</h1>
        <p>Esta área não está disponível para o seu perfil.</p>
        <Link className="botao" to={destino}>
          Ir para a minha área
        </Link>
      </div>
    </main>
  );
}
