# SIGAA Lite — Sistema de Matrícula

Sistema de matrícula de graduação com dois perfis de acesso — **Secretaria** e **Aluno** — desenvolvido como teste prático da Seleção Nº 5/2026 do CIn-UFPE.

- **Secretaria:** cadastra disciplinas e professores e abre turmas com número de vagas.
- **Aluno:** matricula-se nas turmas do semestre e acompanha quanto falta para concluir o curso.

> 🚧 Em desenvolvimento. Este README é atualizado a cada fase.

## Estrutura do repositório (monorepo)

```
sigaa-lite/
├── apps/
│   ├── backend/      # API REST (Express + TypeScript)
│   └── frontend/     # SPA (React + Vite + TypeScript)
├── docker/           # Scripts de inicialização do PostgreSQL
├── docker-compose.yml
├── eslint.config.js  # ESLint compartilhado
├── .prettierrc.json  # Prettier compartilhado
└── tsconfig.base.json
```

Os dois apps são **npm workspaces**: um único `npm install` na raiz instala tudo, e as configurações de TypeScript, ESLint e Prettier são compartilhadas.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior (npm incluso)
- [Docker](https://www.docker.com/) com Docker Compose (para o PostgreSQL)

## Como rodar do zero

```bash
# 1. Instalar as dependências de todos os workspaces
npm install

# 2. Criar os arquivos de ambiente
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. Subir o banco de dados
docker compose up -d

# 4. Rodar back-end (http://localhost:3333) e front-end (http://localhost:5173)
npm run dev
```

> No PowerShell, use `Copy-Item` no lugar de `cp`.

## Scripts úteis (na raiz)

| Comando                | O que faz                                    |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Sobe back-end e front-end juntos             |
| `npm run dev:backend`  | Sobe só a API, com recarregamento automático |
| `npm run dev:frontend` | Sobe só o front-end                          |
| `npm test`             | Roda os testes automatizados                 |
| `npm run lint`         | Analisa o código com ESLint                  |
| `npm run format`       | Formata o código com Prettier                |
| `npm run typecheck`    | Verifica os tipos de todos os workspaces     |
| `npm run build`        | Gera o build de produção dos dois apps       |

## Principais decisões

### Back-end: Express

Escolhi o **Express** por ser minimalista e amplamente conhecido: a organização do código (rotas → controllers → services → repositórios) fica explícita no próprio projeto, em vez de escondida em convenções do framework. Isso deixa cada decisão visível e fácil de explicar. NestJS traria injeção de dependência e decorators que seriam complexidade desnecessária para o tamanho deste sistema.

A aplicação é criada por uma função (`createApp`) separada do `server.ts`, o que permite testar as rotas com **supertest** sem abrir uma porta.

### Banco de dados: PostgreSQL

O **PostgreSQL** oferece transações e locks de linha (`SELECT ... FOR UPDATE`), necessários para tratar com segurança a concorrência na última vaga de uma turma. Ele roda via Docker Compose, então não é preciso instalar nada além do Docker. Um segundo banco (`sigaa_test`) é criado automaticamente para os testes de integração, isolado dos dados de desenvolvimento.

### Validação: Zod

O **Zod** valida tanto as variáveis de ambiente (a API falha cedo se algo estiver errado) quanto, nas próximas fases, os dados de entrada das rotas, gerando os tipos TypeScript a partir dos próprios schemas.

### Testes: Vitest + supertest

O **Vitest** é rápido, tem suporte nativo a TypeScript/ESM e API compatível com Jest. O **supertest** permite testar a API de ponta a ponta (HTTP → banco).

### Front-end: React + Vite + TypeScript

O **Vite** oferece build e recarregamento rápidos com configuração mínima.

## Status

| Fase | Descrição                    | Status       |
| ---- | ---------------------------- | ------------ |
| 0    | Setup do monorepo            | ✅ Concluída |
| 1    | Modelagem de dados e seed    | ⏳ A fazer   |
| 2    | Autenticação e base da API   | ⏳ A fazer   |
| 3    | Fluxo do aluno (back-end)    | ⏳ A fazer   |
| 4    | Testes das regras de negócio | ⏳ A fazer   |
| 5    | Front-end base               | ⏳ A fazer   |
| 6    | Front-end do aluno           | ⏳ A fazer   |
| 7    | Secretaria                   | ⏳ A fazer   |
| 8    | Requisito à escolha          | ⏳ A fazer   |
| 9    | Documentação final           | ⏳ A fazer   |
