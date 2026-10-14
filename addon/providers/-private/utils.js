let alternativeLoadScript = false;

export function overrideLoadScript(state) {
  alternativeLoadScript = state;
}

export function resetLoadScript() {
  alternativeLoadScript = false;
}

// The response params to read from the redirect, plus `state` so it can be
// verified.
export function withState(responseParams) {
  return responseParams.indexOf('state') === -1
    ? responseParams.concat('state')
    : responseParams;
}

// A copy of `obj` with only the given keys.
export function pick(obj, keys) {
  let result = {};
  keys.forEach(function (key) {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function loadScript(src) {
  if (alternativeLoadScript) {
    return alternativeLoadScript(src);
  }
  let scriptTag = document.createElement('script');
  let firstScriptTag = document.getElementsByTagName('script')[0];
  scriptTag.src = src;
  firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
}
