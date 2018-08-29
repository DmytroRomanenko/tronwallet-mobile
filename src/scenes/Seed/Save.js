import React from 'react'
import { ActivityIndicator, Alert } from 'react-native'

import tl from '../../utils/i18n'
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import ButtonGradient from '../../components/ButtonGradient'
import NavigationHeader from '../../components/Navigation/Header'

import { getUserSecrets } from '../../utils/secretsUtils'
import { withContext } from '../../store/context'
import { logSentry } from '../../utils/sentryUtils'

class Save extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    header: (
      <NavigationHeader
        title={tl.t('seed.create.titleConfirm')}
        onBack={() => navigation.goBack()}
      />
    )
  })

  state = {
    seed: null
  }

  componentDidMount () {
    this._getMnemonic()
  }

  _getMnemonic = async () => {
    try {
      const accounts = await getUserSecrets(this.props.context.pin)
      const { mnemonic } = accounts[0]
      this.setState({ seed: mnemonic })
    } catch (e) {
      Alert.alert(tl.t('seed.create.error'))
      logSentry(e, 'Save Seed')
    }
  }

  render () {
    const { seed } = this.state
    const { navigation } = this.props
    return (
      <Utils.Container>
        <Utils.View flex={1} />
        <Utils.View height={1} backgroundColor={Colors.secondaryText} />
        <Utils.Content backgroundColor={Colors.darkerBackground}>
          {seed
            ? (<Utils.Text lineHeight={24} align='center'>
              {seed}
            </Utils.Text>)
            : <ActivityIndicator color={Colors.primaryText} />}
        </Utils.Content>
        <Utils.View height={1} backgroundColor={Colors.secondaryText} />
        <Utils.Content paddingBottom={2}>
          <Utils.View justify='center' height={60}>
            <ButtonGradient
              onPress={() => (
                navigation.navigate(
                  'SeedConfirm',
                  { seed: seed.split(' ') }
                ))}
              text={tl.t('seed.create.button.written')}
              full
            />
          </Utils.View>
        </Utils.Content>
        <Utils.Button
          onPress={() => navigation.goBack()}
        >
          {tl.t('seed.create.button.later')}
        </Utils.Button>
        <Utils.View flex={1} />
      </Utils.Container>
    )
  }
}

export default withContext(Save)
