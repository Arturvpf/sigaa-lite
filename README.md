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

| Comando                | O que faz                                          |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Sobe back-end e front-end juntos                   |
| `npm run dev:backend`  | Sobe só a API, com recarregamento automático       |
| `npm run dev:frontend` | Sobe só o front-end                                |
| `npm test`             | Roda todos os testes (unitários + integração)      |
| `npm run test:unit`    | Roda só os testes unitários (não precisa de banco) |
| `npm run lint`         | Analisa o código com ESLint                        |
| `npm run format`       | Formata o código com Prettier                      |
| `npm run typecheck`    | Verifica os tipos de todos os workspaces           |
| `npm run build`        | Gera o build de produção dos dois apps             |

> Os testes de integração usam o banco `sigaa_test` (criado pelo docker-compose), então o PostgreSQL precisa estar no ar: `docker compose up -d`. As migrations são aplicadas automaticamente nesse banco antes dos testes, e ele é limpo antes de cada teste — o banco de desenvolvimento nunca é tocado.

## API

Base: `http://localhost:3333`. Rotas autenticadas exigem o cabeçalho `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota          | Body                                  | Resposta                              | Erros                                                   |
| ------ | ------------- | ------------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| POST   | `/auth/login` | `{ "username": "ana", "senha"?: "" }` | `200 { token, expiresIn, usuario }`   | 400 `VALIDACAO`, 401 `CREDENCIAIS_INVALIDAS`            |
| GET    | `/auth/me`    | —                                     | `200 { id, username, perfil, aluno }` | 401 `TOKEN_AUSENTE`, `TOKEN_INVALIDO`, `TOKEN_EXPIRADO` |

`usuario.aluno` é `{ id, nome, curso: { id, nome } }` para alunos e `null` para a secretaria.

### Aluno

Todas exigem token de um usuário com perfil `ALUNO` (401 sem token, 403 com outro perfil). **O aluno é sempre o do token**: nenhuma rota recebe o id do aluno.

| Método | Rota                    | Entrada               | Resposta                                                   | Erros de negócio                                                                                                                                |
| ------ | ----------------------- | --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/aluno/ofertas`        | `?q=&page=&pageSize=` | `200` página de ofertas (abaixo)                           | —                                                                                                                                               |
| POST   | `/aluno/matriculas`     | `{ "turmaId": 1 }`    | `201 { id }`                                               | 404 `TURMA_NAO_ENCONTRADA`, 422 `TURMA_LOTADA`, 422 `DISCIPLINA_JA_APROVADA`, 409 `JA_MATRICULADO_NA_TURMA`, 422 `JA_MATRICULADO_NA_DISCIPLINA` |
| GET    | `/aluno/matriculas`     | —                     | `200 [{ id, criadaEm, turma, classificacao }]` (só ativas) | —                                                                                                                                               |
| DELETE | `/aluno/matriculas/:id` | —                     | `204`                                                      | 404 `MATRICULA_NAO_ENCONTRADA`, 422 `MATRICULA_JA_CANCELADA`                                                                                    |
| GET    | `/aluno/progresso`      | —                     | `200 { curso, grupos }`                                    | —                                                                                                                                               |

Cada **oferta** traz:

```json
{
  "id": 7,
  "disciplina": { "id": 9, "codigo": "IF676", "nome": "Inteligência Artificial", "ch": 60 },
  "professor": { "id": 2, "nome": "Ricardo Alves" },
  "vagas": 2,
  "vagasOcupadas": 2,
  "vagasDisponiveis": 0,
  "lotada": true,
  "classificacao": "ELETIVA_PERFIL",
  "matriculaId": null,
  "jaAprovado": false
}
```

`classificacao` é `OBRIGATORIA`, `ELETIVA_PERFIL` ou `ELETIVA_LIVRE` **para o curso do aluno logado**; `matriculaId` é a matrícula ativa do aluno nessa turma (ou `null`); `jaAprovado` indica que ele não pode se matricular.

Cada **grupo** do progresso traz:

```json
{
  "grupo": "ELETIVA_PERFIL",
  "chExigida": 120,
  "chIntegralizada": 120,
  "chEmCurso": 0,
  "chFaltante": 0,
  "percentual": 100
}
```

### Formato de erro

Todos os erros têm o mesmo formato. O `code` é estável e pode ser usado pelo front-end; a `message` é legível para o usuário; `details` aparece só quando ajuda (ex.: campos inválidos).

```json
{
  "code": "VALIDACAO",
  "message": "Dados de entrada inválidos.",
  "details": [{ "campo": "username", "mensagem": "Informe o nome de usuário" }]
}
```

| Status | Quando                                                    | Exemplos de `code`                                         |
| ------ | --------------------------------------------------------- | ---------------------------------------------------------- |
| 400    | Entrada mal formada (tipo, formato, campo faltando, JSON) | `VALIDACAO`, `JSON_INVALIDO`                               |
| 401    | Não autenticado                                           | `TOKEN_AUSENTE`, `TOKEN_EXPIRADO`, `CREDENCIAIS_INVALIDAS` |
| 403    | Autenticado, mas com perfil sem acesso                    | `ACESSO_NEGADO`                                            |
| 404    | Recurso ou rota inexistente                               | `ROTA_NAO_ENCONTRADA`, `TURMA_NAO_ENCONTRADA`              |
| 409    | Conflito com dados existentes (duplicidade)               | `REGISTRO_DUPLICADO`, `JA_MATRICULADO_NA_TURMA`            |
| 422    | Entrada válida, mas recusada por regra de negócio         | `TURMA_LOTADA`, `DISCIPLINA_JA_APROVADA`                   |
| 500    | Erro inesperado (sem detalhes internos na resposta)       | `ERRO_INTERNO`                                             |

### Listagens: busca e paginação

Todas as listagens aceitam `?q=<busca>&page=<n>&pageSize=<n>` (padrão `page=1`, `pageSize=10`, máximo `50`) e respondem:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 10, "totalPages": 0 }
```

## Principais decisões

### Back-end: Express

Escolhi o **Express** por ser minimalista e amplamente conhecido: a organização do código (rotas → controllers → services → repositórios) fica explícita no próprio projeto, em vez de escondida em convenções do framework. Isso deixa cada decisão visível e fácil de explicar. NestJS traria injeção de dependência e decorators que seriam complexidade desnecessária para o tamanho deste sistema.

A aplicação é criada por uma função (`createApp`) separada do `server.ts`, o que permite testar as rotas com **supertest** sem abrir uma porta.

### Organização do código

```
apps/backend/src/
├── app.ts               # raiz de composição: cria repositórios, services e rotas
├── server.ts            # sobe o servidor HTTP
├── config/env.ts        # variáveis de ambiente validadas
├── database/prisma.ts   # client do Prisma
├── modules/<domínio>/   # um módulo por domínio (auth, aluno, secretaria...)
│   ├── *.routes.ts      # rotas e middlewares de acesso
│   ├── *.controller.ts  # HTTP ⇄ service: valida a entrada e devolve a resposta
│   ├── *.service.ts     # regras de negócio
│   ├── *.repository.ts  # consultas ao banco
│   └── *.schemas.ts     # schemas Zod da entrada
└── shared/              # erros, validação, paginação, autenticação
```

As **regras de negócio ficam nos services**, nunca nos controllers. Os services recebem as dependências por parâmetro (funções fábrica `createXxx`), sem framework de injeção de dependência: em teste, basta passar outras implementações.

### Autenticação: JWT sem estado

O login é por nome de usuário (a senha é opcional, como pede o enunciado). A API devolve um **JWT assinado com HS256** e validade curta (1h por padrão, configurável em `JWT_EXPIRES_IN_SECONDS`) contendo o id do usuário, o perfil e, para alunos, o id do aluno.

- O token vai no cabeçalho `Authorization` (não em cookie), o que evita CSRF. Sem sessão no servidor, a API continua sem estado.
- **O aluno é sempre identificado pelo token**, nunca pelo corpo nem pela URL (regra 9). Não existe rota que receba o id do aluno.
- Se um usuário tiver senha cadastrada, ela é exigida e verificada com **scrypt** (nativo do Node). Os usuários do seed não têm senha.
- Usuário inexistente e senha errada recebem a **mesma resposta**, para não revelar quais usuários existem.
- Guards: `authenticate` (401) e `requirePerfil('ALUNO' | 'SECRETARIA')` (403).

### Códigos HTTP

Separei **400** (a requisição está mal formada) de **422** (a requisição é válida, mas uma regra de negócio a recusa, como turma lotada). Assim o front-end sabe se o problema é no formulário ou na situação. Conflitos de unicidade (código de disciplina ou e-mail repetido) usam **409**.

### Segurança

- CORS restrito à origem do front-end (`CORS_ORIGIN`);
- cabeçalhos de segurança com `helmet`;
- segredos apenas no `.env` (fora do git); a API não sobe sem um `JWT_SECRET` de pelo menos 32 caracteres;
- consultas via Prisma (parametrizadas), sem SQL concatenado;
- corpo das requisições limitado a 100 kB e `pageSize` limitado a 50;
- erros inesperados não expõem detalhes internos.

### Banco de dados: PostgreSQL

O **PostgreSQL** oferece transações e locks de linha (`SELECT ... FOR UPDATE`), necessários para tratar com segurança a concorrência na última vaga de uma turma. Ele roda via Docker Compose, então não é preciso instalar nada além do Docker. Um segundo banco (`sigaa_test`) é criado automaticamente para os testes de integração, isolado dos dados de desenvolvimento.

### ORM: Prisma

O **Prisma** gera tipos TypeScript a partir do schema e mantém o histórico de migrations versionado. Uso o driver `pg` via adapter oficial (`@prisma/adapter-pg`), padrão do Prisma 7.

**Regras de integridade no banco, não só na API.** Algumas restrições não podem ser expressas no `schema.prisma`, então foram escritas em SQL na migration inicial:

- `CHECK` da CH da disciplina (múltipla de 15, entre 15 e 120) e de `vagas >= 1`;
- **índice único parcial** `(aluno_id, turma_id) WHERE situacao = 'ATIVA'`: impede matrícula duplicada mesmo sob concorrência, mas permite que o aluno se matricule de novo numa turma da qual tinha cancelado;
- `CHECK` que amarra `cancelada_em` à situação `CANCELADA`.

A API também valida tudo isso e devolve erros de negócio claros; o banco é a última linha de defesa.

**Vagas ocupadas = contagem de matrículas ativas**, sem um contador na tabela de turmas. Assim não existe um número que possa ficar dessincronizado: cancelar uma matrícula devolve a vaga automaticamente (regra 8). A concorrência na última vaga é tratada na matrícula (abaixo).

**Matrículas canceladas não são apagadas**: ficam com situação `CANCELADA` e data de cancelamento, preservando o histórico.

**IDs inteiros autoincrementais**, mais simples de ler e depurar. Como o aluno é sempre identificado pelo token (nunca pela URL ou corpo), um id sequencial não permite acessar dados de outro aluno.

### Matrícula e concorrência na última vaga

Toda a matrícula acontece **numa transação que começa travando a linha da turma** (`SELECT ... FOR UPDATE`). Se dois alunos tentam a última vaga ao mesmo tempo, o segundo espera o primeiro terminar e, ao contar as matrículas ativas, já enxerga a vaga ocupada — e recebe `TURMA_LOTADA`.

Como isso é testado: disparar requisições simultâneas raramente acerta a janela exata da corrida, então um teste assim passaria mesmo sem o lock (verifiquei). Por isso há um **teste determinístico**: o próprio teste abre uma transação que trava a turma e ocupa a última vaga sem confirmar; a matrícula pela API precisa esperar e, depois, receber `TURMA_LOTADA`. Removendo o `FOR UPDATE`, esse teste falha (a API aceita a matrícula). Há também um teste com 6 matrículas simultâneas numa turma de 1 vaga como verificação ponta a ponta.

Escolhi o lock de linha em vez de um contador com update condicional porque as vagas são **calculadas** (contagem de matrículas ativas), então não há uma coluna para atualizar condicionalmente. O lock é só da turma em questão: matrículas em turmas diferentes não se bloqueiam.

Ordem das verificações, dentro da transação: turma existe (404) → disciplina já aprovada (422) → já matriculado nesta turma (409) ou em outra turma da mesma disciplina (422) → turma lotada (422). Assim, quem já está matriculado numa turma lotada recebe a mensagem certa ("já matriculado"), e não "turma lotada".

Decisões:

- **Reprovado pode, aprovado não** (regra 7): só um item `APROVADO` no histórico bloqueia a matrícula.
- **Não permito duas turmas da mesma disciplina ao mesmo tempo**: não faz sentido cursar a mesma disciplina duas vezes no semestre, e isso contaria a CH em dobro no progresso.
- **Já matriculado na turma responde 409** (conflito: o recurso já existe); as demais recusas são **422** (regra de negócio).
- **Cancelar = `DELETE /aluno/matriculas/:id` → 204.** Para o aluno, a matrícula deixa de existir entre as ativas; no banco ela vira `CANCELADA` com a data, e a vaga volta automaticamente porque só as ativas são contadas (regra 8). O cancelamento é um update condicional (`WHERE situacao = 'ATIVA'`), então dois cancelamentos simultâneos não "devolvem" a vaga duas vezes.
- **Matrícula de outro aluno responde 404**, igual a uma inexistente, em vez de 403: assim a API não revela que aquele id existe (regra 9). A busca já é filtrada pelo aluno do token.
- `GET /aluno/matriculas` **não é paginada**: um aluno tem poucas matrículas no semestre.

### Progresso: função pura

O cálculo fica em [`progresso.ts`](apps/backend/src/modules/aluno/progresso.ts), uma **função pura** que recebe a CH exigida do curso, a estrutura curricular, as disciplinas aprovadas e as em curso. Sem banco e sem efeitos colaterais, as regras 10 a 13 são testadas diretamente, com casos pequenos e legíveis.

- **Classificação** (regra 10): pela estrutura do curso do aluno; fora da estrutura é eletiva livre.
- **Só aprovadas integralizam** (regra 12); matrículas ativas aparecem em `chEmCurso` e **não reduzem** `chFaltante`, que é o que ainda precisa ser aprovado.
- **Excedente de perfil vira livre** (regra 11). Decidi aplicar o mesmo à CH em curso: se o aluno já integralizou 90h de 120h de perfil e está cursando 60h de perfil, 30h aparecem como perfil em curso e 30h como livre em curso — que é como elas vão contar quando forem aprovadas.
- **Limites** (regra 13): `chFaltante = max(0, exigida − integralizada)` e `percentual = min(100, ⌊integralizada / exigida × 100⌋)`. `chIntegralizada` mostra o valor real (pode passar do exigido); só o percentual é limitado. Arredondo **para baixo** para não exibir 100% antes de o grupo estar completo.
- Uma disciplina aprovada mais de uma vez no histórico conta uma vez só.

### Validação: Zod

O **Zod** valida as variáveis de ambiente (a API não sobe se algo estiver errado) e a entrada de todas as rotas (body e query string), gerando os tipos TypeScript a partir dos próprios schemas. A validação é centralizada na função `parse`, que transforma qualquer falha em `400 VALIDACAO` com a lista de campos.

### Testes: Vitest + supertest

O **Vitest** é rápido, tem suporte nativo a TypeScript/ESM e API compatível com Jest. Os testes são divididos em dois projetos:

- **unit** (`tests/unit`): funções puras e peças isoladas, sem banco;
- **integration** (`tests/integration`): a API real via **supertest**, ligada ao PostgreSQL no banco `sigaa_test`. Cada teste começa com o banco vazio e cria só os dados de que precisa, então os testes não dependem uns dos outros nem do seed.

### Front-end: React + Vite + TypeScript

O **Vite** oferece build e recarregamento rápidos com configuração mínima.

## Status

| Fase | Descrição                    | Status       |
| ---- | ---------------------------- | ------------ |
| 0    | Setup do monorepo            | ✅ Concluída |
| 1    | Modelagem de dados e seed    | ✅ Concluída |
| 2    | Autenticação e base da API   | ✅ Concluída |
| 3    | Fluxo do aluno (back-end)    | ✅ Concluída |
| 4    | Testes das regras de negócio | ⏳ A fazer   |
| 5    | Front-end base               | ⏳ A fazer   |
| 6    | Front-end do aluno           | ⏳ A fazer   |
| 7    | Secretaria                   | ⏳ A fazer   |
| 8    | Requisito à escolha          | ⏳ A fazer   |
| 9    | Documentação final           | ⏳ A fazer   |
