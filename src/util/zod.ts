export function validateInplace<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = parsePrettified(schema, data);
<<<<<<< HEAD
  return _.assign(data ?? {}, result) as T;
=======
  return _.assign(data, result) as T;
>>>>>>> c169052efec404f90d9d8a4c05ee9da792154bda
}

export function parsePrettified<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
