# SIGAA Lite — Sistema de Matrícula

Sistema de matrícula de graduação com dois perfis de acesso — **Secretaria** e **Aluno** — desenvolvido como teste prático da Seleção Nº 5/2026 do CIn-UFPE.

- **Secretaria:** cadastra disciplinas e professores e abre turmas com número de vagas.
- **Aluno:** matricula-se nas turmas do semestre e acompanha quanto falta para concluir o curso.

> 🚧 Em desenvolvimento. Este README é atualizado a cada fase.

## Estrutura do repositório (monorepo)

```
sigaa-lite/
├── apps/
│   ├── backend/      # API REST (Express + TypeScript + Prisma)
│   │   └── prisma/   # schema, migrations e seed
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

# 4. Criar as tabelas (migrations) e carregar os dados iniciais (seed)
npm run db:migrate
npm run db:seed

# 5. Rodar back-end (http://localhost:3333) e front-end (http://localhost:5173)
npm run dev
```

> No PowerShell, use `Copy-Item` no lugar de `cp`.
>
> O `npm install` já gera o Prisma Client (`postinstall`). Para recomeçar do zero a qualquer momento: `npm run db:reset` (apaga o banco, reaplica as migrations e roda o seed).

## Usuários do seed

O login é feito apenas pelo nome de usuário (a senha é opcional e os usuários do seed não têm senha).

| Usuário      | Perfil     | Curso                    | Cenário que exercita                                                                    |
| ------------ | ---------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `secretaria` | Secretaria | —                        | Cadastros de disciplinas, professores e turmas                                          |
| `ana`        | Aluno      | Ciência da Computação    | 165h de eletiva de perfil (exige 120h): **45h excedentes contam como livre**            |
| `bruno`      | Aluno      | Ciência da Computação    | Recursa IF669 (reprovado); ocupa uma das 2 vagas da turma lotada de IF676               |
| `carla`      | Aluno      | Engenharia da Computação | Mesmas disciplinas da Ana com outra classificação (IF671 é perfil, IF677 é livre)       |
| `diego`      | Aluno      | Engenharia da Computação | Calouro sem histórico (progresso zerado)                                                |
| `eduarda`    | Aluno      | Engenharia da Computação | Quase formada: obrigatórias e perfil completas, livre acima do exigido (limite de 100%) |

### Dados de exemplo

- **Cursos:** Ciência da Computação (CC) e Engenharia da Computação (EC), ambos exigindo 360h obrigatórias, 120h de eletiva de perfil e 60h de eletiva livre.
- **Disciplinas compartilhadas com classificação diferente:** IF671 e IF672 são obrigatórias em CC e eletivas de perfil em EC; IF673 é eletiva de perfil em CC e obrigatória em EC; IF677 e IF678 estão só em CC, e IF674 só em EC (eletiva livre para o outro curso).
- **Fora das duas estruturas (sempre eletiva livre):** CT001, LE500 e HU100.
- **Turmas:** 12 turmas no semestre; **IF676 está lotada** (2/2) e **IF678 tem uma única vaga** (2/3).

## Modelo de dados

```
Usuario 1──0..1 Aluno N──1 Curso 1──N EstruturaCurricular N──1 Disciplina
                  │                                                 │
                  ├──N HistoricoItem N──────────────────────────────┤
                  │                                                 │
                  └──N Matricula N──1 Turma N──1 Professor          │
                                        └──────N──1─────────────────┘
```

| Entidade              | Restrições principais                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `Usuario`             | `username` único; perfil `SECRETARIA` ou `ALUNO`; senha opcional                          |
| `Curso`               | CH mínima por grupo (obrigatória, eletiva de perfil, eletiva livre), nunca negativa       |
| `Disciplina`          | `codigo` único (regra 1); CH múltipla de 15 entre 15 e 120 (regra 2)                      |
| `EstruturaCurricular` | Chave primária `(curso, disciplina)`; tipo `OBRIGATORIA` ou `ELETIVA_PERFIL`              |
| `Professor`           | `email` único (regra 3)                                                                   |
| `Turma`               | Disciplina e professor obrigatórios; `vagas >= 1` (regra 4)                               |
| `Aluno`               | Pertence a um curso e a um usuário                                                        |
| `Matricula`           | Situação `ATIVA` ou `CANCELADA`; **no máximo uma matrícula ativa por (aluno, turma)**     |
| `HistoricoItem`       | Situação `APROVADO` ou `REPROVADO`, com semestre; único por (aluno, disciplina, semestre) |

## Scripts de banco (na raiz)

| Comando              | O que faz                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `npm run db:migrate` | Aplica as migrations pendentes (`prisma migrate deploy`)            |
| `npm run db:seed`    | Apaga os dados e recarrega o seed (pode ser executado várias vezes) |
| `npm run db:reset`   | Recria o banco do zero: migrations + seed                           |

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

### ORM: Prisma

O **Prisma** gera tipos TypeScript a partir do schema e mantém o histórico de migrations versionado. Uso o driver `pg` via adapter oficial (`@prisma/adapter-pg`), padrão do Prisma 7.

**Regras de integridade no banco, não só na API.** Algumas restrições não podem ser expressas no `schema.prisma`, então foram escritas em SQL na migration inicial:

- `CHECK` da CH da disciplina (múltipla de 15, entre 15 e 120) e de `vagas >= 1`;
- **índice único parcial** `(aluno_id, turma_id) WHERE situacao = 'ATIVA'`: impede matrícula duplicada mesmo sob concorrência, mas permite que o aluno se matricule de novo numa turma da qual tinha cancelado;
- `CHECK` que amarra `cancelada_em` à situação `CANCELADA`.

A API também valida tudo isso e devolve erros de negócio claros; o banco é a última linha de defesa.

**Vagas ocupadas = contagem de matrículas ativas**, sem um contador na tabela de turmas. Assim não existe um número que possa ficar dessincronizado: cancelar uma matrícula devolve a vaga automaticamente (regra 8). Para evitar que duas matrículas simultâneas ocupem a última vaga, a matrícula será feita numa transação que trava a linha da turma (`SELECT ... FOR UPDATE`) antes de contar — detalhado na Fase 3.

**Matrículas canceladas não são apagadas**: ficam com situação `CANCELADA` e data de cancelamento, preservando o histórico.

**IDs inteiros autoincrementais**, mais simples de ler e depurar. Como o aluno é sempre identificado pelo token (nunca pela URL ou corpo), um id sequencial não permite acessar dados de outro aluno.

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
| 1    | Modelagem de dados e seed    | ✅ Concluída |
| 2    | Autenticação e base da API   | ⏳ A fazer   |
| 3    | Fluxo do aluno (back-end)    | ⏳ A fazer   |
| 4    | Testes das regras de negócio | ⏳ A fazer   |
| 5    | Front-end base               | ⏳ A fazer   |
| 6    | Front-end do aluno           | ⏳ A fazer   |
| 7    | Secretaria                   | ⏳ A fazer   |
| 8    | Requisito à escolha          | ⏳ A fazer   |
| 9    | Documentação final           | ⏳ A fazer   |
