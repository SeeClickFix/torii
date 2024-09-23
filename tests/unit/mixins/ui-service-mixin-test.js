/* eslint-disable ember/no-mixins, ember/no-new-mixins, ember/no-classic-classes */

import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import UiServiceMixin, {
  CURRENT_REQUEST_KEY,
} from 'torii/mixins/ui-service-mixin';
import PopupIdSerializer from 'torii/lib/popup-id-serializer';
import { module, test } from 'qunit';

module('Unit | Mixin | ui-service-mixin', function (hooks) {
  const originalWindowOpen = window.open;

  const popupId = '09123-asdf';
  const expectedUrl = 'http://authServer';
  const expectedRedirectUrl = 'http://localserver?code=fr';
  const expectedMessage = 'getPendingRequestKey';

  const mockWindowListener = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      // allow
    }
    if (msg && Object.keys(msg)[0] === 'pendingRequestKey') {
      const obj = {};
      const key = PopupIdSerializer.serialize(encodeURIComponent(popupId));
      obj[key] = `${expectedUrl}?redirect_url=${expectedRedirectUrl}`;
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify(obj),
          source: window,
        })
      );
    }
  };

  const buildMockWindow = function (windowName) {
    windowName = windowName || '';
    window.addEventListener('message', mockWindowListener);
    return {
      name: windowName,
      focus() {},
      close() {},
      open() {
        this.postMessage(expectedMessage);
      },
      postMessage(msg) {
        window.dispatchEvent(
          new MessageEvent('message', { data: msg, source: window })
        );
      },
    };
  };

  const buildPopupIdGenerator = function (popupId) {
    return {
      generate() {
        return popupId;
      },
    };
  };

  let Popup = EmberObject.extend(Evented, UiServiceMixin, {
    // Open a popup window.
    openRemote(_url, pendingRequestKey) {
      this.remote = buildMockWindow(pendingRequestKey);
      this.remote.open();
    },

    closeRemote() {
      this.remote.closed = true;
    },

    pollRemote() {
      if (!this.remote) {
        return;
      }
    },
  });

  let popup;

  hooks.beforeEach(function () {
    popup = Popup.create({ remoteIdGenerator: buildPopupIdGenerator(popupId) });
    localStorage.removeItem(CURRENT_REQUEST_KEY);
  });

  hooks.afterEach(async function () {
    localStorage.removeItem(CURRENT_REQUEST_KEY);
    window.open = originalWindowOpen;
    window.removeEventListener('message', mockWindowListener);
    popup.destroy();
  });

  test('requests pending request key', function (assert) {
    assert.expect(1);

    let resultMessage;
    const resultMessageListener = (event) => {
      resultMessage = event.data;
    };
    try {
      window.addEventListener('message', resultMessageListener);

      popup.openRemote(expectedUrl, CURRENT_REQUEST_KEY);

      assert.strictEqual(
        resultMessage,
        expectedMessage,
        'requests pendingRequestKey'
      );
    } finally {
      window.removeEventListener('message', resultMessageListener);
    }
  });

  test('returns data after receiving key', async function (assert) {
    const keys = ['redirect_url'];
    const result = await popup.open(expectedUrl, keys);

    assert.strictEqual(
      result.redirect_url,
      expectedRedirectUrl,
      'returns data successfully'
    );
  });
});
