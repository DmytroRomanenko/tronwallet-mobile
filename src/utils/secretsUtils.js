import RNTron from 'react-native-tron'
import { AsyncStorage, Alert } from 'react-native'

import getSecretsStore from '../store/secrets'
import getTransactionStore from '../store/transactions'
import Client from '../services/client'
import { updateTransactions } from '../utils/transactionUtils'
import { formatAlias } from '../utils/contactUtils'
import { USER_STATUS } from '../utils/constants'
import tl from '../utils/i18n'

export const createUserKeyPair = async (pin, oneSignalId, mnemonic = null) => {
  if (!mnemonic) mnemonic = await RNTron.generateMnemonic()
  await generateKeypair(pin, oneSignalId, mnemonic, 0, true)
  AsyncStorage.setItem(USER_STATUS, 'active')
}

export const recoverUserKeypair = async (
  pin,
  oneSignalId,
  mnemonic,
  vaultNumber = 0,
  randomlyGenerated = false
) => {
  await RNTron.validateMnemonic(mnemonic)
  await generateKeypair(pin, oneSignalId, mnemonic, vaultNumber, randomlyGenerated)
  AsyncStorage.setItem(USER_STATUS, 'active')
}

const getTransactionsFromStore = async (address) => {
  const transactionsStore = await getTransactionStore()
  return transactionsStore
    .objects('Transaction')
    .filtered(`ownerAddress = "${address}"`)
}

const isOnBlockchain = async address => {
  let transactions = await getTransactionsFromStore(address)

  if (transactions.length === 0) {
    await updateTransactions(address)
    transactions = await getTransactionsFromStore(address)
  }

  return transactions.length > 0
}

export const createNewAccount = async (pin, oneSignalId, newAccountName) => {
  const accounts = await getUserSecrets(pin)
  if (await isOnBlockchain(accounts[accounts.length - 1].address)) {
    const { mnemonic } = accounts[0]
    const generatedKeypair = await RNTron.generateKeypair(mnemonic, accounts.length, false)
    generatedKeypair.mnemonic = mnemonic
    generatedKeypair.name = newAccountName
    generatedKeypair.alias = formatAlias(newAccountName)
    generatedKeypair.confirmed = true
    generatedKeypair.hide = false
    const secretsStore = await getSecretsStore(pin)
    await secretsStore.write(() => secretsStore.create('UserSecret', generatedKeypair, true))
    Alert.alert(
      tl.t('newAccount.success.title'),
      tl.t('newAccount.success.message')
    )
    Client.registerDeviceForNotifications(`${oneSignalId}@${accounts.length}`, generatedKeypair.address)
    return true
  } else {
    Alert.alert(
      tl.t('newAccount.failure.title'),
      tl.t('newAccount.failure.message')
    )
    return false
  }
}

const generateKeypair = async (pin, oneSignalId, mnemonic, vaultNumber, randomlyGenerated) => {
  const generatedKeypair = await RNTron.generateKeypair(mnemonic, 0, false)
  generatedKeypair.mnemonic = mnemonic
  generatedKeypair.confirmed = !randomlyGenerated
  generatedKeypair.name = 'Main Account'
  generatedKeypair.alias = '@main_account'
  generatedKeypair.hide = false
  await resetSecretData(pin)
  const secretsStore = await getSecretsStore(pin)
  await secretsStore.write(() => secretsStore.create('UserSecret', generatedKeypair, true))
  Client.registerDeviceForNotifications(oneSignalId, generatedKeypair.address)
}

export const restoreFromPrivateKey = async (pin, oneSignalId, address, privateKey) => {
  await resetSecretData(pin)
  const userSecrets = {
    privateKey,
    address,
    publicKey: '',
    confirmed: true,
    mnemonic: '',
    password: '',
    hide: false,
    name: 'Main Account',
    alias: '@main_account'
  }
  const secretsStore = await getSecretsStore(pin)
  await secretsStore.write(() => secretsStore.create('UserSecret', userSecrets, true))
  Client.registerDeviceForNotifications(oneSignalId, address)
  AsyncStorage.setItem(USER_STATUS, 'active')
}

export const confirmSecret = async pin => {
  const secretsStore = await getSecretsStore(pin)
  const allSecrets = secretsStore.objects('UserSecret')
  const mainSecret = allSecrets.length ? allSecrets[0] : allSecrets
  secretsStore.write(() => { mainSecret.confirmed = true })
}

export const getUserSecrets = async pin => {
  const secretsStore = await getSecretsStore(pin)
  const secrets = secretsStore
    .objects('UserSecret')
    .map(item => Object.assign({}, item))
  return secrets
}

export const resetSecretData = async pin => {
  const secretsStore = await getSecretsStore(pin)
  const secretList = secretsStore.objects('UserSecret')
  await secretsStore.write(() => secretsStore.delete(secretList))
}

export const hideSecret = async (pin, address) => {
  const secretsStore = await getSecretsStore(pin)
  const allSecrets = secretsStore.objects('UserSecret')
  const secretToHide = allSecrets.find(secret => secret.address === address)
  secretsStore.write(() => { secretToHide.hide = true })
}

export const unhideSecret = async (pin, addresses = []) => {
  const secretsStore = await getSecretsStore(pin)
  const allSecrets = secretsStore.objects('UserSecret')
  secretsStore.write(() => {
    allSecrets.forEach(secretToRecover => {
      if (addresses.includes(secretToRecover.address)) secretToRecover.hide = false
    })
  })
}
