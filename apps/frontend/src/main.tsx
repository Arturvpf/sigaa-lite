import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { criarQueryClient } from './api/query-client';
import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { routes } from './routes';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado');

const queryClient = criarQueryClient();
const router = createBrowserRouter(routes);

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
