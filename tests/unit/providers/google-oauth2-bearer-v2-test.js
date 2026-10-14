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

  test('rejects a missing state', async function (assert) {
    await assert.rejects(
      buildProvider({ state: undefined }).open(),
      /incorrect session state param/
    );
  });
});
