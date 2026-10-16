/* eslint-disable ember/no-get */
import Provider from 'torii/providers/oauth2-code';
import { configurable } from 'torii/configuration';
import { withState, pick } from './-private/utils';

var Oauth2Bearer = Provider.extend({
  responseType: 'token',

  /**
   * Whether to check that the provider's response carries the `state` that
   * was sent with the request. Turn off only for providers that do not
   * return `state`.
   *
   * @property {boolean} verifyState
   */
  verifyState: configurable('verifyState', true),

  /**
   * @method open
   * @return {Promise<object>} If the authorization attempt is a success,
   * the promise will resolve an object containing the following keys:
   *   - authorizationToken: The `token` from the 3rd-party provider
   *   - provider: The name of the provider (i.e., google-oauth2)
   *   - redirectUri: The redirect uri (some server-side exchange flows require this)
   * If there was an error or the user either canceled the authorization or
   * closed the popup window, the promise rejects.
   */
  open(options) {
    this.refreshState();
    var provider = this,
      name = this.get('name'),
      url = this.buildUrl(),
      redirectUri = this.get('redirectUri'),
      responseParams = this.get('responseParams'),
      state = this.get('state'),
      verifyState = this.get('verifyState');

    return this.get('popup')
      .open(
        url,
        verifyState ? withState(responseParams) : responseParams,
        options
      )
      .then(function (authData) {
        var missingResponseParams = [];

        responseParams.forEach(function (param) {
          if (authData[param] === undefined) {
            missingResponseParams.push(param);
          }
        });

        if (missingResponseParams.length) {
          throw new Error(
            'The response from the provider is missing ' +
              'these required response params: ' +
              missingResponseParams.join(', ')
          );
        }

        if (verifyState) {
          provider.assertState(authData, state);
        }

        return {
          authorizationToken: pick(authData, responseParams),
          provider: name,
          redirectUri: redirectUri,
        };
      });
  },
});

export default Oauth2Bearer;
