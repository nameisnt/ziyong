export const UI_APPEARANCE_CONTRACTS = Object.freeze([
  Object.freeze({
    scenario: 'home',
    targets: Object.freeze([
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color', 'fontFamily', 'fontSize']),
        selector: '.pc-phone-shell',
      }),
      Object.freeze({
        properties: Object.freeze(['gridTemplateColumns']),
        selector: '.pc-home-grid-wrap .pc-grid',
      }),
    ]),
  }),
  Object.freeze({
    scenario: 'home-tasks-dark',
    targets: Object.freeze([
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color', 'fontFamily', 'fontSize']),
        selector: '.pc-phone-shell',
      }),
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color']),
        selector: '.pc-generation-task-center',
      }),
    ]),
  }),
  Object.freeze({
    scenario: 'theme-form-control-isolation',
    targets: Object.freeze([
      Object.freeze({ properties: Object.freeze(['backgroundColor', 'color']), selector: '.pc-field' }),
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color']),
        selector: '.pc-generation-form-page',
      }),
    ]),
  }),
  Object.freeze({
    scenario: 'theater-generate-dark-inputs',
    targets: Object.freeze([
      Object.freeze({ properties: Object.freeze(['backgroundColor', 'color']), selector: '.pc-area' }),
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color']),
        selector: '.pc-generation-form-page',
      }),
    ]),
  }),
  Object.freeze({
    scenario: 'reader-theme-appearance',
    targets: Object.freeze([
      Object.freeze({
        properties: Object.freeze(['backgroundColor', 'color', 'fontFamily', 'fontSize', 'lineHeight']),
        selector: '.pc-reader-content',
      }),
    ]),
  }),
]);

export const APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE = 4;

export function perceptualHashDistance(left, right) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    throw new Error('感知哈希必须是 16 位十六进制字符串');
  }
  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (difference) {
    distance += Number(difference & 1n);
    difference >>= 1n;
  }
  return distance;
}

export function getAppearanceContract(scenario) {
  return UI_APPEARANCE_CONTRACTS.find(contract => contract.scenario === scenario) ?? null;
}

export function getAppearanceContractScenarios() {
  return UI_APPEARANCE_CONTRACTS.map(contract => contract.scenario);
}
