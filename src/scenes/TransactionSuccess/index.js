import React, { PureComponent } from 'react'
import { NavigationActions, StackActions } from 'react-navigation'
import LottieView from 'lottie-react-native'
import tl from '../../utils/i18n'
import { SuccessSpecialMessage } from '../../components/SpecialMessage'
import { SuccessText, Wrapper } from './elements'
import { View } from '../../../node_modules/react-native-animatable'

class TransactionsSuccess extends PureComponent {
  _navigateNext = () => {
    // Reset navigation as transaction submition is the last step of a user interaction
    const { navigation } = this.props
    const stackToReset = navigation.getParam('stackToReset', null)
    const resetAction = StackActions.reset({
      index: 0,
      actions: [
        NavigationActions.navigate({ routeName: stackToReset })
      ],
      key: stackToReset
    })
    const navigateToHome = NavigationActions.navigate({ routeName: 'Transactions' })
    if (stackToReset) navigation.dispatch(resetAction)
    navigation.dispatch(navigateToHome)
  }

  _renderMiddleContent = () => (
    <View>
      <Wrapper>
        <LottieView
          source={require('./../../assets/animations/checked_done_.json')}
          autoPlay
          loop={false}
          resizeMode='cover'
          style={{ width: 400 }}
        />
      </Wrapper>
    </View>
  )

  _renderBottomContent = () => {
    setTimeout(this._navigateNext, 2000)
    return (<SuccessText>{tl.t('transactionSuccess.submitted')}</SuccessText>)
  }

  render () {
    return (
      <SuccessSpecialMessage message={tl.t('transactionSuccess.success')}
        renderMiddleContent={this._renderMiddleContent}
        renderBottomContent={this._renderBottomContent}
        bgIllustration={require('../../assets/circle-illustration-green.png')}
        bgCenter={require('../../assets/bg-success.png')}
      />
    )
  }
}

export default TransactionsSuccess
