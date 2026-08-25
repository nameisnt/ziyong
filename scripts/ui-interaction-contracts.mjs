export const UI_INTERACTION_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'back', scenario: 'tutorial-scroll-return' }),
  Object.freeze({ id: 'bagu-modal', scenario: 'bagu-hit-details' }),
  Object.freeze({ id: 'catalog', scenario: 'summary-entry-detail' }),
  Object.freeze({ id: 'close', scenario: 'prompts-task-detail' }),
  Object.freeze({ id: 'creation-modal', scenario: 'diary-creation-mode' }),
  Object.freeze({ id: 'home-layout-drag', scenario: 'home-layout-drag' }),
  Object.freeze({ id: 'reasoning-disclosure', scenario: 'card-writer-reasoning-modal' }),
  Object.freeze({ id: 'delete-unbind', scenario: 'content-version-interactions' }),
  Object.freeze({ id: 'persistence', scenario: 'content-directory-sort-persistence' }),
  Object.freeze({ id: 'reparse-diary', scenario: 'diary-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-digest', scenario: 'digest-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-forum', scenario: 'forum-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-letters', scenario: 'letters-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-storylines', scenario: 'storylines-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-summary', scenario: 'summary-failed-draft-reparse' }),
  Object.freeze({ id: 'reparse-theater', scenario: 'theater-failed-draft' }),
  Object.freeze({ id: 'settings-persistence', scenario: 'settings-theme-persistence' }),
  Object.freeze({ id: 'toggle', scenario: 'extras-chapter-detail' }),
  Object.freeze({ id: 'transfer-modal', scenario: 'content-transfer-dialog' }),
]);

export function getInteractionContractScenarios() {
  return UI_INTERACTION_CONTRACTS.map(contract => contract.scenario);
}
