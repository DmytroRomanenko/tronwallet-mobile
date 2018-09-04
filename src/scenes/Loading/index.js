import React, { Component } from 'react'
import { AsyncStorage } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import { StackActions, NavigationActions } from 'react-navigation'

import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'

import { updateAssets } from '../../utils/assetsUtils'
import { getUserSecrets } from '../../utils/secretsUtils'
import SecretStore from '../../store/secrets'
import { withContext } from '../../store/context'
import { USER_STATUS, USER_FILTERED_TOKENS, FEATURED_TOKENS } from '../../utils/constants'
import LottieView from 'lottie-react-native'

class LoadingScene extends Component {
  componentDidMount () {
    SplashScreen.hide()
    FEATURED_TOKENS.forEach(token => updateAssets(0, 1, token))
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

  _getRestoreMode = async pin => {
    const { setSecretMode } = this.props.context
    const accounts = await getUserSecrets(pin)
    if (accounts.length) {
      const mode = accounts[0].mnemonic ? 'mnemonic' : 'privatekey'
      setSecretMode(mode)
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
      this._getRestoreMode(pin)
      return true
    } catch (e) {
      return false
    }
  }

  _handleSuccess = key => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'App' })],
      key: null
    })
    setTimeout(() => {
      this.props.context.setPin(key, () => this.props.navigation.dispatch(resetAction))
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
