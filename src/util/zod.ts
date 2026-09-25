export function validateInplace<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = parsePrettified(schema, data);
<<<<<<< HEAD
  return _.assign(data ?? {}, result) as T;
=======
  return _.assign(data, result) as T;
>>>>>>> e000f17401bc15121c7e98e8b74f8f69bb0ff16c
}

export function parsePrettified<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
