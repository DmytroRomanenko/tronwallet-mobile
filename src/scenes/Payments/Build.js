import React, { Component } from 'react'
import {ActivityIndicator, Alert, ScrollView} from 'react-native'
import axios from 'axios'
import Config from 'react-native-config'

// Design
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import KeyboardScreen from '../../components/KeyboardScreen'
import Input from '../../components/Input'
import ButtonGradient from '../../components/ButtonGradient'
import RequestModal from './RequestModal'
import { SelecterWrapper, SelecterOption } from './elements'
// Utils
import tl from '../../utils/i18n'
import { withContext } from '../../store/context'
import { formatNumber } from '../../utils/numberUtils'
import { logSentry } from '../../utils/sentryUtils'

const CURRENCY_OPTIONS = ['USD', 'EUR', 'TRX']

class RequestPayment extends Component {
  state = {
    amount: '',
    amountTrx: '0',
    description: '',
    token: 'TRX',
    currencySelected: 'USD',
    currencyPrices: {
      'USD': '1',
      'EUR': '1',
      'TRX': '1'
    },
    modalQRVisible: false,
    loading: true
  }

  componentDidMount () {
    this._loadData()
  }

  _loadData = async () => {
    try {
      const [{data: {data: usdData}}, {data: {data: eurData}}] = await Promise.all([axios.get(`${Config.TRX_PRICE_API}/?convert=USD`),
        axios.get(`${Config.TRX_PRICE_API}/?convert=EUR`)])

      const newCurrencyPrices = {...this.state.currencyPrices}
      newCurrencyPrices['USD'] = formatNumber(usdData.quotes['USD'].price)
      newCurrencyPrices['EUR'] = formatNumber(eurData.quotes['EUR'].price)

      this.setState({ currencyPrices: newCurrencyPrices })
    } catch (err) {
      Alert.alert(tl.t('warning'), tl.t('buildPayment.error.currency'))
      logSentry(err, 'Build Payment')
    } finally {
      this.setState({loading: false})
    }
  }

  _checkRequestData = () => {
    const { amount, amountTrx } = this.state
    if (!amount || !amountTrx || Number(amount) <= 0 || Number(amountTrx) <= 0) {
      this.amount.focus()
    } else {
      this.setState({modalQRVisible: true})
    }
  }

  _changeInput = (text, field) => {
    const { currencySelected, currencyPrices } = this.state
    if (field === 'amount') {
      const amountTrx = (text / currencyPrices[currencySelected]).toFixed(6)
      this.setState({ [field]: text, amountTrx })
    } else {
      this.setState({[field]: text})
    }
  }
  _changeCurrency = (newCurrency) => {
    const { amount, currencyPrices } = this.state
    const amountTrx = (amount / currencyPrices[newCurrency]).toFixed(6)
    this.setState({ amountTrx, currencySelected: newCurrency })
  }

  _buildQrData = () => {
    const { amountTrx, token, description } = this.state
    const address = this.props.context.publicKey
    return JSON.stringify({amount: amountTrx, data: description, token, address})
  }

  _renderCurrencySelecter = () => {
    const { currencySelected } = this.state
    return <SelecterWrapper>
      <Utils.Row align='center'>
        {CURRENCY_OPTIONS.map(currency => (
          <SelecterOption onPress={() => this._changeCurrency(currency)} key={currency} disabled={currency === currencySelected}>
            <Utils.Text size='tiny'>{currency}</Utils.Text>
          </SelecterOption>
        ))}
      </Utils.Row>
    </SelecterWrapper>
  }

  _renderInputCurreny = () => (
    <Utils.Text size='smaller' secondary>
      {this.state.currencySelected}
    </Utils.Text>
  )

  render () {
    const {
      loading,
      amount,
      amountTrx,
      modalQRVisible,
      description,
      currencySelected } = this.state
    return (
      <KeyboardScreen>
        <ScrollView>
          <Utils.StatusBar />
          <Utils.Content>
            <Utils.Text marginBottom={15} size={'tiny'} align='center' secondary>{tl.t('buildPayment.selectCurrency')}</Utils.Text>
            {this._renderCurrencySelecter()}
            <Utils.VerticalSpacer />
            <Input
              innerRef={(input) => { this.amount = input }}
              label={tl.t('send.input.amount')}
              keyboardType='numeric'
              value={amount}
              editable={!loading}
              placeholder='0'
              onChangeText={text => this._changeInput(text, 'amount')}
              onSubmitEditing={() => this.description.focus()}
              rightContent={this._renderInputCurreny}
              align='right'
              type='float'
              numbersOnly
            />
            <Input
              innerRef={(input) => { this.description = input }}
              label={tl.t('send.input.description')}
              keyboardType='default'
              value={description}
              onChangeText={text => this._changeInput(text, 'description')}
            />
            <Utils.VerticalSpacer size='large' />
            {loading ? (
              <ActivityIndicator size='small' color={Colors.primaryText} />
            ) : (
              <ButtonGradient
                font='bold'
                text={tl.t('buildPayment.generate')}
                onPress={this._checkRequestData}
              />
            )}
          </Utils.Content>
          <RequestModal
            visible={modalQRVisible}
            onClose={() => this.setState({modalQRVisible: false})}
            amount={amount}
            amountTrx={amountTrx}
            currency={currencySelected}
            qrData={this._buildQrData()}
          />
        </ScrollView>
      </KeyboardScreen>
    )
  }
}

export default withContext(RequestPayment)
