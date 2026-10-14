/* eslint-disable ember/no-mixins */
import { module, test } from 'qunit';
import PopupService from 'torii/services/popup';
import IframeService from 'torii/services/iframe';
import { CURRENT_REQUEST_KEY } from 'torii/mixins/ui-service-mixin';

// These tests open real windows, so the browser itself sets the origin and
// source of every message. Chrome must run with --disable-popup-blocking
// (see testem.js).
module('Integration | popup handoff', function (hooks) {
  const origin = window.location.origin;
  const redirectUrl = `${origin}/torii/redirect.html?code=abc`;
  let service;
  let cleanup;

  hooks.beforeEach(function () {
    cleanup = [];
    localStorage.removeItem(CURRENT_REQUEST_KEY);

    // The popup service never closes popups itself, so close any still
    // loading to keep them from posting into the next test.
    const originalOpen = window.open;
    const opened = [];
    window.open = function () {
      const popup = originalOpen.apply(window, arguments);
      opened.push(popup);
      return popup;
    };
    cleanup.push(() => {
      window.open = originalOpen;
      opened.forEach((popup) => popup && popup.close());
    });
  });

  hooks.afterEach(function () {
    cleanup.forEach((fn) => fn());
    if (service) {
      service.close();
      service.destroy();
      service = null;
    }
    localStorage.removeItem(CURRENT_REQUEST_KEY);
  });

  function appendFrame(attrs) {
    const frame = document.createElement('iframe');
    Object.assign(frame, attrs);
    document.body.appendChild(frame);
    cleanup.push(() => frame.remove());
    return frame;
  }

  // A same-origin window that is not the popup, able to post messages with
  // itself as the source.
  async function buildForger() {
    const frame = appendFrame({
      srcdoc: `<script>
        window.forge = function (key, url) {
          var msg = {};
          msg[key] = url;
          parent.postMessage(JSON.stringify(msg), '*');
        };
      </script>`,
    });
    await new Promise((resolve) => frame.addEventListener('load', resolve));
    return frame.contentWindow;
  }

  test('popup: resolves through the localStorage handoff', async function (assert) {
    service = PopupService.create();

    const result = await service.open(redirectUrl, ['code']);

    assert.strictEqual(result.code, 'abc');
  });

  test('popup: resolves through the postMessage handoff', async function (assert) {
    service = PopupService.create();

    const promise = service.open(redirectUrl, ['code']);
    // The popup has not loaded yet. Without the key in localStorage,
    // redirect.html has to ask this window for it over postMessage.
    localStorage.removeItem(CURRENT_REQUEST_KEY);

    const result = await promise;
    assert.strictEqual(result.code, 'abc');
  });

  test('popup: ignores a forged result from another same-origin window', async function (assert) {
    const forger = await buildForger();
    service = PopupService.create();

    const promise = service.open(redirectUrl, ['code']);
    // The attacker knows the key; it is also the popup's window.name.
    const key = localStorage.getItem(CURRENT_REQUEST_KEY);
    forger.forge(key, `${origin}/torii/redirect.html?code=evil`);

    const result = await promise;
    assert.strictEqual(result.code, 'abc', 'uses the real popup result');
  });

  test('iframe: resolves through the postMessage handoff', async function (assert) {
    const placeholder = document.createElement('div');
    placeholder.className = 'torii-iframe-placeholder';
    document.body.appendChild(placeholder);
    cleanup.push(() => placeholder.remove());
    service = IframeService.create();

    const result = await service.open(
      `${origin}/torii-test/post-to-parent.html?code=xyz`,
      ['code']
    );

    assert.strictEqual(result.code, 'xyz');
  });
});
