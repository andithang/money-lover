const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['en', 'vi'], // your languages
  directory: 'config/locales',
  objectNotation: true,
  register: global
});

const translate = (p, l, params) => {
  return __({ phrase: p, locale: l }, params);
}

module.exports = {
  translate
}