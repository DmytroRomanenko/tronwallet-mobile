import getContactsStore from '../store/contacts'
import getAccountsStore from '../store/secrets'

export const getContactsFromStore = async () => {
  const store = await getContactsStore()

  return store
    .objects('Contact')
    .sorted('name')
    .map(item => Object.assign({}, item))
}

export const getAccountsFromStore = async (pin) => {
  const store = await getAccountsStore(pin)

  return store
    .objects('UserSecret')
    .map(item => Object.assign({}, item))
}

export const getAddressesFromStore = async () => {
  const contacts = await getContactsFromStore()
  return contacts.map(contact => contact.address)
}

export const getAliasFromStore = async (pin) => {
  const contacts = await getContactsFromStore()
  const accounts = await getAccountsFromStore(pin)

  return accounts.concat(contacts).map(item => item.alias)
}

export const resetContactsData = async () => {
  const contacts = await getContactsStore()
  const contactsList = contacts.objects('Contact')
  contacts.write(() => contacts.delete(contactsList))
}

export const formatAlias = (name) => `@${name.trim().toLowerCase().replace(/ /g, '_')}`
