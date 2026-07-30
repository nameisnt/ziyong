export function t(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.reduce(
    (result, part, index) => `${result}${part}${index < values.length ? String(values[index]) : ''}`,
    '',
  );
}
