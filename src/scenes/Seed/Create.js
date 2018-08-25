import React from 'react'
import { ActivityIndicator, Alert } from 'react-native'
import { StackActions, NavigationActions } from 'react-navigation'

import tl from '../../utils/i18n'
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import ButtonGradient from '../../components/ButtonGradient'
import NavigationHeader from '../../components/Navigation/Header'

import { resetWalletData } from '../../utils/userAccountUtils'
import { getUserSecrets, createUserKeyPair, resetSecretData } from '../../utils/secretsUtils'
import { withContext } from '../../store/context'

const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: 'App' })],
  key: null
})

class Create extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    header: (
      <NavigationHeader
        title={tl.t('seed.create.title')}
        onBack={() => {
          navigation.getParam('shouldReset', false)
            ? navigation.dispatch(resetAction)
            : navigation.goBack()
        }}
      />
    )
  })

  state = {
    seed: null,
    error: null
  }

  async componentDidMount () {
    try {
      await this._getMnemonic()
    } catch (err) {
      Alert.alert(tl.t('seed.create.error'))
    }
  }

  componentWillUnmount () {
    clearTimeout(this.mnemonicTimeout)
  }
  _getNewMnemonic = async () => {
    const { pin, oneSignalId } = this.props.context
    try {
      await resetWalletData()
      await createUserKeyPair(pin, oneSignalId)
      this._getMnemonic()
    } catch (e) {
      this.setState({
        error: 'Oops, we have a problem. Please restart the application.'
      })
    }
  }

  _getMnemonic = async () => {
    try {
      const accounts = await getUserSecrets(this.props.context.pin)
      const { mnemonic, address } = accounts[0]
      this.setState({ seed: mnemonic })
      clearTimeout(this.mnemonicTimeout)
      this.mnemonicTimeout = setTimeout(() => {
        this.props.context.setPublicKey(address)
        this.props.context.loadUserData()
      }, 500)
    } catch (e) {
      this.setState({
        error: 'Oops, we have a problem. Please restart the application.'
      })
    }
  }

  render () {
    const { seed } = this.state
    const { navigation } = this.props
    const firstTime = navigation.getParam('firstTime', false)

    return (
      <Utils.Container>
        <Utils.View flex={1} />
        <Utils.View height={1} backgroundColor={Colors.secondaryText} />
        <Utils.Content backgroundColor={Colors.darkerBackground}>
          {!seed && <ActivityIndicator />}
          {seed && (
            <Utils.Text lineHeight={24} align='center'>
              {seed}
            </Utils.Text>
          )}
        </Utils.Content>
        <Utils.View height={1} backgroundColor={Colors.secondaryText} />
        <Utils.Content paddingBottom={2}>
          <Utils.Row justify='center' align='flex-start' height={60}>
            {firstTime && (
              <React.Fragment>
                <Utils.View style={{flex: 1}}>
                  <ButtonGradient
                    onPress={this._getNewMnemonic}
                    text={tl.t('seed.create.button.newSeed')}
                    secondary
                    full
                  />
                </Utils.View>
                <Utils.HorizontalSpacer size='large' />
              </React.Fragment>
            )}
            <ButtonGradient
              onPress={() => (
                navigation.navigate(
                  'SeedConfirm',
                  { seed: seed.split(' ') }
                ))}
              text={tl.t('seed.create.button.written')}
              full
            />
          </Utils.Row>
        </Utils.Content>
        <Utils.Button
          onPress={() => {
            navigation.getParam('shouldReset', false)
              ? navigation.dispatch(resetAction)
              : navigation.goBack()
          }}
        >
          {tl.t('seed.create.button.later')}
        </Utils.Button>
        <Utils.View flex={1} />
      </Utils.Container>
    )
  }
}

export default withContext(Create)
