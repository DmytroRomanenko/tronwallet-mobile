import Client from '../services/client'
import getAssetsStore from '../store/assets'
import { FEATURED_TOKENS, VERIFIED_TOKENS } from './constants'

export const updateAssets = async (start = 0, limit = 100, name = '') => {
  const assets = await Client.getTokenList(start, limit, name)
  const store = await getAssetsStore()

  store.write(() => assets.map(asset => store.create('Asset', asset, true)))

  return assets
}

export const getCustomName = (name) => {
  switch (name) {
    case 'LoveHearts':
      return 'LoveHearts \u2665'
    default:
      return name
  }
}

export const orderAssets = (assets) => {
  let orderedVerified = []
  let rest = []
  const verifyAsset = (asset, featured = false) => {
    asset.verified = true
    asset.featured = featured
    orderedVerified.push(asset)
  }
  assets.forEach((asset) => {
    if (asset.name === 'TRX') {
      asset.verified = true
      asset.featured = false
      return orderedVerified.unshift(asset)
    }
    const featuredIndex = FEATURED_TOKENS.findIndex(token => token === asset.name)
    const verifiedIndex = VERIFIED_TOKENS.findIndex(token => token === asset.name)
    if (featuredIndex > -1) return verifyAsset(asset, true)
    if (verifiedIndex > -1) return verifyAsset(asset)
    rest.push(asset)
  })
  return [
    ...orderedVerified.filter((asset) => asset),
    ...rest
  ]
}
