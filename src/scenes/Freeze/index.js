import React, { Component } from 'react'
import { Alert, Keyboard } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import moment from 'moment'
import { Answers } from 'react-native-fabric'

import tl from '../../utils/i18n'
import * as Utils from '../../components/Utils'
import Header from '../../components/Header'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import ButtonGradient from '../../components/ButtonGradient'
import { Colors } from '../../components/DesignSystem'
import KeyboardScreen from '../../components/KeyboardScreen'
import NavigationHeader from '../../components/Navigation/Header'

import Client from '../../services/client'
import { signTransaction } from '../../utils/transactionUtils'
import getTransactionStore from '../../store/transactions'
import { withContext } from '../../store/context'
import { formatNumber } from '../../utils/numberUtils'
import { logSentry } from '../../utils/sentryUtils'

class FreezeScene extends Component {
  static navigationOptions = {
    header: null
  }

  state = {
    total: 0,
    amount: '',
    loading: true,
    unfreezeStatus: {
      msg: tl.t('freeze.unfreeze.inThreeDays'),
      disabled: false
    }
  }

  componentDidMount () {
    Answers.logContentView('Page', 'Freeze')
    this._didFocusSubscription = this.props.navigation.addListener(
      'didFocus',
      this._loadData
    )
  }

  componentWillUnmount () {
    this._didFocusSubscription.remove()
  }

  _checkUnfreeze = async () => {
    const { context } = this.props
    let unfreezeStatus = {
      msg: tl.t('freeze.unfreeze.inThreeDays'),
      disabled: false
    }
    try {
      const transactionStore = await getTransactionStore()

      const queryFreeze = transactionStore
        .objects('Transaction')
        .sorted([['timestamp', true]])
        .filtered('ownerAddress = $0 AND (type == "Unfreeze" OR type == "Freeze")', context.publicKey)

      const lastFreeze = queryFreeze.length && queryFreeze[0].type === 'Freeze'
        ? queryFreeze[0] : null

      if (lastFreeze) {
        const lastFreezeTimePlusThree = moment(lastFreeze.timestamp).add(3, 'days')
        const differenceFromNow = lastFreezeTimePlusThree.diff(moment())
        const duration = moment.duration(differenceFromNow)

        if (duration.asSeconds() > 0) {
          unfreezeStatus.msg = duration.asDays() < 1 ? duration.asHours() < 1
            ? tl.t('freeze.unfreeze.inXMinutes', { minutes: Math.round(duration.asMinutes()) })
            : tl.t('freeze.unfreeze.inXHours', { hours: Math.round(duration.asHours()) })
            : tl.t('freeze.unfreeze.inXDays', { days: Math.round(duration.asDays()) })
          unfreezeStatus.disabled = true
          return unfreezeStatus
        } else {
          unfreezeStatus.msg = tl.t('freeze.unfreeze.now')
          unfreezeStatus.disabled = false
          return unfreezeStatus
        }
      } else {
        return unfreezeStatus
      }
    } catch (e) {
      logSentry(e)
      return unfreezeStatus
    }
  }

  _loadData = async () => {
    try {
      const { accounts, publicKey } = this.props.context
      const { tronPower } = accounts.find(account => account.address === publicKey)
      const unfreezeStatus = await this._checkUnfreeze()
      this.setState({
        loading: false,
        unfreezeStatus,
        total: tronPower
      })
    } catch (e) {
      logSentry(e)
      this.setState({ loading: false })
    }
  }

  _submitUnfreeze = async () => {
    const { publicKey } = this.props.context
    this.setState({loading: true})
    try {
      const data = await Client.getUnfreezeTransaction(publicKey, this.props.context.pin)
      this._openTransactionDetails(data)
    } catch (e) {
      Alert.alert(tl.t('error.buildingTransaction'))
      this.setState({ loadingSign: false })
      logSentry(e)
    } finally {
      this.setState({loading: false})
    }
  }

  _submit = async () => {
    const { accounts, publicKey } = this.props.context
    const { balance } = accounts.find(account => account.address === publicKey)
    const { amount } = this.state
    const convertedAmount = Number(amount)

    this.setState({ loading: true })
    try {
      if (convertedAmount <= 0) { throw new Error(tl.t('freeze.error.minimiumAmount')) }
      if (balance < convertedAmount) { throw new Error(tl.t('freeze.error.insufficientAmount')) }
      if (!Number.isInteger(convertedAmount)) { throw new Error(tl.t('freeze.error.roundNumbers')) }
      await this._freezeToken()
    } catch (e) {
      this.setState({ loading: false })
      Alert.alert(tl.t('warning'), e.message)
      logSentry(e)
    }
  }

  _freezeToken = async () => {
    const { amount } = this.state
    const convertedAmount = Number(amount)

    try {
      const data = await Client.getFreezeTransaction(this.props.context.publicKey, convertedAmount)
      this._openTransactionDetails(data)
    } catch (e) {
      Alert.alert(Alert.alert(tl.t('error.buildingTransaction')))
      logSentry(e)
    } finally {
      this.setState({ loading: false })
    }
  }

  _openTransactionDetails = async (transactionUnsigned) => {
    try {
      const { accounts, publicKey } = this.props.context
      const transactionSigned = await signTransaction(
        accounts.find(item => item.address === publicKey).privateKey,
        transactionUnsigned
      )
      this.setState({ loadingSign: false }, () => {
        this.props.navigation.navigate('SubmitTransaction', {
          tx: transactionSigned
        })
      })
    } catch (e) {
      Alert.alert(tl.t('error.gettingTransaction'))
      this.setState({ loadingSign: false })
      logSentry(e)
    }
  }

  _changeFreeze = value => {
    const validation = /^0[0-9]/
    let amount = validation.test(value) ? value.slice(1, value.length) : value

    this.setState({
      amount: amount
    })
  }

  _leftContent = () => (
    <Utils.View marginRight={8} marginLeft={8}>
      <Ionicons name='ios-unlock' size={16} color={Colors.secondaryText} />
    </Utils.View>
  )

  _getBalance = () => {
    const { accounts, publicKey } = this.props.context
    const currentBalance = accounts.find(account => account.address === publicKey)
    if (currentBalance) return currentBalance.balance
    else return 0
  }

  render () {
    const { amount, loading, unfreezeStatus } = this.state
    const { freeze, publicKey } = this.props.context
    const userTotalPower = freeze[publicKey] ? Number(freeze[publicKey].total) : 0
    const newTotalPower = userTotalPower + Number(amount.replace(/,/g, ''))
    const trxBalance = this._getBalance()

    return (
      <KeyboardScreen>
        <NavigationHeader
          title={tl.t('freeze.title')}
          onBack={() => { this.props.navigation.goBack() }}
          noBorder
        />
        <Utils.Container>
          <Header>
            <Utils.View align='center'>
              <Utils.Text size='xsmall' secondary>
                {tl.t('freeze.balance')}
              </Utils.Text>
              <Utils.VerticalSpacer size='medium' />
              <Utils.Row align='center'>
                <Utils.Text size='large'>{formatNumber(trxBalance)}</Utils.Text>
                <Utils.HorizontalSpacer />
                <Badge>TRX</Badge>
              </Utils.Row>
            </Utils.View>
          </Header>
          <Utils.Content paddingTop={8}>
            <Input
              label={tl.t('freeze.amount')}
              leftContent={this._leftContent}
              keyboardType='numeric'
              align='right'
              value={amount}
              onChangeText={value => this._changeFreeze(value)}
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder='0'
              type='int'
              numbersOnly
            />
            <Utils.VerticalSpacer size='small' />
            <Utils.SummaryInfo>
              {`${tl.t('tronPower')} ${formatNumber(newTotalPower)}`}
            </Utils.SummaryInfo>
            <Utils.VerticalSpacer size='medium' />
            <ButtonGradient
              font='bold'
              text={tl.t('freeze.title')}
              onPress={this._submit}
              disabled={loading || !(amount > 0 && amount <= trxBalance)}
            />
            <Utils.VerticalSpacer size='big' />
            <Utils.View align='center' justify='center'>
              <Utils.SummaryInfo>
                {unfreezeStatus.msg}
              </Utils.SummaryInfo>
              <Utils.VerticalSpacer size='medium' />
              <Utils.LightButton
                paddingY={'medium'}
                paddingX={'large'}
                disabled={unfreezeStatus.disabled || loading || !userTotalPower}
                onPress={this._submitUnfreeze}>
                <Utils.Text size='xsmall'>{tl.t('freeze.unfreeze.title')}</Utils.Text>
              </Utils.LightButton>
            </Utils.View>
          </Utils.Content>
        </Utils.Container>
      </KeyboardScreen>
    )
  }
}

export default withContext(FreezeScene)
