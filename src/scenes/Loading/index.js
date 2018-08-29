import React, { Component } from 'react'
import { AsyncStorage } from 'react-native'
import SplashScreen from 'react-native-splash-screen'

import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'

import { updateAssets } from '../../utils/assetsUtils'
import SecretStore from '../../store/secrets'
import { withContext } from '../../store/context'
import { USER_STATUS, USER_FILTERED_TOKENS } from '../../utils/constants'
import LottieView from 'lottie-react-native'

class LoadingScene extends Component {
  componentDidMount () {
    SplashScreen.hide()
    updateAssets(0, 1, 'twx')
    this._setFilteredTokens()
    this._askPin()
  }

  _getUseStatus = async () => {
    const useStatus = await AsyncStorage.getItem(USER_STATUS)
    if (useStatus === null || useStatus === 'reset') {
      return useStatus || true
    } else {
      return false
    }
  }

  _setFilteredTokens = async () => {
    const filteredTokens = await AsyncStorage.getItem(USER_FILTERED_TOKENS)
    if (filteredTokens === null) {
      await AsyncStorage.setItem(USER_FILTERED_TOKENS, '[]')
    }
  }

  _tryToOpenStore = async pin => {
    try {
      await SecretStore(pin)
      return true
    } catch (e) {
      return false
    }
  }

  _handleSuccess = key => {
    setTimeout(() => {
      this.props.context.setPin(key, () => this.props.navigation.navigate('App'))
    }, 2000)
  }

  _askPin = async () => {
    const useStatus = await this._getUseStatus()
    if (useStatus) {
      const shouldDoubleCheck = useStatus !== 'reset'
      this.props.navigation.navigate('FirstTime', {
        shouldDoubleCheck,
        testInput: this._tryToOpenStore
      })
    } else {
      setTimeout(() => {
        this.props.navigation.navigate('Pin', {
          testInput: this._tryToOpenStore,
          onSuccess: this._handleSuccess
        })
      }, 3000)
    }
  }

  render () {
    return (
      <Utils.View
        flex={1}
        align='center'
        justify='center'
        background={Colors.background}
      >
        <LottieView
          source={require('./../../assets/animations/world_locations.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </Utils.View>
    )
  }
}

export default withContext(LoadingScene)
