import { module, test } from 'qunit';
import { configure } from 'torii/configuration';
import GoogleOauth2BearerV2 from 'torii/providers/google-oauth2-bearer-v2';

module('Unit | Provider | GoogleOAuth2BearerV2Provider', function (hooks) {
  const clientId = 'client-id';
  const originalXHR = window.XMLHttpRequest;
  let tokenInfo;

  // Answers the token validation request with `tokenInfo`.
  class FakeXHR {
    overrideMimeType() {}
    open(method, url) {
      this.url = url;
    }
    send() {
      setTimeout(() => {
        this.status = tokenInfo.status;
        this.statusText = tokenInfo.statusText || '';
        this.responseText = tokenInfo.body;
        this.onload();
      });
    }
  }

  // Answers with the state from the URL it was asked to open, unless the
  // test overrides it.
  function buildPopup(response = {}) {
    return {
      async open(url) {
        const state = new URL(url).searchParams.get('state');
        return Object.assign(
          {
            access_token: 'tok',
            token_type: 'Bearer',
            expires_in: '3600',
            state,
          },
          response
        );
      },
    };
  }

  function buildProvider(response) {
    return GoogleOauth2BearerV2.extend({
      popup: buildPopup(response),
    }).create();
  }

  hooks.beforeEach(function () {
    configure({
      providers: {
        'google-oauth2-bearer-v2': {
          apiKey: clientId,
          scope: 'email',
          redirectUri: 'http://foo',
        },
      },
    });
    tokenInfo = { status: 200, body: JSON.stringify({ audience: clientId }) };
    window.XMLHttpRequest = FakeXHR;
  });

  hooks.afterEach(function () {
    window.XMLHttpRequest = originalXHR;
  });

  test('resolves when the state and audience match', async function (assert) {
    const result = await buildProvider().open();

    assert.strictEqual(result.access_token, 'tok');
    assert.strictEqual(result.provider, 'google-oauth2-bearer-v2');
    assert.false('state' in result, 'does not add state to the result');
  });

  test('rejects a mismatched state', async function (assert) {
    await assert.rejects(
      buildProvider({ state: 'forged' }).open(),
      /incorrect session state param/
    );
  });

  test('rejects when the token validation request fails', async function (assert) {
    tokenInfo = { status: 400, body: '{"error":"invalid_token"}' };

    await assert.rejects(
      buildProvider().open(),
      /Token validation request failed with status '400'/
    );
  });

  test('rejects when token validation returns invalid JSON', async function (assert) {
    tokenInfo = { status: 200, body: '<html>oops</html>' };

    await assert.rejects(buildProvider().open(), /returned invalid JSON/);
  });

  test('rejects when token validation returns null', async function (assert) {
    tokenInfo = { status: 200, body: 'null' };

    await assert.rejects(buildProvider().open(), /'audience' field/);
  });

  test('rejects a token issued to another client', async function (assert) {
    tokenInfo = {
      status: 200,
      body: JSON.stringify({ audience: 'other-client' }),
    };

    await assert.rejects(buildProvider().open(), /confused deputy/);
  });

  test('rejects a missing state', async function (assert) {
    await assert.rejects(
      buildProvider({ state: undefined }).open(),
      /incorrect session state param/
    );
  });
});
