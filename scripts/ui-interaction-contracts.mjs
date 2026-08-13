export const UI_INTERACTION_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'back', scenario: 'tutorial-scroll-return' }),
  Object.freeze({ id: 'catalog', scenario: 'summary-entry-detail' }),
  Object.freeze({ id: 'close', scenario: 'prompts-task-detail' }),
  Object.freeze({ id: 'delete-unbind', scenario: 'content-version-interactions' }),
  Object.freeze({ id: 'persistence', scenario: 'content-directory-sort-persistence' }),
  Object.freeze({ id: 'reparse', scenario: 'theater-failed-draft' }),
  Object.freeze({ id: 'toggle', scenario: 'extras-chapter-detail' }),
]);

export function getInteractionContractScenarios() {
  return UI_INTERACTION_CONTRACTS.map(contract => contract.scenario);
}
