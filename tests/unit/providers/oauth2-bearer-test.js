/* eslint-disable ember/avoid-leaking-state-in-ember-objects */
import { configure } from 'torii/configuration';
import { module, test } from 'qunit';

import BaseProvider from 'torii/providers/oauth2-bearer';

module(
  'Unit | Provider | MockOauth2Provider (oauth2-bearer subclass)',
  function (hooks) {
    const Provider = BaseProvider.extend({
      name: 'mock-oauth2',
      baseUrl: 'http://example.com',
      redirectUri: 'http://foo',
      responseParams: ['state', 'access_token'],

      popup: {
        async open(_1, _2, assert) /*url, responseParams*/ {
          assert && assert.ok(true, 'calls popup.open');
          return { state: 'state' };
        },
      },
    });

    hooks.beforeEach(function () {
      configure({
        providers: {
          'mock-oauth2': {},
        },
      });
    });

    test('BaseProvider subclass must have baseUrl', function (assert) {
      const Subclass = BaseProvider.extend();
      const provider = Subclass.create();

      assert.throws(function () {
        provider.buildUrl();
      }, /Definition of property baseUrl by a subclass is required./);
    });

    test('Provider generates a URL with required config', function (assert) {
      configure({
        providers: {
          'mock-oauth2': {
            apiKey: 'dummyKey',
          },
        },
      });

      const provider = Provider.create();
      assert.strictEqual(
        provider.buildUrl(),
        'http://example.com?response_type=token&client_id=dummyKey&redirect_uri=http%3A%2F%2Ffoo&state=' +
          provider.get('state'),
        'generates the correct URL'
      );
    });

    test('Provider generates a URL with optional scope', function (assert) {
      configure({
        providers: {
          'mock-oauth2': {
            apiKey: 'dummyKey',
            scope: 'someScope',
          },
        },
      });

      const provider = Provider.create();

      assert.strictEqual(
        provider.buildUrl(),
        'http://example.com?response_type=token&client_id=dummyKey&redirect_uri=http%3A%2F%2Ffoo&state=' +
          provider.get('state') +
          '&scope=someScope',
        'generates the correct URL'
      );
    });

    // Answers with the state from the URL it was asked to open, unless the
    // test overrides it, and records the keys it was asked to read.
    function buildStatePopup(calls, response = {}) {
      return {
        async open(url, keys) {
          const state = new URL(url).searchParams.get('state');
          calls.push({ state, keys });
          return Object.assign({ token: 'tok', state }, response);
        },
      };
    }

    const TokenProvider = BaseProvider.extend({
      name: 'mock-bearer',
      baseUrl: 'http://example.com',
      redirectUri: 'http://foo',
      responseParams: ['token'],
    });

    function configureBearer(settings = {}) {
      configure({
        providers: {
          'mock-bearer': Object.assign({ apiKey: 'dummyKey' }, settings),
        },
      });
    }

    test('Provider#open checks the state it sent by default', async function (assert) {
      configureBearer();
      const calls = [];
      const provider = TokenProvider.extend({
        popup: buildStatePopup(calls),
      }).create();

      const result = await provider.open();

      assert.deepEqual(calls[0].keys, ['token', 'state'], 'reads state');
      assert.deepEqual(
        result.authorizationToken,
        { token: 'tok' },
        'does not add state to the token'
      );
    });

    test('Provider#open rejects a mismatched state', async function (assert) {
      configureBearer();
      const provider = TokenProvider.extend({
        popup: buildStatePopup([], { state: 'forged' }),
      }).create();

      await assert.rejects(provider.open(), /incorrect session state param/);
    });

    test('Provider#open rejects a missing state', async function (assert) {
      configureBearer();
      const provider = TokenProvider.extend({
        popup: buildStatePopup([], { state: undefined }),
      }).create();

      await assert.rejects(provider.open(), /incorrect session state param/);
    });

    test('Provider#open skips the state check when verifyState is false', async function (assert) {
      configureBearer({ verifyState: false });
      const calls = [];
      const provider = TokenProvider.extend({
        popup: buildStatePopup(calls, { state: undefined }),
      }).create();

      const result = await provider.open();

      assert.deepEqual(calls[0].keys, ['token'], 'does not read state');
      assert.deepEqual(result.authorizationToken, { token: 'tok' });
    });

    test('Provider#open keeps state in the token when it is a response param', async function (assert) {
      configureBearer();
      const provider = TokenProvider.extend({
        responseParams: ['token', 'state'],
        popup: buildStatePopup([]),
      }).create();

      const result = await provider.open();

      assert.deepEqual(Object.keys(result.authorizationToken), [
        'token',
        'state',
      ]);
    });

    test('Provider#open assert.throws when any required response params are missing', function (assert) {
      assert.expect(3);

      configure({
        providers: {
          'mock-oauth2': {
            apiKey: 'dummyKey',
            scope: 'someScope',
          },
        },
      });

      const provider = Provider.create();

      return provider
        .open(assert)
        .then(function () {
          assert.ok(false, '#open should not resolve');
        })
        .catch(function (e) {
          assert.ok(true, 'failed');
          const message = e.toString().split('\n')[0];
          assert.strictEqual(
            message,
            'Error: The response from the provider is missing these required response params: access_token'
          );
        });
    });
  }
);
