import { run } from '@ember/runloop';
import { setOwner } from '@ember/application';

import Application from '../../app';
import config from '../../config/environment';

export default function startApp(attrs) {
  let attributes = Object.assign({}, config.APP);
  attributes.autoboot = true;
  attributes = Object.assign({}, attributes, attrs); // use defaults, but you can override;

  return run(() => {
    let application = Application.create(attributes);
    application.setupForTesting();
    application.injectTestHelpers();
    application.register(
      '-environment:main',
      {
        isInteractive: true,
        hasDOM: true,
      },
      { instantiate: false }
    );
    setOwner(application, application.__container__.owner);

    return application;
  });
}
