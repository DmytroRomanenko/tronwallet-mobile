import { AsyncStorage } from 'react-native'
import I18n, { getLanguages } from 'react-native-i18n'
import moment from 'moment'

import { USER_PREFERRED_LANGUAGE } from './constants'
import translations, { getRelativeTime } from './translations'

getLanguages().then(deviceLanguages => {
  AsyncStorage.getItem(USER_PREFERRED_LANGUAGE).then(preferredLanguage => {
    const userLocale = preferredLanguage || deviceLanguages[0]
    const locale = userLocale.substr(0, 2)

    if (locale !== 'en') {
      const relativeTime = getRelativeTime(locale)
      moment.locale(locale, { relativeTime })
    }
    I18n.locale = userLocale
  })
})

I18n.missingTranslation = (obj) => `Missing this translation ${obj}`
I18n.defaultLocale = 'en-US'
I18n.fallbacks = true
I18n.translations = translations

export default I18n
