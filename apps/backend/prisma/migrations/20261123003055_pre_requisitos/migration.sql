-- CreateTable
CREATE TABLE "pre_requisitos" (
    "disciplina_id" INTEGER NOT NULL,
    "pre_requisito_id" INTEGER NOT NULL,

    CONSTRAINT "pre_requisitos_pkey" PRIMARY KEY ("disciplina_id","pre_requisito_id")
);

-- CreateIndex
CREATE INDEX "pre_requisitos_pre_requisito_id_idx" ON "pre_requisitos"("pre_requisito_id");

-- AddForeignKey
ALTER TABLE "pre_requisitos" ADD CONSTRAINT "pre_requisitos_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_requisitos" ADD CONSTRAINT "pre_requisitos_pre_requisito_id_fkey" FOREIGN KEY ("pre_requisito_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Adicionado manualmente: uma disciplina não pode ser pré-requisito de si mesma.
-- (Ciclos maiores, como A -> B -> A, são validados na API.)
ALTER TABLE "pre_requisitos" ADD CONSTRAINT "pre_requisitos_diferente_check"
  CHECK ("disciplina_id" <> "pre_requisito_id");
