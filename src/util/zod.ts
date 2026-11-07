export function validateInplace<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = parsePrettified(schema, data);
<<<<<<< HEAD
  return _.assign(data ?? {}, result) as T;
=======
  return _.assign(data, result) as T;
>>>>>>> 933cdcf1f3f97a5a92e0a54e4b3896873d39a213
}

export function parsePrettified<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
