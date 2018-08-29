import React, { Component } from 'react'

import {
  ActivityIndicator,
  Clipboard,
  Alert,
  Modal,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  AsyncStorage
} from 'react-native'

import { Answers } from 'react-native-fabric'
import Ionicons from 'react-native-vector-icons/Ionicons'
import ActionSheet from 'react-native-actionsheet'

import tl from '../../utils/i18n'
import ButtonGradient from '../../components/ButtonGradient'
import Client from '../../services/client'
import Input from '../../components/Input'
import QRScanner from '../../components/QRScanner'
import IconButton from '../../components/IconButton'
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import KeyboardScreen from '../../components/KeyboardScreen'
import NavigationHeader from '../../components/Navigation/Header'

import { isAddressValid } from '../../services/address'
import { signTransaction } from '../../utils/transactionUtils'
import { formatNumber, MINIMUM } from '../../utils/numberUtils'
import getBalanceStore from '../../store/balance'
import { withContext } from '../../store/context'
import { USER_FILTERED_TOKENS } from '../../utils/constants'
import { logSentry } from '../../utils/sentryUtils'
import { ButtonWrapper } from './elements'

class SendScene extends Component {
  static navigationOptions = () => {
    return { header: null }
  }

  state = {
    from: '',
    to: this.props.navigation.getParam('address', ''),
    amount: '',
    token: 'TRX',
    description: '',
    addressError: null,
    formattedToken: ``,
    balances: [{
      balance: 0,
      token: 'TRX'
    }],
    error: null,
    warning: null,
    loadingSign: false,
    loadingData: true,
    trxBalance: 0.0,
    QRModalVisible: false
  }

  componentDidMount () {
    Answers.logContentView('Page', 'Send')
    this._navListener = this.props.navigation.addListener(
      'didFocus',
      this._loadData
    )
  }

  componentDidUpdate () {
    const { to } = this.state
    const address = this.props.navigation.getParam('address', null)

    if (address && address !== to) {
      this._changeAddress(address)
    }
  }

  componentWillUnmount () {
    this._navListener.remove()
  }

  _orderBalances = balances => {
    let orderedBalances = []
    balances.forEach((balance) => {
      if (balance.name === 'TRX') {
        orderedBalances[0] = balance
      } else if (balance.name === 'TWX') {
        orderedBalances[1] = balance
      }
    })
    return [...orderedBalances, ...balances.filter((balance) => balance.name !== 'TRX' && balance.name !== 'TWX')]
  }

  _getBalancesFromStore = async () => {
    const store = await getBalanceStore()
    // console.log('filter', `account = "${this.props.context.publicKey}"`)
    return store.objects('Balance').filtered(`account = "${this.props.context.publicKey}"`).map(item => Object.assign({}, item))
  }

  _loadData = async () => {
    this.setState({ loading: true })

    const balances = await this._getBalancesFromStore()
    const publicKey = this.props.context.publicKey
    let orderedBalances = []
    let balance = 0

    if (balances.length) {
      balance = balances.find(asset => asset.name === 'TRX').balance
      const userTokens = await AsyncStorage.getItem(USER_FILTERED_TOKENS)
      const filteredBalances = balances.filter(asset => JSON.parse(userTokens).findIndex(name => name === asset.name) === -1)
      orderedBalances = this._orderBalances(filteredBalances)
    }

    this.setState({
      from: publicKey,
      balances: orderedBalances,
      loadingData: false,
      trxBalance: balance,
      formattedToken: this._formatBalance('TRX', balance),
      warning: balance === 0 ? tl.t('send.error.insufficientBalance') : null
    })
  }

  _changeInput = (text, field) => {
    this.setState({
      [field]: text,
      error: null
    })
  }

  _changeAddress = (to) => {
    const trimmedTo = to.trim()
    if (!trimmedTo.length || isAddressValid(trimmedTo)) {
      this.setState({
        to: trimmedTo,
        addressError: null
      })
    } else {
      this.setState({
        to: trimmedTo,
        addressError: tl.t('send.error.incompleteAddress')
      })
    }
  }

  _submit = () => {
    const { amount, to, balances, token, from, description } = this.state
    const balanceSelected = balances.find(b => b.name === token)
    if (!isAddressValid(to) || from === to) {
      this.setState({ error: tl.t('send.error.invalidReceiver') })
      return
    }
    if (!balanceSelected) {
      this.setState({ error: tl.t('send.error.selectBalance') })
      return
    }

    if (description.length > 500) {
      this.setState({ error: 'Description too long' })
      return
    }

    if (!amount || balanceSelected.balance < amount || amount <= 0) {
      this.setState({ error: tl.t('send.error.invalidAmount') })
      return
    }

    this._transferAsset()
  }

  clearInput = () => {
    this.setState({
      to: '',
      token: 'TRX',
      amount: '',
      description: ''
    })
  }

  _transferAsset = async () => {
    const { from, to, amount, token, description } = this.state
    this.setState({ loadingSign: true, error: null })
    try {
      // Serverless
      const data = await Client.getTransferTransaction({
        from,
        to,
        token,
        amount: Number(amount).toFixed(6),
        data: description
      })
      this._openTransactionDetails(data)
      this.clearInput()
    } catch (error) {
      Alert.alert(tl.t('warning'), tl.t('error.default'))
      this.setState({
        loadingSign: false
      })
      logSentry(error)
    }
  }

  _openTransactionDetails = async transactionUnsigned => {
    try {
      const { accounts, publicKey } = this.props.context
      const transactionSigned = await signTransaction(
        accounts.find(item => item.address === publicKey).privateKey,
        transactionUnsigned
      )
      this.setState({ loadingSign: false, error: null }, () => {
        this.props.navigation.navigate('SubmitTransaction', {
          tx: transactionSigned
        })
      })
    } catch (error) {
      Alert.alert(tl.t('warning'), tl.t('error.default'))
      this.setState({ loadingSign: false })
      logSentry(error)
    }
  }

  _setMaxAmount = () => {
    const { balances, token } = this.state
    const balanceSelected = balances.find(b => b.name === token) || balances[0]
    const value = balanceSelected.balance < MINIMUM && balanceSelected.balance > 0
      ? balanceSelected.balance.toFixed(7) : balanceSelected.balance
    this.setState({ amount: value })
  }

  _readPublicKey = e => this.setState({ to: e.data }, () => {
    this._closeModal()
    this._nextInput('to')
  })

  _openModal = () => this.setState({ QRModalVisible: true })

  _onPaste = async () => {
    const content = await Clipboard.getString()
    if (content) {
      this._changeAddress(content)
      this._nextInput('to')
    }
  }

  _closeModal = () => {
    if (this.state.QRModalVisible) {
      this.setState({ QRModalVisible: false })
    }
  }

  _formatBalance = (token, balance) => `${token} (${formatNumber(balance)} ${tl.t('send.available')})`

  _rightContentTo = () => (
    <React.Fragment>
      <IconButton onPress={this._onPaste} icon='md-clipboard' />
      <Utils.HorizontalSpacer />
      <IconButton onPress={this._openModal} icon='ios-qr-scanner' />
    </React.Fragment>
  )

  _rightContentToken = () => (
    <Utils.View paddingX='small'>
      <Ionicons name='ios-arrow-down' color={Colors.primaryText} size={24} />
    </Utils.View>
  )

  _rightContentAmount = () => (
    <ButtonWrapper onPress={this._setMaxAmount}>
      <Utils.Text color={Colors.secondaryText} size='tiny'>MAX</Utils.Text>
    </ButtonWrapper>
  )
  _nextInput = currentInput => {
    if (currentInput === 'token') {
      this.to.focus()
      return
    }

    if (currentInput === 'to') {
      this.amount.focus()
      return
    }

    if (currentInput === 'amount' && this.state.trxBalance !== 0) {
      Keyboard.dismiss()
    }
  }

  _handleTokenChange = (index, formattedToken) => {
    if (index !== 0) {
      this.setState({
        token: this.state.balances[index - 1].name,
        formattedToken
      }, this._nextInput('token'))
    }
  }

  render () {
    const { loadingSign, loadingData, token, error, to, amount, balances, addressError } = this.state
    const tokenOptions = balances.map(({ name, balance }) => this._formatBalance(name, balance))
    const balanceSelected = balances.find(b => b.name === token) || balances[0]
    tokenOptions.unshift(tl.t('cancel'))
    return (
      <KeyboardScreen>
        <NavigationHeader
          title={tl.t('send.title')}
          onBack={() => this.props.navigation.goBack()}
        />
        <ScrollView>
          <Utils.Content>
            <ActionSheet
              ref={ref => { this.ActionSheet = ref }}
              title={tl.t('send.chooseToken')}
              options={tokenOptions}
              cancelButtonIndex={0}
              onPress={index => this._handleTokenChange(index, tokenOptions[index])}
            />
            <TouchableOpacity onPress={() => this.ActionSheet.show()}>
              <Input
                label={tl.t('send.input.token')}
                value={this.state.formattedToken}
                rightContent={this._rightContentToken}
                editable={false}
              />
            </TouchableOpacity>
            <Utils.VerticalSpacer size='medium' />
            <Input
              innerRef={(input) => { this.to = input }}
              label={tl.t('send.input.to')}
              rightContent={this._rightContentTo}
              value={to}
              onChangeText={to => this._changeAddress(to)}
              onSubmitEditing={() => this._nextInput('to')}
            />
            {addressError && (
              <React.Fragment>
                <Utils.Text size='xsmall' color='#ff5454'>
                  {addressError}
                </Utils.Text>
              </React.Fragment>
            )}
            <Modal
              visible={this.state.QRModalVisible}
              onRequestClose={this._closeModal}
              animationType='slide'
            >
              <QRScanner
                onRead={this._readPublicKey}
                onClose={this._closeModal}
                checkAndroid6Permissions
              />
            </Modal>
            <Utils.VerticalSpacer size='medium' />
            <Input
              innerRef={(input) => { this.amount = input }}
              label={tl.t('send.input.amount')}
              keyboardType='numeric'
              value={amount}
              placeholder='0'
              onChangeText={text => this._changeInput(text, 'amount')}
              onSubmitEditing={() => this._nextInput('description')}
              rightContent={this._rightContentAmount}
              align='right'
              type='float'
              numbersOnly
            />
            <Utils.Text light size='xsmall' secondary>
              {tl.t('send.minimumAmount')}
            </Utils.Text>
            <Utils.VerticalSpacer size='medium' />
            <Input
              innerRef={(input) => { this.description = input }}
              label={tl.t('send.input.description')}
              onChangeText={text => this._changeInput(text, 'description')}
            />
            {error && (
              <React.Fragment>
                <Utils.Error>{error}</Utils.Error>
                <Utils.VerticalSpacer size='large' />
              </React.Fragment>
            )}
            <Utils.VerticalSpacer size='large' />
            {loadingSign || loadingData ? (
              <ActivityIndicator size='small' color={Colors.primaryText} />
            ) : (
              <ButtonGradient
                font='bold'
                text={tl.t('send.title')}
                onPress={this._submit}
                disabled={Number(amount) <= 0 || Number(balanceSelected.balance) < Number(amount) || !isAddressValid(to)}
              />
            )}
          </Utils.Content>
        </ScrollView>
      </KeyboardScreen>
    )
  }
}

export default withContext(SendScene)
