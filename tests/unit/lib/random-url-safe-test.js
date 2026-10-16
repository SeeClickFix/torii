import randomUrlSafe from 'torii/lib/random-url-safe';
import { module, test } from 'qunit';

module('Unit | Lib | randomUrlSafe', function (/*hooks*/) {
  test('returns url-safe characters of the requested length', function (assert) {
    assert.ok(/^[A-Za-z0-9]{16}$/.test(randomUrlSafe(16)));
    assert.ok(/^[A-Za-z0-9]{100}$/.test(randomUrlSafe(100)));
  });

  test('does not use Math.random', function (assert) {
    assert.expect(1);
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    try {
      assert.notEqual(randomUrlSafe(16), randomUrlSafe(16));
    } finally {
      Math.random = originalRandom;
    }
  });
});
