export async function runSerialInstall<T>(rows: T[], install: (row: T) => Promise<void>) {
  for (const row of rows) await install(row);
}

export function repositoryIdentity(value: string) {
  const url = new URL(value);
  return `${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '')}`;
}
