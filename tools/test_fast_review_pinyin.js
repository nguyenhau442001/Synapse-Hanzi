#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const fastReviewCode = fs.readFileSync(path.join(__dirname, '../assets/js/fast-review.js'), 'utf8');

// Provide mock environment to execute fast-review.js in vm context
const sandbox = {
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute: () => {}, addEventListener: () => {} }),
    body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }
  },
  window: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  LEVELS: {},
  WORDS: [],
  console
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(fastReviewCode, sandbox);

const pinyinLooseMatch = sandbox.pinyinLooseMatch;
const stripTonePinyin = sandbox.stripTonePinyin;

if (typeof pinyinLooseMatch !== 'function') {
  console.error('Error: pinyinLooseMatch is not defined');
  process.exit(1);
}

const testCases = [
  // User reported case:
  { input: 'raner', target: "rán'ér", expected: true, label: "Accept 'raner' for 'rán'ér' (no apostrophe)" },
  { input: 'raner', target: 'rán’ér', expected: true, label: "Accept 'raner' for 'rán’ér' (curly apostrophe)" },
  { input: 'ran er', target: "rán'ér", expected: true, label: "Accept 'ran er' with space for 'rán'ér'" },
  { input: "ran'er", target: "rán'ér", expected: true, label: "Accept 'ran'er' for 'rán'ér'" },
  { input: "rán'ér", target: "rán'ér", expected: true, label: "Accept full tone 'rán'ér' for 'rán'ér'" },
  { input: 'ran2er2', target: "rán'ér", expected: true, label: "Accept tone digits 'ran2er2' for 'rán'ér'" },
  { input: 'ranẻ', target: "rán'ér", expected: true, label: "Accept Telex artifact 'ranẻ' for 'rán'ér'" },

  // Compound phrases & multi-syllable spacing:
  { input: 'dadianhua', target: 'dǎ diànhuà', expected: true, label: "Continuous typing for 'dǎ diànhuà'" },
  { input: 'da dian hua', target: 'dǎ diànhuà', expected: true, label: "Spaced typing for 'dǎ diànhuà'" },
  { input: 'honglvdeng', target: 'hóng-lǜdēng', expected: true, label: "Continuous typing for 'hóng-lǜdēng'" },
  { input: 'hong lv deng', target: 'hóng-lǜdēng', expected: true, label: "Spaced typing for 'hóng-lǜdēng'" },

  // Umlaut handling:
  { input: 'nver', target: "nǚ'ér", expected: true, label: "Accept 'nver' for 'nǚ'ér'" },
  { input: 'nuer', target: "nǚ'ér", expected: true, label: "Accept 'nuer' (u for ü) for 'nǚ'ér'" },
  { input: 'lv', target: 'lǜ', expected: true, label: "Accept 'lv' for 'lǜ'" },
  { input: 'lu', target: 'lǜ', expected: true, label: "Accept 'lu' for 'lǜ'" },

  // Alternatives / slash readings:
  { input: 'shei', target: 'shéi/shuí', expected: true, label: "Accept 'shei' for 'shéi/shuí'" },
  { input: 'shui', target: 'shéi/shuí', expected: true, label: "Accept 'shui' for 'shéi/shuí'" },

  // Negative tests:
  { input: 'ran', target: "rán'ér", expected: false, label: "Reject incomplete 'ran' for 'rán'ér'" },
  { input: 'ranhou', target: "rán'ér", expected: false, label: "Reject 'ranhou' for 'rán'ér'" },
  { input: 'dadian', target: 'dǎ diànhuà', expected: false, label: "Reject incomplete 'dadian' for 'dǎ diànhuà'" },
  { input: '', target: "rán'ér", expected: false, label: "Reject empty string" },
  { input: 'dan', target: "dá'àn", expected: false, label: "Reject 'dan' for 'dá'àn'" }
];

let failed = 0;
for (const tc of testCases) {
  const result = pinyinLooseMatch(tc.input, tc.target);
  if (result !== tc.expected) {
    console.error(`❌ FAILED: ${tc.label} (input="${tc.input}", target="${tc.target}", expected=${tc.expected}, got=${result})`);
    failed++;
  } else {
    console.log(`✅ PASSED: ${tc.label}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${testCases.length} tests passed successfully!`);
}
