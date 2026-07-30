import { CharacterRefSchema } from '@/type/diary';
import { FailedGenerationDraftSchema } from '@/type/generation';

export const LetterFormatSchema = z.enum(['formal', 'note', 'sms', 'email']);
export type LetterFormat = z.infer<typeof LetterFormatSchema>;

export const LetterEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  favorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  sender: CharacterRefSchema,
  receiver: CharacterRefSchema,
  format: LetterFormatSchema,
});
export type LetterEntry = z.infer<typeof LetterEntrySchema>;

export const LetterBookSchema = z.object({
  id: z.string(),
  participantKey: z.string(),
  participants: z.array(CharacterRefSchema).default([]),
  title: z.string(),
  entries: z.array(LetterEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LetterBook = z.infer<typeof LetterBookSchema>;

export const LettersScopeDataSchema = z.object({
  books: z.array(LetterBookSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type LettersScopeData = z.infer<typeof LettersScopeDataSchema>;
