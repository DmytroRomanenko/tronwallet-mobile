import RNTron from 'react-native-tron'
import { AsyncStorage, Alert } from 'react-native'

import getSecretsStore from '../store/secrets'
import getTransactionStore from '../store/transactions'
import Client from '../services/client'
import { updateTransactions } from '../utils/transactionUtils'
import { USER_STATUS } from '../utils/constants'
import tl from '../utils/i18n'

export const createUserKeyPair = async (pin, oneSignalId) => {
  const mnemonic = await RNTron.generateMnemonic()
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

export const createNewAccount = async (pin, oneSignalId) => {
  const accounts = await getUserSecrets(pin)
  if (await isOnBlockchain(accounts[accounts.length - 1].address)) {
    const { mnemonic } = accounts[0]
    const generatedKeypair = await RNTron.generateKeypair(mnemonic, accounts.length, false)
    generatedKeypair.mnemonic = mnemonic
    generatedKeypair.name = `Account ${accounts.length}`
    generatedKeypair.alias = `@account${accounts.length}`
    generatedKeypair.confirmed = true
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
  await resetSecretData(pin)
  const secretsStore = await getSecretsStore(pin)
  await secretsStore.write(() => secretsStore.create('UserSecret', generatedKeypair, true))
  Client.registerDeviceForNotifications(oneSignalId, generatedKeypair.address)
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
