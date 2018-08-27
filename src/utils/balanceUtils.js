import Config from 'react-native-config'
import axios from 'axios'
import { logSentry } from '../utils/sentryUtils'

export const orderBalances = (balances) => {
  let orderedBalances = []
  balances.forEach((balance) => {
    if (balance.name === 'TRX') {
      orderedBalances[0] = balance
    } else if (balance.name === 'TWX') {
      orderedBalances[1] = balance
    }
  })
  return [
    ...orderedBalances.filter((balance) => !!balance),
    ...balances.filter((balance) => balance.name !== 'TRX' && balance.name !== 'TWX')
  ]
}

// DEPRECATED - DO NOT USE IT, IT'S ON CONTEXT NOW
export const getPrice = async (currency = 'USD') => {
  try {
    // console.warn("DEPRECATED - DO NOT USE IT, IT'S ON CONTEXT NOW")
    const { data: { data } } = await axios.get(`${Config.TRX_PRICE_API}/?convert=${currency}`)
    return data.quotes[currency].price
  } catch (err) {
    logSentry(err)
  }
}
