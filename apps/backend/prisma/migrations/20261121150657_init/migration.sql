-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('SECRETARIA', 'ALUNO');

-- CreateEnum
CREATE TYPE "TipoDisciplina" AS ENUM ('OBRIGATORIA', 'ELETIVA_PERFIL');

-- CreateEnum
CREATE TYPE "SituacaoMatricula" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SituacaoHistorico" AS ENUM ('APROVADO', 'REPROVADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "senha_hash" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ch_obrigatoria" INTEGER NOT NULL,
    "ch_eletiva_perfil" INTEGER NOT NULL,
    "ch_eletiva_livre" INTEGER NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ch" INTEGER NOT NULL,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estruturas_curriculares" (
    "curso_id" INTEGER NOT NULL,
    "disciplina_id" INTEGER NOT NULL,
    "tipo" "TipoDisciplina" NOT NULL,

    CONSTRAINT "estruturas_curriculares_pkey" PRIMARY KEY ("curso_id","disciplina_id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" SERIAL NOT NULL,
    "disciplina_id" INTEGER NOT NULL,
    "professor_id" INTEGER NOT NULL,
    "vagas" INTEGER NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "curso_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "turma_id" INTEGER NOT NULL,
    "situacao" "SituacaoMatricula" NOT NULL DEFAULT 'ATIVA',
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_em" TIMESTAMP(3),

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_itens" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "disciplina_id" INTEGER NOT NULL,
    "semestre" TEXT NOT NULL,
    "situacao" "SituacaoHistorico" NOT NULL,

    CONSTRAINT "historico_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_nome_key" ON "cursos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_codigo_key" ON "disciplinas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "professores_email_key" ON "professores"("email");

-- CreateIndex
CREATE INDEX "turmas_disciplina_id_idx" ON "turmas"("disciplina_id");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_usuario_id_key" ON "alunos"("usuario_id");

-- CreateIndex
CREATE INDEX "matriculas_turma_id_situacao_idx" ON "matriculas"("turma_id", "situacao");

-- CreateIndex
CREATE INDEX "matriculas_aluno_id_situacao_idx" ON "matriculas"("aluno_id", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "historico_itens_aluno_disciplina_semestre_key" ON "historico_itens"("aluno_id", "disciplina_id", "semestre");

-- AddForeignKey
ALTER TABLE "estruturas_curriculares" ADD CONSTRAINT "estruturas_curriculares_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estruturas_curriculares" ADD CONSTRAINT "estruturas_curriculares_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_itens" ADD CONSTRAINT "historico_itens_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_itens" ADD CONSTRAINT "historico_itens_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Restrições adicionadas manualmente (o Prisma não as expressa no schema).
-- As regras também são validadas na API; o banco é a última linha de defesa.
-- ---------------------------------------------------------------------------

-- Regra 2: CH da disciplina é múltipla de 15, entre 15h e 120h
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_ch_check"
  CHECK ("ch" BETWEEN 15 AND 120 AND "ch" % 15 = 0);

-- Regra 4: turma tem pelo menos 1 vaga
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_vagas_check" CHECK ("vagas" >= 1);

-- CH mínima de cada grupo do curso nunca é negativa
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_ch_check"
  CHECK ("ch_obrigatoria" >= 0 AND "ch_eletiva_perfil" >= 0 AND "ch_eletiva_livre" >= 0);

-- Uma única matrícula ATIVA por (aluno, turma); canceladas podem se repetir
CREATE UNIQUE INDEX "matriculas_aluno_turma_ativa_key"
  ON "matriculas"("aluno_id", "turma_id") WHERE "situacao" = 'ATIVA';

-- Matrícula cancelada sempre tem data de cancelamento, e ativa nunca tem
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_cancelamento_check"
  CHECK (("situacao" = 'CANCELADA') = ("cancelada_em" IS NOT NULL));
