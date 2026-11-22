import { Navigate, type RouteObject } from 'react-router';
import { RedirecionarParaArea, RequirePerfil } from './auth/guards';
import { AppLayout } from './layouts/AppLayout';
import { MatriculasPage } from './pages/aluno/MatriculasPage';
import { OfertasPage } from './pages/aluno/OfertasPage';
import { ProgressoPage } from './pages/aluno/ProgressoPage';
import { EmConstrucao } from './pages/EmConstrucao';
import { LoginPage } from './pages/LoginPage';
import { NaoEncontrada } from './pages/NaoEncontrada';

/**
 * Mapa de rotas. Exportado como array para que os testes montem o mesmo mapa
 * num roteador em memória.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RedirecionarParaArea /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/aluno',
    element: <RequirePerfil perfil="ALUNO" />,
    children: [
      {
        element: (
          <AppLayout
            area="Aluno"
            links={[
              { para: '/aluno/ofertas', rotulo: 'Ofertas' },
              { para: '/aluno/matriculas', rotulo: 'Minhas matrículas' },
              { para: '/aluno/progresso', rotulo: 'Progresso' },
            ]}
          />
        ),
        children: [
          { index: true, element: <Navigate to="ofertas" replace /> },
          { path: 'ofertas', element: <OfertasPage /> },
          { path: 'matriculas', element: <MatriculasPage /> },
          { path: 'progresso', element: <ProgressoPage /> },
        ],
      },
    ],
  },
  {
    path: '/secretaria',
    element: <RequirePerfil perfil="SECRETARIA" />,
    children: [
      {
        element: (
          <AppLayout
            area="Secretaria"
            links={[
              { para: '/secretaria/disciplinas', rotulo: 'Disciplinas' },
              { para: '/secretaria/professores', rotulo: 'Professores' },
              { para: '/secretaria/turmas', rotulo: 'Turmas' },
            ]}
          />
        ),
        children: [
          { index: true, element: <Navigate to="disciplinas" replace /> },
          { path: 'disciplinas', element: <EmConstrucao titulo="Disciplinas" /> },
          { path: 'professores', element: <EmConstrucao titulo="Professores" /> },
          { path: 'turmas', element: <EmConstrucao titulo="Turmas" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NaoEncontrada /> },
];
