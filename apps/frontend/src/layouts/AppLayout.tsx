import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { Icone } from '../components/Icone';

export interface LinkNavegacao {
  para: string;
  rotulo: string;
}

/** Estrutura comum das áreas logadas: cabeçalho com marca, usuário e sair, navegação e conteúdo. */
export function AppLayout({ area, links }: { area: string; links: LinkNavegacao[] }) {
  const { usuario, sair } = useAuth();
  const nome = usuario?.aluno?.nome ?? usuario?.username;
  const curso = usuario?.aluno?.curso.nome;

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho__topo">
          <div className="marca">
            <span className="marca__icone">
              <Icone nome="marca" />
            </span>
            <div className="marca__textos">
              <span className="marca__nome">
                SIGAA Lite <span className="marca__area">{area}</span>
              </span>
              <span className="marca__usuario" title={curso ? `${nome} · ${curso}` : nome}>
                <span>{nome}</span>
                {curso && <span> · {curso}</span>}
              </span>
            </div>
          </div>
          <button className="botao botao--discreto" type="button" onClick={sair}>
            Sair
          </button>
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
