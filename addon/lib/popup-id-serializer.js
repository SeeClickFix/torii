var PopupIdSerializer = {
  serialize(popupId) {
    return 'torii-popup:' + popupId;
  },

  deserialize(serializedPopupId) {
    if (!serializedPopupId) {
      return null;
    }

    var match = serializedPopupId.match(/^(torii-popup:)(.*)/);
    return match ? match[2] : null;
  },
};

export default PopupIdSerializer;
