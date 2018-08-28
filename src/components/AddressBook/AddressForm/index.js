import React, { Component } from 'react'
import { Keyboard, TouchableWithoutFeedback, Clipboard, Modal } from 'react-native'
import PropTypes from 'prop-types'

import { FormGroup, CancelWrapper, ErrorText } from './elements'
import IconButton from '../../../components/IconButton'
import { VerticalSpacer, HorizontalSpacer, Container, Content } from '../../../components/Utils'
import Input from '../../../components/Input'
import ButtonGradient from '../../../components/ButtonGradient'
import CancelButton from '../../../components/CancelButton'
import QRScanner from '../../../components/QRScanner'

import { isAddressValid } from '../../../services/address'
import { ADD, EDIT } from '../../../utils/constants'
import { isNameValid, isAddressUnique, isAliasUnique } from '../../../utils/validations'
import getContactStore from '../../../store/contacts'
import { getUserSecrets } from '../../../utils/secretsUtils'
import { withContext } from '../../../store/context'
import getSecretsStore from '../../../store/secrets'
import tl from '../../../utils/i18n'
import { logSentry } from '../../../utils/sentryUtils'

class ContactsForm extends Component {
  static propTypes = {
    name: PropTypes.string,
    address: PropTypes.string,
    navigation: PropTypes.object.isRequired,
    isUserAccount: PropTypes.bool
  }

  static defaultProps = {
    isUserAccount: false
  }

  state = {
    name: this.props.name || '',
    address: this.props.address || '',
    initialAddress: this.props.address,
    nameError: null,
    addressError: null,
    generalError: null,
    qrModalVisible: false
  }

  _nextInput = input => {
    if (input === 'address') {
      this.address.focus()
      return
    }

    if (input === 'submit') {
      Keyboard.dismiss()
    }
  }

  _generalError = (generalError) => {
    this.setState({
      generalError
    })
  }

  _onSubmit = async data => {
    const isUnique = await isAliasUnique(data.alias, this.props.context.pin)
    if (isUnique) {
      const reloadData = this.props.navigation.getParam('reloadData')
      if (this.props.navigation.getParam('isUserAccount', false)) {
        const accounts = await getUserSecrets(this.props.context.pin)
        const store = await getSecretsStore(this.props.context.pin)
        const account = accounts.find(item => item.address === data.address)
        account.name = data.name
        account.alias = data.alias
        try {
          await store.write(() => { store.create('UserSecret', account, true) })
          this.props.navigation.goBack()
        } catch (e) {
          this.setState({
            generalError: tl.t('addressBook.form.generalError')
          })
          logSentry(e)
        }
      } else {
        const store = await getContactStore()
        try {
          await store.write(() => { store.create('Contact', data, true) })
          this.props.navigation.goBack()
        } catch (e) {
          this.setState({
            generalError: tl.t('addressBook.form.generalError')
          })
          logSentry(e)
        }
      }
      if (reloadData) reloadData()
    }
  }

  _changeName = (name) => {
    this._changeState({
      item: name,
      type: 'name',
      validation: isNameValid,
      error: tl.t('addressBook.form.nameError')
    })
  }

  _changeAddress = (address) => {
    this._changeState({
      item: address.trim(),
      type: 'address',
      validation: isAddressValid,
      error: tl.t('addressBook.form.addressError')
    })
  }

  _changeState = async (validationObj) => {
    const stateObj = await this._validateState(validationObj)
    this.setState({...stateObj})
  }

  _validateState = async ({item, type, validation, error}) => {
    const stateObj = {
      [type]: item,
      [`${type}Error`]: null
    }

    if (!item.length) return stateObj

    if (this.props.type === ADD && type === 'address') {
      const addressIsUnique = await isAddressUnique(item)

      if (!addressIsUnique) {
        return {
          ...stateObj,
          [`${type}Error`]: tl.t('addressBook.form.uniqueAddressError')
        }
      }
    }

    if (type === 'name') {
      const aliasIsUnique = await isAliasUnique(this._formatAlias(item), this.props.context.pin)

      if (!aliasIsUnique) {
        return {
          ...stateObj,
          [`${type}Error`]: tl.t('addressBook.form.uniqueAliasError')
        }
      }
    }

    if (!validation(item)) {
      return {
        ...stateObj,
        [`${type}Error`]: error
      }
    }

    return stateObj
  }

  _formatAlias = (name) => `@${name.trim().toLowerCase().replace(/ /g, '_')}`

  _submitDisabled = () => {
    const { name, address, generalError, nameError, addressError } = this.state

    if (
      !name.length ||
      !address.length ||
      !!generalError ||
      !!nameError ||
      !!addressError
    ) {
      return true
    }

    return false
  }

  _onPaste = async () => {
    const address = await Clipboard.getString()
    if (address) {
      this._changeAddress(address)
      this._nextInput('submit')
    }
  }

  _openModal = () => this.setState({ qrModalVisible: true })

  _closeModal = () => this.setState({ qrModalVisible: false })

  _readPublicKey = e => {
    this.address.focus()
    this.setState({ address: e.data }, () => {
      this._closeModal()
    })
  }

  _rightContentTo = () => (
    this.props.type === ADD && <React.Fragment>
      <IconButton onPress={this._onPaste} icon='md-clipboard' />
      <HorizontalSpacer />
      <IconButton onPress={this._openModal} icon='ios-qr-scanner' />
    </React.Fragment>
  )

  render () {
    const { name, address, nameError, generalError, addressError, qrModalVisible } = this.state
    const { type } = this.props

    return (
      <Container>
        <Content>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FormGroup>
              <Input
                innerRef={(input) => { this.name = input }}
                label={tl.t('addressBook.form.name')}
                value={name}
                onChangeText={name => this._changeName(name)}
                onSubmitEditing={() => this._nextInput('address')}
              />
              {nameError && (
                <React.Fragment>
                  <ErrorText>
                    {nameError}
                  </ErrorText>
                </React.Fragment>
              )}
              <Input
                innerRef={(input) => { this.address = input }}
                label={tl.t('addressBook.form.address')}
                value={address}
                rightContent={this._rightContentTo}
                onChangeText={address => this._changeAddress(address)}
                onSubmitEditing={() => this._nextInput('submit')}
                style={{fontSize: 14}}
                editable={type !== EDIT}
              />
              {addressError && (
                <React.Fragment>
                  <ErrorText>
                    {addressError}
                  </ErrorText>
                </React.Fragment>
              )}
              <VerticalSpacer size='medium' />
              {generalError && (
                <React.Fragment>
                  <ErrorText>
                    {generalError}
                  </ErrorText>
                </React.Fragment>
              )}
              <ButtonGradient
                text={tl.t(`addressBook.shared.${type.toLowerCase()}`)}
                onPress={() => this._onSubmit({
                  name: name.trim(),
                  alias: this._formatAlias(name),
                  address
                })}
                disabled={this._submitDisabled()}
              />
              <CancelWrapper>
                <CancelButton navigation={this.props.navigation} />
              </CancelWrapper>
            </FormGroup>
          </TouchableWithoutFeedback>
        </Content>
        <Modal
          visible={qrModalVisible}
          onRequestClose={this._closeModal}
          animationType='slide'
        >
          <QRScanner
            reactivateTimeout={1500}
            onRead={this._readPublicKey}
            onClose={this._closeModal}
            checkAndroid6Permissions
          />
        </Modal>
      </Container>
    )
  }
}

export default withContext(ContactsForm)
