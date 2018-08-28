import React, { Component } from 'react'
import { ActivityIndicator, NetInfo, ScrollView } from 'react-native'
import moment from 'moment'
import { Answers } from 'react-native-fabric'
import OneSignal from 'react-native-onesignal'

// Design
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import ButtonGradient from '../../components/ButtonGradient'
import LoadingScene from '../../components/LoadingScene'
import NavigationHeader from '../../components/Navigation/Header'
import { DetailRow, DataRow } from './elements'

// Service
import Client from '../../services/client'

// Utils
import tl from '../../utils/i18n'
import buildTransactionDetails, { translateError } from './detailMap'
import getTransactionStore from '../../store/transactions'
import { withContext } from '../../store/context'
import { logSentry } from '../../utils/sentryUtils'

const ANSWERS_TRANSACTIONS = ['Transfer', 'Vote', 'Participate', 'Freeze']
const NOTIFICATION_TRANSACTIONS = ['Transfer', 'Transfer Asset']

class TransactionDetail extends Component {
  state = {
    loadingData: true,
    loadingSubmit: false,
    transactionData: null,
    signedTransaction: null,
    submitted: false,
    submitError: null,
    isConnected: null,
    tokenAmount: null,
    nowDate: moment().format('MM/DD/YYYY HH:MM:SS')
  }

  componentDidMount () {
    this._navListener = this.props.navigation.addListener('didFocus', this._loadData)
  }

  componentWillUnmount () {
    this._navListener.remove()
    if (this.closeTransactionDetails) clearTimeout(this.closeTransactionDetails)
  }

  _loadData = async () => {
    const { navigation } = this.props

    const { tx: signedTransaction, tokenAmount } = navigation.state.params
    const connection = await NetInfo.getConnectionInfo()
    const isConnected = !(connection.type === 'none')

    this.setState({ isConnected })

    if (!isConnected) {
      this.setState({ loadingData: false })
      return null
    }

    try {
      const transactionData = await Client.getTransactionDetails(signedTransaction)
      this.setState({ transactionData, signedTransaction, tokenAmount })
    } catch (error) {
      this.setState({ submitError: error.message })
      logSentry(error)
    } finally {
      this.setState({ loadingData: false })
    }
  }

  _navigateNext = () => {
    const { navigation } = this.props
    const transaction = this._getTransactionObject()
    const stackToReset = this._getStackToReset(transaction.type)
    navigation.navigate('TransactionSuccess', { stackToReset })
  }

  _getTransactionObject = () => {
    const {
      transactionData: { hash, contracts }
    } = this.state

    const type = Client.getContractType(contracts[0].contractTypeId)
    const transaction = {
      id: hash,
      type,
      contractData: {
        transferFromAddress: contracts[0].from || contracts[0].ownerAddress,
        transferToAddress: contracts[0].to,
        tokenName: type === 'Transfer' ? 'TRX' : contracts[0].token
      },
      ownerAddress: contracts[0].from || contracts[0].ownerAddress,
      timestamp: Date.now(),
      confirmed: false
    }

    switch (type) {
      case 'Freeze':
        transaction.contractData.frozenBalance = contracts[0].frozenBalance
        break
      case 'Vote':
        transaction.contractData.votes = contracts[0].votes
        break
      default:
        transaction.contractData.amount = contracts[0].amount
        break
    }
    return transaction
  }

  _submitTransaction = async () => {
    const {
      signedTransaction,
      transactionData: { hash }
    } = this.state
    this.setState({ loadingSubmit: true, submitError: null })
    const store = await getTransactionStore()
    const transaction = this._getTransactionObject()
    try {
      store.write(() => { store.create('Transaction', transaction, true) })
      const { code } = await Client.broadcastTransaction(signedTransaction)
      if (code === 'SUCCESS') {
        if (ANSWERS_TRANSACTIONS.includes(transaction.type)) {
          Answers.logCustom('Transaction Operation', { type: transaction.type })
        }
        if (NOTIFICATION_TRANSACTIONS.includes(transaction.type)) {
          // if the receiver is a tronwallet user we'll find his devices here
          const response = await Client.getDevicesFromPublicKey(transaction.contractData.transferToAddress)
          if (response.data.users.length) {
            const content = {
              'en': tl.t('submitTransaction.notification', { address: transaction.contractData.transferFromAddress })
            }
            response.data.users.map(device => {
              // We use @ to identify the multiple accounts
              const deviceId = device.deviceid.split('@')[0] || device.deviceid
              OneSignal.postNotification(content, transaction, deviceId)
            })
          }
        }
        await this.props.context.loadUserData()
      }
      this.setState({ submitError: null, loadingSubmit: false, submitted: true }, this._navigateNext)
    } catch (error) {
      // This needs to be adapted better from serverless api
      const errorMessage = error.response && error.response.data ? error.response.data.error
        : error.message
      this.setState({
        submitError: translateError(errorMessage),
        loadingSubmit: false,
        submitted: true
      })
      logSentry(error)
      store.write(() => {
        const lastTransaction = store.objectForPrimaryKey('Transaction', hash)
        store.delete(lastTransaction)
      })
    }
  }

  _getStackToReset = (transactionType) => {
    if (transactionType === 'Transfer Asset' || transactionType === 'Transfer' ||
      transactionType === 'Freeze' || transactionType === 'Unfreeze') {
      return 'BalanceScene'
    }
    if (transactionType === 'Participate') {
      return 'ParticipateHome'
    }
    if (transactionType === 'Vote') {
      return 'Vote'
    }
    return null
  }

  _renderContracts = () => {
    const { transactionData, nowDate, tokenAmount } = this.state
    if (!transactionData) return null
    const { contracts, data } = transactionData

    const contractsElements = buildTransactionDetails(contracts, tokenAmount)
    contractsElements.push(
      <DetailRow
        key='TIME'
        title={tl.t('submitTransaction.time')}
        text={nowDate}
      />
    )
    if (data) {
      contractsElements.push(
        <DataRow
          key='DATA'
          data={data}
        />
      )
    }
    return <Utils.View paddingX={'medium'} paddingY={'small'}>{contractsElements}</Utils.View>
  }

  _renderSubmitButton = () => {
    const { loadingSubmit, submitted } = this.state

    return (
      <Utils.View marginTop={5} paddingX={'medium'}>
        {loadingSubmit ? (
          <ActivityIndicator size='small' color={Colors.primaryText} />
        ) : (
          !submitted && <ButtonGradient
            text={tl.t('submitTransaction.button.submit')}
            onPress={() => this.props.navigation.navigate('Pin', {
              shouldGoBack: true,
              testInput: pin => pin === this.props.context.pin,
              onSuccess: this._submitTransaction
            })}
            disabled={submitted}
            font='bold'
          />
        )}
      </Utils.View>
    )
  }

  _renderRetryConnection = () => (
    <Utils.Content align='center' justify='center'>
      <Utils.Text size='small'>
        {tl.t('submitTransaction.disconnectedMessage')}
      </Utils.Text>
      <Utils.VerticalSpacer size='large' />
      <ButtonGradient text={tl.t('submitTransaction.button.tryAgain')} onPress={this._loadData} size='small' />
    </Utils.Content>
  )

  render () {
    const { submitError, loadingData, isConnected } = this.state

    if (loadingData) return <LoadingScene />
    return (
      <React.Fragment>
        <NavigationHeader
          title={tl.t('submitTransaction.title')}
          onClose={!this.state.loadingSubmit ? () => this.props.navigation.goBack() : null}
        />
        <Utils.Container>
          <ScrollView>
            {!isConnected && this._renderRetryConnection()}
            {isConnected && this._renderContracts()}
            {isConnected && this._renderSubmitButton()}
            <Utils.Content align='center' justify='center'>
              {submitError && (
                <Utils.Error>{submitError}</Utils.Error>
              )}
            </Utils.Content>
          </ScrollView>
        </Utils.Container>
      </React.Fragment>
    )
  }
}
export default withContext(TransactionDetail)
