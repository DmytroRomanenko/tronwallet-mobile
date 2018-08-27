import React, { PureComponent } from 'react'
import { Alert, ActivityIndicator } from 'react-native'
import { Answers } from 'react-native-fabric'
import OneSignal from 'react-native-onesignal'

// Design
import * as Utils from '../../components/Utils'
import NavigationHeader from '../../components/Navigation/Header'
import Badge from '../../components/Badge'
import ButtonGradient from '../../components/ButtonGradient'
import { Divider } from './elements'
import { Colors } from '../../components/DesignSystem'
import { translateError } from '../../scenes/SubmitTransaction/detailMap'

// Service
import WalletClient from '../../services/client'

// Utils
import { signTransaction } from '../../utils/transactionUtils'
import withContext from '../../utils/hocs/withContext'
import { formatNumber } from '../../utils/numberUtils'
import getTransactionStore from '../../store/transactions'
import tl from '../../utils/i18n'
import { logSentry } from '../../utils/sentryUtils'

const NOTIFICATION_TRANSACTIONS = ['Transfer', 'Transfer Asset']

class DataError extends Error {
  constructor (message) {
    super(message)
    this.name = 'DataError'
    this.message = message
  }
}

class MakePayment extends PureComponent {
    static navigationOptions = { header: null }

    state = {
      loading: false,
      balances: this.props.context.balances[this.props.context.publicKey]
    }

    _getTransactionObject = (transactionData) => {
      const { hash, contracts } = transactionData
      const type = WalletClient.getContractType(contracts[0].contractTypeId)
      const transaction = {
        id: hash,
        type,
        contractData: {
          transferFromAddress: contracts[0].from || contracts[0].ownerAddress,
          transferToAddress: contracts[0].to,
          tokenName: type === 'Transfer' ? 'TRX' : contracts[0].token,
          amount: contracts[0].amount
        },
        ownerAddress: contracts[0].from || contracts[0].ownerAddress,
        timestamp: Date.now(),
        confirmed: false
      }
      return transaction
    }

    _navigateNext = () => {
      const { navigation } = this.props
      navigation.navigate('TransactionSuccess', {stackToReset: 'BalanceScene'})
    }

    _checkToken = token => !!this.state.balances.find(b => b.name === token)

    _checkAmount = (amount, token) => this.state.balances.find(b => b.name === token).balance > amount

    _checkPayment = () => {
      const { context, navigation } = this.props
      const { publicKey } = context
      const from = publicKey
      this.setState({loading: true})
      try {
        const { address, amount, token, description } = navigation.getParam('payment')
        if (from === address) throw new DataError(tl.t('makePayment.error.receiver'))
        if (!this._checkToken(token)) throw new DataError(tl.t('makePayment.error.token'))
        if (!this._checkAmount(amount, token)) throw new DataError(tl.t('makePayment.error.amount'))

        navigation.navigate('Pin', {
          shouldGoBack: true,
          testInput: pin => pin === context.pin,
          onSuccess: () => this._buildTransaction({from, to: address, amount, token, data: description})
        })
      } catch (error) {
        if (error.name === 'DataError') Alert.alert(tl.t('warning'), error.message)
        else Alert.alert(tl.t('warning'), tl.t('makePayment.error.receiver'))
        this.setState({loading: false})
        logSentry(error)
      }
    }

    _buildTransaction = async ({to, amount, token, from, data}) => {
      try {
        // Build Transaction
        const transactionUnsigned = await WalletClient.getTransferTransaction({from, to, amount, token})
        // Sign Transaction
        const { accounts, publicKey } = this.props.context
        const transactionSigned = await signTransaction(
          accounts.find(item => item.address === publicKey).privateKey,
          transactionUnsigned
        )
        // Get Transaction Signed Data
        const transactionData = await WalletClient.getTransactionDetails(transactionSigned)
        // Proceed to broadcast
        this._submitTransaction(transactionData, transactionSigned)
      } catch (error) {
        Alert.alert(tl.t('warning'), tl.t('error.default'))
        this.setState({ loading: false })
        logSentry(error)
      }
    }

    _submitTransaction = async (transactionData, transactionSigned) => {
      const { hash } = transactionData
      const store = await getTransactionStore()
      try {
        const transaction = this._getTransactionObject(transactionData)
        store.write(() => { store.create('Transaction', transaction, true) })
        const { code } = await WalletClient.broadcastTransaction(transactionSigned)
        if (code === 'SUCCESS') {
          if (NOTIFICATION_TRANSACTIONS.includes(transaction.type)) {
            Answers.logCustom('Payment Operation', { type: transaction.type })
            // if the receiver is a tronwallet user we'll find his devices here
            const response = await WalletClient.getDevicesFromPublicKey(transaction.contractData.transferToAddress)
            if (response.data.users.length) {
              const content = {
                'en': tl.t('submitTransaction.notificationPayment', { address: transaction.contractData.transferFromAddress })
              }
              response.data.users.map(device => {
                OneSignal.postNotification(content, transaction, device.deviceid)
              })
            }
          }
          await this.props.context.loadUserData()
        }
        this.setState({ loading: false }, this._navigateNext)
      } catch (error) {
        // This needs to be adapted better from serverless api
        const errorMessage = error.response && error.response.data ? translateError(error.response.data.error)
          : tl.t('error.default')
        Alert.alert('Warning', errorMessage)
        store.write(() => {
          const lastTransaction = store.objectForPrimaryKey('Transaction', hash)
          store.delete(lastTransaction)
        })
        this.setState({loading: false})
        logSentry(error)
      }
    }

    render () {
      const { navigation } = this.props
      const { loading } = this.state
      const { address, amount, token, description } = this.props.navigation.getParam('payment')

      return (
        <Utils.Container>
          <NavigationHeader
            title={tl.t('makePayment.pay')}
            onBack={() => { navigation.goBack() }}
            noBorder
          />
          <Utils.VerticalSpacer size='large' />
          <Utils.View align='center' justify='center'>
            <Utils.Text marginBottom={5} numberOfLines={2} size='xsmall' secondary>{tl.t('send.input.amount')}</Utils.Text>
            <Utils.Row justify='space-between' align='center'>
              <Utils.Text size='large'>{formatNumber(amount, true)}</Utils.Text>
              <Utils.HorizontalSpacer />
              <Badge>{token}</Badge>
            </Utils.Row>
          </Utils.View>
          <Divider size='medium' marginBottom={10} />
          <Utils.View paddingX='medium'>
            <Utils.Text marginBottom={15} size='xsmall' secondary>{tl.t('send.input.to')}</Utils.Text>
            <Utils.Text font='regular' size='xsmall'>{address}</Utils.Text>
          </Utils.View>
          <Divider size='medium' marginBottom={10} />
          <Utils.View paddingX='medium'>
            <Utils.Text marginBottom={15} size='xsmall' secondary>{tl.t('send.input.description')}</Utils.Text>
            <Utils.Text font='regular' size='xsmall'>{description || tl.t('makePayment.error.description')}</Utils.Text>
          </Utils.View>
          <Utils.VerticalSpacer size='large' />
          <Utils.View paddingX='medium'>
            {loading
              ? <ActivityIndicator size='small' color={Colors.primaryText} />
              : <ButtonGradient
                text={tl.t('makePayment.confirm')}
                onPress={this._checkPayment}
              />}
          </Utils.View>
        </Utils.Container>
      )
    }
}

export default withContext(MakePayment)
