import React, { Component } from 'react'

import AddressBook from '../../components/AddressBook'
import FloatingButton from '../../components/FloatingButton'

import { getContactsFromStore } from '../../utils/contactUtils'
import tl from '../../utils/i18n'
import { logSentry } from '../../utils/sentryUtils'

export default class Contacts extends Component {
  state = {
    contacts: null,
    refreshing: false
  }

  async componentDidMount () {
    await this._loadContacts()

    this._didFocusSubscription = this.props.navigation.addListener(
      'didFocus',
      async () => {
        await this._loadContacts()
      }
    )
  }

  componentWillUnmount () {
    this._didFocusSubscription.remove()
  }

  _loadContacts = async () => {
    try {
      const contacts = await getContactsFromStore()
      this.setState({
        contacts,
        error: null
      })
    } catch (e) {
      this.setState({
        error: tl.t('addressBook.contacts.loadError')
      })
      logSentry(e)
    }
  }

  _onAddPress = () => {
    const { navigation } = this.props

    navigation.navigate('AddContact')
  }

  render () {
    const { contacts } = this.state
    const { navigation } = this.props

    return (
      <AddressBook
        items={contacts}
        navigation={navigation}
        reloadData={this._loadContacts}
      >
        <FloatingButton text={tl.t('addressBook.contacts.addContact')} onPress={this._onAddPress} />
      </AddressBook>
    )
  }
}
