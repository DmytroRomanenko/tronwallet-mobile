import React from 'react'
import Carousel from 'react-native-snap-carousel'
import LinearGradient from 'react-native-linear-gradient'
import { TouchableOpacity, Dimensions, Alert } from 'react-native'
import ActionSheet from 'react-native-actionsheet'

import { withContext } from '../../../store/context'

import TrxValue from '../TrxValue'
import * as Utils from '../../../components/Utils'
import {
  CarouselCard,
  TronLogo,
  Icon
} from './elements'
import tl from '../../../utils/i18n'
import { Colors } from '../../../components/DesignSystem'
import ClearButton from '../../../components/ClearButton'
import CardInfo from './CardInfo'
import { hideSecret } from '../../../utils/secretsUtils'
import { logSentry } from '../../../utils/sentryUtils'

const CURRENCIES = [tl.t('cancel'), 'TRX', 'USD', 'EUR', 'AUD', 'GBP', 'BTC', 'ETH']

class AccountsCarousel extends React.Component {
  _snapToNewAccount = () => {
    const { accounts } = this.props.context
    const createdItemPosition = accounts.length - 1
    // We set the state to load before the item is focused
    this._onSnapToItem(createdItemPosition)
    // Timeout needed for android
    setTimeout(() => this.carousel.snapToItem(createdItemPosition), 300)
  }
  _onSnapToItem = activeAccount => {
    const { setPublicKey, accounts } = this.props.context
    if (accounts.length) {
      const { address } = accounts[activeAccount]
      setPublicKey(address)
    }
  }

  // expose current index to parent
  currentIndex = () => this.carousel.currentIndex

  _alertHideAccount = (address) => {
    Alert.alert(
      tl.t('warning'),
      tl.t('hideAccount'),
      [
        {text: tl.t('cancel'), style: 'cancel'},
        {text: 'Remove', onPress: () => this._handleHideAccount(address)}
      ]
    )
  }
  _handleHideAccount = async (address) => {
    try {
      const { pin, hideAccount } = this.props.context
      const nextAccountIndex = this.currentIndex() - 1
      await hideSecret(pin, address)
      this.carousel.snapToItem(nextAccountIndex)
      hideAccount(address)
    } catch (error) {
      logSentry(error, 'Hide Account Handler')
      Alert.alert(tl.t('warning'), tl.t('error.hideAccount'))
    }
  }
  _handleCurrencyChange = async (index) => {
    if (index) {
      const currency = CURRENCIES[index]
      this.props.context.setCurrency(currency)
    }
  }

  _formatAddress = (address) => address
    .substring(0, 9)
    .concat('...')
    .concat(address.substring(25, address.length))

  _renderItem = ({ item, index }) => {
    const { currency } = this.props.context
    return (
      <CarouselCard>
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[Colors.buttonGradient[0], Colors.buttonGradient[1]]}
          style={{
            height: 3,
            borderRadius: 6,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20
          }}
        />
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['#2b2d44', '#1f2034']}
          style={{
            flex: 1,
            padding: 22,
            alignItems: 'flex-start',
            borderRadius: 6
          }}
        >
          <React.Fragment>
            <TronLogo>
              <Icon source={require('../../../assets/tron-logo-small.png')} />
            </TronLogo>
            <Utils.Text color='#9b9cb9'>{item.name}</Utils.Text>
            <Utils.VerticalSpacer />
            <Utils.Text color='white' size='smaller' font='regular'>{this._formatAddress(item.address)}</Utils.Text>
            <Utils.VerticalSpacer size='medium' />
            {(
              <TouchableOpacity onPress={() => this.ActionSheet.show()}>
                <TrxValue trxBalance={item.balance || 0} currency={currency} />
              </TouchableOpacity>
            )}
            <Utils.VerticalSpacer size='medium' />
            <Utils.Row>
              <CardInfo label={tl.t('tronPower')} value={item.tronPower || 0} />
              <Utils.HorizontalSpacer size='medium' />
              <CardInfo label={tl.t('balance.bandwidth')} value={item.bandwidth || 0} />
            </Utils.Row>
          </React.Fragment>
          {
            index !== 0 &&
            <ClearButton
              style={{position: 'absolute', right: 20, bottom: 20}}
              onPress={() => this._alertHideAccount(item.address)}
            />
          }
        </LinearGradient>
      </CarouselCard>
    )
  }

  render () {
    const { accounts } = this.props.context
    return !!accounts && (
      <React.Fragment>
        <ActionSheet
          ref={ref => { this.ActionSheet = ref }}
          title={tl.t('balance.chooseCurrency')}
          options={CURRENCIES}
          cancelButtonIndex={0}
          onPress={this._handleCurrencyChange}
        />
        <Carousel
          ref={ref => { this.carousel = ref }}
          layout='default'
          onSnapToItem={this._onSnapToItem}
          enableMomentum
          decelerationRate={0.9}
          data={accounts}
          renderItem={this._renderItem}
          sliderWidth={Dimensions.get('window').width}
          itemWidth={300}
          slideStyle={{paddingHorizontal: 6}}
        />
      </React.Fragment>
    )
  }
}

export default withContext(AccountsCarousel)
