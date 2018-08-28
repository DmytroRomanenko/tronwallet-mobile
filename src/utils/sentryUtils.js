import { Sentry } from 'react-native-sentry'

export class DataError extends Error {
  constructor (message) {
    super(message)
    this.name = 'DataError'
    this.message = message
  }
}

export const logSentry = (e, module = 'App') => {
  Sentry.captureException(e, { logger: module })
}
