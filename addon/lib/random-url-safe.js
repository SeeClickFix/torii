export default function randomUrlSafe(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  // Bytes at or above the largest multiple of chars.length are skipped so
  // that every character is equally likely.
  var limit = 256 - (256 % chars.length);
  var result = '';

  while (result.length < length) {
    var bytes = crypto.getRandomValues(new Uint8Array(length));
    for (var i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i] < limit) {
        result += chars.charAt(bytes[i] % chars.length);
      }
    }
  }

  return result;
}
