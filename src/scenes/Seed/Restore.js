import React from 'react'
import { Alert, Keyboard } from 'react-native'
import { StackActions, NavigationActions } from 'react-navigation'
import { Answers } from 'react-native-fabric'

import tl from '../../utils/i18n'
import * as Utils from '../../components/Utils'
import ButtonGradient from '../../components/ButtonGradient'
import NavigationHeader from '../../components/Navigation/Header'

import { resetWalletData, resetListsData } from '../../utils/userAccountUtils'
import { recoverUserKeypair } from '../../utils/secretsUtils'
import { withContext } from '../../store/context'
import { logSentry } from '../../utils/sentryUtils'

class Restore extends React.Component {
  state = {
    seed: '',
    loading: false
  }

  _softResetData = async () => {
    const { resetAccount } = this.props.context
    await Promise.all([resetWalletData(), resetListsData()])
    resetAccount()
  }
  _navigateToSettings = () => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'App' })],
      key: null
    })
    this.props.navigation.dispatch(resetAction)
  }

  _handleRestore = async () => {
    Alert.alert(
      tl.t('warning'),
      tl.t('seed.restore.warning'),
      [
        { text: tl.t('cancel') },
        { text: tl.t('ok'), onPress: this._restoreWallet }
      ],
      { cancelable: false }
    )
  }

  _restoreWallet = async () => {
    const { loadUserData, pin, oneSignalId } = this.props.context
    const seed = this.state.seed.trim()

    Keyboard.dismiss()
    this.setState({ loading: true })
    try {
      await recoverUserKeypair(pin, oneSignalId, seed)
      await this._softResetData()
      await loadUserData()
      Alert.alert(tl.t('seed.restore.success'))
      this.setState({ loading: false }, this._navigateToSettings)
      Answers.logCustom('Wallet Operation', { type: 'Restore' })
    } catch (err) {
      Alert.alert(tl.t('warning'), tl.t('seed.restore.error'))
      this.setState({ loading: false })
      logSentry(err)
    }
  }

  _onKeyPress = (event) => {
    if (event.nativeEvent.key === 'Enter') {
      this._handleRestore()
    }
  }

  render () {
    const { loading } = this.state
    return (
      <Utils.Container>
        <NavigationHeader
          title={tl.t('seed.restore.title')}
          onBack={() => this.props.navigation.goBack()}
          noBorder
        />
        <Utils.Content paddingBottom='2'>
          <Utils.FormInput
            testID='restoreInput'
            placeholder={tl.t('seed.restore.placeholder')}
            height={90}
            padding={16}
            multiline
            numberOfLines={4}
            autoCapitalize='none'
            autoCorrect={false}
            value={this.state.seed}
            onChangeText={seed => this.setState({ seed })}
            onKeyPress={this._onKeyPress}
          />
        </Utils.Content>
        <Utils.Content paddingTop='2' paddingBottom='4'>
          <ButtonGradient
            testID='RestoreButton'
            disabled={!this.state.seed.length || loading}
            onPress={this._handleRestore}
            text={tl.t('seed.restore.button')}
          />
        </Utils.Content>
        <Utils.Content paddingTop='8'>
          <Utils.Text weight='300' font='light' secondary size='smaller'>
            {tl.t('seed.restore.explanation')}
          </Utils.Text>
        </Utils.Content>
        <Utils.VerticalSpacer />
        <Utils.View flex={1} />
      </Utils.Container>
    )
  }
}

export default withContext(Restore)
