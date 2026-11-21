import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ error: 'Informe o nome de usuário' })
    .trim()
    .toLowerCase()
    .min(1, 'Informe o nome de usuário')
    .max(50, 'O nome de usuário deve ter no máximo 50 caracteres'),
  // Opcional: só é exigida para usuários que têm senha cadastrada
  senha: z.string().max(200).optional(),
});

export type LoginInput = z.output<typeof loginSchema>;
