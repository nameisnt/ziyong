export interface BackupPolicyDomain {
  category: 'configuration' | 'content' | 'draft';
  key: string;
  scope: 'chat' | 'global';
}

export function assertFullBackupImportAllowed(backupKind: 'current-chat' | 'full') {
  if (backupKind === 'current-chat') {
    throw new Error('当前聊天备份不能执行完整恢复，请使用“导入到当前聊天”');
  }
}

export function selectCurrentChatBackupDomains<TDomain extends BackupPolicyDomain>(domains: TDomain[]) {
  return domains.filter(domain => domain.scope === 'chat');
}

export function selectGeneratedContentDomains<TDomain extends BackupPolicyDomain>(domains: TDomain[]) {
  return domains.filter(
    domain => domain.scope === 'chat' && (domain.category === 'content' || domain.category === 'draft'),
  );
}

export function analyzeBackupDomainCoverage<TDomain extends Pick<BackupPolicyDomain, 'key'>>(
  registeredDomains: TDomain[],
  importedDomainKeys: Iterable<string>,
  backupDomainKeys: Iterable<string>,
) {
  const registeredKeys = new Set(registeredDomains.map(domain => domain.key));
  const importedKeys = new Set(importedDomainKeys);
  return {
    missingDomains: registeredDomains.filter(domain => !importedKeys.has(domain.key)),
    unknownDomainKeys: [...backupDomainKeys].filter(key => !registeredKeys.has(key)),
  };
}
