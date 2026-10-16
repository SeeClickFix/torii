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
  const origin = window.location.origin;

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
          origin,
          source: window,
        })
      );
    }
  };

  // MessageEvent requires a real Window as its source, so the mock popup
  // stands in for the window that posts messages with `windowProxy`.
  const buildMockWindow = function (windowName, { respond = true } = {}) {
    windowName = windowName || '';
    if (respond) {
      window.addEventListener('message', mockWindowListener);
    }
    return {
      name: windowName,
      windowProxy: window,
      focus() {},
      close() {},
      open() {
        if (respond) {
          this.postMessage(expectedMessage);
        }
      },
      postMessage(msg) {
        window.dispatchEvent(
          new MessageEvent('message', { data: msg, origin, source: window })
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

  const postResult = function (data, init = {}) {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        origin,
        source: window,
        ...init,
      })
    );
  };

  const resultFor = function (code) {
    return {
      [PopupIdSerializer.serialize(popupId)]: `${expectedUrl}?code=${code}`,
    };
  };

  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 20));

  let Popup = EmberObject.extend(Evented, UiServiceMixin, {
    respond: true,

    // Open a popup window.
    openRemote(_url, pendingRequestKey) {
      this.remote = buildMockWindow(pendingRequestKey, {
        respond: this.respond,
      });
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

    remoteWindow() {
      return this.remote && this.remote.windowProxy;
    },
  });

  let popup;
  let otherFrame;

  hooks.beforeEach(function () {
    popup = Popup.create({ remoteIdGenerator: buildPopupIdGenerator(popupId) });
    localStorage.removeItem(CURRENT_REQUEST_KEY);
  });

  hooks.afterEach(async function () {
    localStorage.removeItem(CURRENT_REQUEST_KEY);
    window.open = originalWindowOpen;
    window.removeEventListener('message', mockWindowListener);
    if (otherFrame) {
      otherFrame.remove();
      otherFrame = null;
    }
    popup.destroy();
  });

  // A same-origin window that is not the popup.
  function buildOtherWindow() {
    otherFrame = document.createElement('iframe');
    document.body.appendChild(otherFrame);
    return otherFrame.contentWindow;
  }

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

  test('accepts the unencoded key that redirect.html posts', async function (assert) {
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);

    postResult({
      [`torii-popup:${popupId}`]: `${expectedUrl}?code=raw`,
    });

    const result = await promise;
    assert.strictEqual(result.code, 'raw');
  });

  test('ignores results from another origin', async function (assert) {
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);

    postResult(resultFor('evil'), { origin: 'https://evil.example' });
    postResult(resultFor('good'));

    const result = await promise;
    assert.strictEqual(result.code, 'good', 'ignores the other origin');
  });

  test('ignores results from a window other than the popup', async function (assert) {
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);

    postResult(resultFor('evil'), { source: buildOtherWindow() });
    postResult(resultFor('good'));

    const result = await promise;
    assert.strictEqual(result.code, 'good', 'ignores the other window');
  });

  test('does not send the pending request key to another origin or window', async function (assert) {
    assert.expect(1);
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);

    const otherWindow = buildOtherWindow();
    const replies = [];
    const recordReply = (event) => {
      if (String(event.data).indexOf('pendingRequestKey') !== -1) {
        replies.push(event.data);
      }
    };
    window.addEventListener('message', recordReply);
    otherWindow.addEventListener('message', recordReply);

    try {
      postResult(expectedMessage, { origin: 'https://evil.example' });
      postResult(expectedMessage, { source: otherWindow });
      await nextTick();

      assert.deepEqual(replies, [], 'no reply was sent');
    } finally {
      window.removeEventListener('message', recordReply);
      otherWindow.removeEventListener('message', recordReply);
    }

    postResult(resultFor('good'));
    await promise;
  });

  test('ignores malformed messages without throwing', async function (assert) {
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);
    const key = PopupIdSerializer.serialize(popupId);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { [key]: `${expectedUrl}?code=object` },
        origin,
        source: window,
      })
    );
    postResult('not json');
    postResult('null');
    postResult('[1]');
    postResult('"a string"');
    postResult({ [key]: `${expectedUrl}?code=multi`, other: 'x' });
    postResult({ [key]: 5 });
    postResult({ '%E0%A4%A': `${expectedUrl}?code=badescape` });
    postResult(resultFor('good'));

    const result = await promise;
    assert.strictEqual(result.code, 'good', 'only the valid message is used');
  });

  test('accepts a result that arrives after the popup was closed', async function (assert) {
    popup.respond = false;
    const promise = popup.open(expectedUrl, ['code']);

    // Polling noticed the popup closed: remote is cleared and the
    // 100ms rejection timer starts, but the result is already in flight.
    popup.close();
    assert.strictEqual(popup.remote, null, 'remote was cleared');
    postResult(resultFor('late'));

    const result = await promise;
    assert.strictEqual(result.code, 'late');
  });
});
