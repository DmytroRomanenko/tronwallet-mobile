const en = require('./en.json')
const pt = require('./pt.json')
const fr = require('./fr.json')
const nl = require('./nl.json')
const es = require('./es.json')
const ch = require('./ch.json')

const translations = {
  en,
  pt,
  fr,
  nl,
  es,
  ch
}

export const getRelativeTime = (locale) =>
  translations[locale] ? translations[locale].relativeTime : translations.en.relativeTime

export default translations
