import UUIDGenerator from 'torii/lib/uuid-generator';
import { module, test } from 'qunit';

module('Unit | Lib | UUIDGenerator', function (/*hooks*/) {
  test('exists', function (assert) {
    assert.ok(UUIDGenerator);
  });

  test('.generate returns a new uuid each time', function (assert) {
    const first = UUIDGenerator.generate();
    const second = UUIDGenerator.generate();

    assert.notEqual(first, second);
  });

  test('.generate returns a version 4 uuid', function (assert) {
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        UUIDGenerator.generate()
      )
    );
  });

  test('.generate does not use Math.random', function (assert) {
    assert.expect(1);
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    try {
      assert.notEqual(UUIDGenerator.generate(), UUIDGenerator.generate());
    } finally {
      Math.random = originalRandom;
    }
  });
});
