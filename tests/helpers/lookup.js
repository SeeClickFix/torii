import { getOwner } from '@ember/application';

export default function lookup(app, key) {
  return getOwner(app).lookup(key);
}
