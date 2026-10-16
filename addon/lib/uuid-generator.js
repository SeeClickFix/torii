function toHex(bytes) {
  return Array.from(bytes, function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

var UUIDGenerator = {
  // Returns a random (version 4) UUID. Uses crypto.getRandomValues rather
  // than crypto.randomUUID, which is only available in secure contexts.
  generate() {
    var bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = toHex(bytes);
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  },
};

export default UUIDGenerator;
