type RelationshipStoreFixture = {
  characters: Array<{
    id: string;
    name: string;
  }>;
  links: Array<{ id: string; label: string }>;
  resetCurrentScope: () => void | Promise<void>;
};

type RelationshipVisualContext = {
  getRelationship: () => RelationshipStoreFixture;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function setInputValue(input: HTMLInputElement, value: string, eventType: 'change' | 'input') {
  input.value = value;
  input.dispatchEvent(new Event(eventType, { bubbles: true }));
}

function findButtonByTitle(title: string, root: ParentNode = document) {
  return root.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
}

function clickNoticeAction(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(action =>
    action.textContent?.includes(label),
  );
  if (!button) throw new Error(`Relationship notice action is missing: ${label}`);
  button.click();
}

async function selectComboboxOption(root: HTMLElement, label: string, waitForPaint: () => Promise<void>) {
  const input = root.querySelector<HTMLInputElement>('.pc-combobox-input');
  if (!input) throw new Error(`Relationship combobox input is missing for ${label}`);
  input.click();
  await waitForPaint();
  const option = [...root.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
    button.textContent?.includes(label),
  );
  if (!option) throw new Error(`Relationship combobox option is missing: ${label}`);
  option.click();
  await waitForPaint();
}

async function createLink(from: string, to: string, label: string, waitForPaint: () => Promise<void>) {
  let form = document.querySelector<HTMLElement>('.pc-relation-form');
  if (!form) throw new Error('Relationship create form is missing');
  let combos = form.querySelectorAll<HTMLElement>('.pc-combobox');
  if (combos.length !== 2) throw new Error('Relationship create form needs two character selectors');
  await selectComboboxOption(combos[0], from, waitForPaint);
  form = document.querySelector<HTMLElement>('.pc-relation-form');
  combos = form?.querySelectorAll<HTMLElement>('.pc-combobox') ?? ({} as NodeListOf<HTMLElement>);
  if (!form || combos.length !== 2) throw new Error('Relationship target selector disappeared');
  await selectComboboxOption(combos[1], to, waitForPaint);
  form = document.querySelector<HTMLElement>('.pc-relation-form');
  const labelInput = form?.querySelector<HTMLInputElement>(':scope > input.pc-field');
  if (!form || !labelInput) throw new Error('Relationship label input is missing');
  setInputValue(labelInput, label, 'input');
  findButtonByTitle('新增关系', form)?.click();
}

export async function applyRelationshipVisualScenario(
  name: string,
  { getRelationship, resetPhoneToRoute, waitForCondition, waitForPaint }: RelationshipVisualContext,
) {
  if (name !== 'relationship-crud') return false;

  const relationship = getRelationship();
  await relationship.resetCurrentScope();

  resetPhoneToRoute('relationship', 'root', '关系网');
  await waitForPaint();

  for (const characterName of ['甲', '乙']) {
    const draft = document.querySelector<HTMLInputElement>('.pc-inline-form input[placeholder="人物名字"]');
    if (!draft) throw new Error('Relationship character draft is missing');
    setInputValue(draft, characterName, 'input');
    findButtonByTitle('新增人物', document.querySelector('.pc-inline-form') || document)?.click();
    await waitForPaint();
  }
  if (relationship.characters.length !== 2) throw new Error('Relationship UI did not create two characters');

  const firstRow = [...document.querySelectorAll<HTMLElement>('.pc-character-editor-row')].find(
    row => row.querySelector<HTMLInputElement>(':scope > input.pc-field')?.value === '甲',
  );
  const firstName = firstRow?.querySelector<HTMLInputElement>(':scope > input.pc-field');
  if (!firstName) throw new Error('Relationship character rename input is missing');
  setInputValue(firstName, '甲改名', 'change');
  if (!(await waitForCondition(() => relationship.characters.some(character => character.name === '甲改名')))) {
    throw new Error('Relationship character rename did not persist');
  }

  await createLink('甲改名', '乙', '朋友', waitForPaint);
  if (!(await waitForCondition(() => relationship.links.length === 1))) {
    throw new Error('Relationship UI did not create the directed link');
  }
  const relationRow = document.querySelector<HTMLElement>('.pc-relation-row');
  const relationLabel = relationRow?.querySelector<HTMLInputElement>(':scope > input.pc-field');
  if (!relationRow || !relationLabel) throw new Error('Relationship link editor is missing');
  setInputValue(relationLabel, '同伴', 'change');
  if (!(await waitForCondition(() => relationship.links[0]?.label === '同伴'))) {
    throw new Error('Relationship link label edit did not persist');
  }

  findButtonByTitle('删除', relationRow)?.click();
  if (
    !(await waitForCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-phone-notice')].some(notice =>
        notice.textContent?.includes('甲改名 → 乙'),
      ),
    ))
  ) {
    throw new Error('Relationship link delete confirmation is missing');
  }
  clickNoticeAction('删除');
  if (!(await waitForCondition(() => relationship.links.length === 0))) {
    throw new Error('Relationship confirmed link deletion did not persist');
  }

  await createLink('甲改名', '乙', '再次关联', waitForPaint);
  if (!(await waitForCondition(() => relationship.links.length === 1))) {
    throw new Error('Relationship fixture could not recreate a link for cascade deletion');
  }
  const renamedRow = [...document.querySelectorAll<HTMLElement>('.pc-character-editor-row')].find(
    row => row.querySelector<HTMLInputElement>(':scope > input.pc-field')?.value === '甲改名',
  );
  findButtonByTitle('删除', renamedRow || document)?.click();
  if (
    !(await waitForCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-phone-notice')].some(notice =>
        notice.textContent?.includes('和相关关系吗'),
      ),
    ))
  ) {
    throw new Error('Relationship character cascade delete confirmation is missing');
  }
  clickNoticeAction('删除');
  if (!(await waitForCondition(() => relationship.characters.length === 1 && relationship.links.length === 0))) {
    throw new Error('Relationship character deletion did not cascade to its directed links');
  }
  await waitForPaint();
  return true;
}
