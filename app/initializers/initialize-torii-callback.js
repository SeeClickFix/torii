import config from '../config/environment';
import RedirectHandler from 'torii/redirect-handler';
import { configure } from 'torii/configuration';

export default {
  name: 'torii-callback',
  before: 'torii',
  initialize(application) {
    if (arguments[1]) {
      // Ember < 2.1
      application = arguments[1];
    }

    if (config.torii && config.torii.disableRedirectInitializer) {
      return;
    }

    // The torii initializer has not run yet; the handler needs the
    // configuration to know whether it runs in a popup.
    configure(config.torii || {});
    application.deferReadiness();
    RedirectHandler.handle(window).catch(function () {
      application.advanceReadiness();
    });
  },
};
