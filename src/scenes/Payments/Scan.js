import React, { Component } from 'react'
import { Alert, ActivityIndicator } from 'react-native'
import QRCodeScanner from 'react-native-qrcode-scanner'
import { withNavigationFocus } from 'react-navigation'
// Design
import * as Utils from '../../components/Utils'
import NavigationHeader from '../../components/Navigation/Header'

// Service
import { ONE_TRX } from '../../services/client'

// Utils
import { isAddressValid } from '../../services/address'
import withContext from '../../utils/hocs/withContext'
import { Colors } from '../../components/DesignSystem'
import tl from '../../utils/i18n'
import { logSentry } from '../../utils/sentryUtils'

class DataError extends Error {
  constructor (message) {
    super(message)
    this.name = 'DataError'
    this.message = message
  }
}

class ScanPayment extends Component {
  static navigationOptions = { header: null }

  state = {
    loading: false,
    scanned: false
  }

  _checkAmount = (amount, token) => amount && (amount >= 1 / ONE_TRX)

  _checkDescription = description => description.length <= 500

  componentWillUnmount () {
    clearTimeout(this.scannerTimeout)
  }

  _onRead = event => {
    const { data } = event
    const { navigation } = this.props
    this.setState({loading: true})
    try {
      const parseData = JSON.parse(data)
      const { address, amount, token, data: description } = parseData

      if (!isAddressValid(address)) throw new DataError(tl.t('scanPayment.error.receiver'))
      if (!token) throw new DataError(tl.t('scanPayment.error.token'))
      if (!this._checkAmount(amount)) throw new DataError(tl.t('scanPayment.error.amount'))
      if (description && !this._checkDescription(description)) throw new DataError(tl.t('scanPayment.error.description'))

      this.setState({loading: false})
      navigation.navigate('MakePayScene', {payment: {address, amount, token, description}})
    } catch (error) {
      if (error.name === 'DataError') {
        Alert.alert(tl.t('warning'), error.message)
      } else {
        Alert.alert(tl.t('warning'), tl.t('scanPayment.error.code'))
        logSentry(error, 'Scan Payment')
      }
      this.setState({loading: false})
      this.scannerTimeout = setTimeout(() => {
        if (this.scanner) this.scanner.reactivate()
      }, 2000)
    }
  }

  render () {
    const { navigation, loading } = this.props
    return (
      <Utils.Container>
        <NavigationHeader
          title={tl.t('scanPayment.scan')}
          onBack={() => { navigation.goBack() }}
          rightButton={loading ? <ActivityIndicator size='small' color={Colors.primaryText} /> : null}
          noBorder
        />
        {navigation.isFocused() &&
        <QRCodeScanner
          showMarker
          fadeIn
          ref={node => { this.scanner = node }}
          customMarker={
            <Utils.View
              flex={1}
              background='transparent'
              justify='center'
              align='center'
            >
              <Utils.View
                width={250}
                height={250}
                borderWidth={2}
                borderColor={'white'}
              />
              <Utils.Text marginTop='medium' align='center'>
                {tl.t('components.QRScanner.explanation')}
              </Utils.Text>
            </Utils.View>
          }
          cameraStyle={{
            height: '100%',
            width: '100%',
            justifyContent: 'flex-start'
          }}
          permissionDialogMessage={tl.t('components.QRScanner.permissionMessage')}
          onRead={this._onRead}
        />}
      </Utils.Container>
    )
  }
}

export default withContext(withNavigationFocus(ScanPayment))
