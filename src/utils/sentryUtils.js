import { Sentry } from 'react-native-sentry'

export const logSentry = (e) => {
  Sentry.captureException(e, { logger: 'App._setNodes' })
}
