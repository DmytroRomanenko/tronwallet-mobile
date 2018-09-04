import Client from '../services/client'
import getAssetsStore from '../store/assets'
import { FEATURED_TOKENS } from './constants'

export const updateAssets = async (start = 0, limit = 100, name = '') => {
  const assets = await Client.getTokenList(start, limit, name)
  const store = await getAssetsStore()

  store.write(() => assets.map(asset => store.create('Asset', asset, true)))

  return assets
}

export const orderAssets = (assets) => {
  let orderedVerified = []
  let rest = []
  const verifyAsset = (index, asset) => {
    asset.verified = true
    orderedVerified[index] = asset
  }
  assets.forEach((asset) => {
    if (asset.name === 'TRX') {
      verifyAsset(0, asset)
    } else {
      const featuredIndex = FEATURED_TOKENS.findIndex(token => token === asset.name)
      featuredIndex !== -1
        ? verifyAsset(featuredIndex + 1, asset)
        : rest.push(asset)
    }
  })

  return [
    ...orderedVerified.filter((asset) => asset),
    ...rest
  ]
}
