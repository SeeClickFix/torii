/* eslint-disable ember/no-get */
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { configure } from 'torii/configuration';
import BaseProvider from 'torii/providers/base';

module('Unit | Provider | Base', function (hooks) {
  setupTest(hooks);

  const Provider = BaseProvider.extend({ name: 'mock-base' });

  function buildProvider(owner) {
    owner.register('torii-provider:mock-base', Provider);
    return owner.lookup('torii-provider:mock-base');
  }

  test('uses the popup service by default', function (assert) {
    configure({ providers: { 'mock-base': {} } });

    const provider = buildProvider(this.owner);

    assert.strictEqual(
      provider.get('popup'),
      this.owner.lookup('torii-service:popup')
    );
  });

  test('honors an app-wide remoteServiceName', function (assert) {
    configure({ remoteServiceName: 'iframe', providers: { 'mock-base': {} } });

    const provider = buildProvider(this.owner);

    assert.strictEqual(
      provider.get('popup'),
      this.owner.lookup('torii-service:iframe')
    );
  });

  test('a provider remoteServiceName wins over the app-wide one', function (assert) {
    configure({
      remoteServiceName: 'iframe',
      providers: { 'mock-base': { remoteServiceName: 'popup' } },
    });

    const provider = buildProvider(this.owner);

    assert.strictEqual(
      provider.get('popup'),
      this.owner.lookup('torii-service:popup')
    );
  });
});
