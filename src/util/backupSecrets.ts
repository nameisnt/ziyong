interface ExternalProfileSecret {
  apiKey: string;
  id?: string;
  name?: string;
}

export function preserveExternalProfileApiKeys(
  stagedProfiles: ExternalProfileSecret[],
  localProfiles: ExternalProfileSecret[],
) {
  stagedProfiles.forEach(profile => {
    if (profile.apiKey.trim()) return;
    const local = localProfiles.find(
      candidate =>
        (profile.id && candidate.id === profile.id) ||
        (profile.name && candidate.name === profile.name),
    );
    if (local?.apiKey) profile.apiKey = local.apiKey;
  });
}
