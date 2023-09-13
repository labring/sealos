const TestSequencer = require('@jest/test-sequencer').default;
const path = require('path');

class CustomSequencer extends TestSequencer {
  sort(tests) {
    const target_test_path = path.join(__dirname, 'target.test.ts');

    const target_test_index = tests.findIndex(t => t.path === target_test_path);

    if (target_test_index == -1) {
      return tests;
    }

    const target_test = tests[target_test_index];

    const ordered_tests = tests.slice();

    ordered_tests.splice(target_test_index, 1);
    ordered_tests.push(target_test); // adds to the tail
    // ordered_tests.unshift(target_test); // adds to the head

    return ordered_tests;
  }
}

module.exports = CustomSequencer;