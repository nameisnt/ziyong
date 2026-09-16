export function validateInplace<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = parsePrettified(schema, data);
<<<<<<< HEAD
  return _.assign(data ?? {}, result) as T;
=======
  return _.assign(data, result) as T;
>>>>>>> ca79a60657738624986a5eb77a4305c3a12174bd
}

export function parsePrettified<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
