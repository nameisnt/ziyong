export function validateInplace<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = parsePrettified(schema, data);
<<<<<<< HEAD
  return _.assign(data ?? {}, result) as T;
=======
  return _.assign(data, result) as T;
>>>>>>> c78877ecbba1ceb5d7507f33bcd5d55b9fb9431b
}

export function parsePrettified<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Error(z.prettifyError(result.error));
  }
  return result.data;
}
