const formatInteger = (numberStr) => numberStr.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const CRYPTO_PRECISION = 6
const FIAT_PRECISION = 2
export const MINIMUM = Math.pow(10, -CRYPTO_PRECISION)

// These functions needs to be used only with labels and texts
export const formatNumber = (n, intPrecision = false) => {
  const number = Number(n)
  const numberZero = intPrecision ? '0.00' : '0'

  if (number === 0) return numberZero
  if (Number.isInteger(number)) {
    return `${formatInteger(number)}${intPrecision ? '.00' : ''}`
  } else {
    let decimalPosition = FIAT_PRECISION
    if (number < MINIMUM) return numberZero
    if (number < 1 && number > 0) {
      decimalPosition = number.toFixed(CRYPTO_PRECISION) > 0 ? CRYPTO_PRECISION : FIAT_PRECISION
    }
    return number.toString().split('.').reduce((first, second) =>
      `${formatInteger(first)}.${second.substr(0, decimalPosition)}`)
  }
}

export const formatFloat = (n, precision = 6) => {
  const number = n.toString()
  const decimalPart = number.split('.')
  if (decimalPart.length > 1) {
    return `${formatInteger(decimalPart[0])}.${decimalPart[1].substr(0, precision)}`
  } else {
    return `${formatInteger(number)}.00`
  }
}
