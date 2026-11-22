import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/auth-context';

export interface LinkNavegacao {
  para: string;
  rotulo: string;
}

/** Estrutura comum das áreas logadas: cabeçalho com usuário e sair, navegação e conteúdo. */
export function AppLayout({ area, links }: { area: string; links: LinkNavegacao[] }) {
  const { usuario, sair } = useAuth();
  const nome = usuario?.aluno?.nome ?? usuario?.username;

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho__topo">
          <span className="marca">
            SIGAA Lite <span className="marca__area">{area}</span>
          </span>
          <div className="cabecalho__usuario">
            <span className="cabecalho__nome" title={nome}>
              {nome}
            </span>
            <button className="botao botao--discreto" type="button" onClick={sair}>
              Sair
            </button>
          </div>
        </div>
        <nav className="navegacao" aria-label={`Navegação da área ${area}`}>
          {links.map((link) => (
            <NavLink key={link.para} to={link.para} className="navegacao__link">
              {link.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
