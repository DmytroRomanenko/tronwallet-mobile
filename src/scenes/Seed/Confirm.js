import React from 'react'
import styled from 'styled-components'
import { ScrollView, Alert } from 'react-native'
import { StackActions, NavigationActions } from 'react-navigation'
import { Answers } from 'react-native-fabric'

import tl from '../../utils/i18n'
import * as Utils from '../../components/Utils'
import { Spacing, Colors } from '../../components/DesignSystem'
import NavigationHeader from '../../components/Navigation/Header'
import ButtonGradient from '../../components/ButtonGradient'
import FadeIn from '../../components/Animations/FadeIn'

import WalletClient from '../../services/client'
import { confirmSecret, getUserSecrets } from '../../utils/secretsUtils'
import { withContext } from '../../store/context'
import { logSentry, DataError } from '../../utils/sentryUtils'

const WordWrapper = styled.TouchableOpacity`
  padding-vertical: ${Spacing.small};
  padding-horizontal: ${Spacing.medium};
`

const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: 'App' })],
  key: null
})

class Confirm extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    header: (
      <NavigationHeader
        title={tl.t('seed.confirm.title')}
        onBack={() =>
          navigation.getParam('shouldReset', false)
            ? navigation.dispatch(resetAction)
            : navigation.goBack()}
      />
    )
  })

  constructor (props) {
    super()
    const seed = props.navigation.getParam('seed', [])
    const initialRandom = seed.slice().sort(() => 0.5 - Math.random())
    this.state = {
      seed,
      selected: [],
      loading: false,
      initialWords: initialRandom,
      remainingWords: initialRandom
    }
  }

  _handleSubmit = async () => {
    const { context } = this.props
    this.setState({ loading: true })
    try {
      const originalWords = this.state.seed.join(' ')
      const selectedWords = this.state.selected.join(' ')
      if (originalWords !== selectedWords) throw new DataError('Words dont match!')
      await confirmSecret(context.pin)
      Answers.logCustom('Wallet Operation', { type: 'Create' })
      await this._handleSuccess()
    } catch (error) {
      Alert.alert(tl.t('seed.confirm.error.title'), tl.t('seed.confirm.error.message'))
      if (error.name !== 'DataError') {
        logSentry(error, 'Confirm Seed - Submit')
      }
      this.setState({ loading: false })
    }
  }

  _handleSuccess = async () => {
    const { navigation, context } = this.props
    try {
      const allSecrets = await getUserSecrets(context.pin)
      const { address } = allSecrets.length ? allSecrets[0] : allSecrets
      const result = await WalletClient.giftUser(address, context.oneSignalId)
      if (result) {
        Answers.logCustom('Wallet Operation', { type: 'Gift' })

        const rewardsParams = {
          label: tl.t('seed.confirm.success'),
          amount: 100,
          token: 'TWX'
        }
        navigation.navigate('Rewards', rewardsParams)
      } else {
        Answers.logCustom('Wallet Operation', { type: 'Gift', message: 'User gifted or not registered' })
        throw new DataError('User gifted or not registered')
      }
    } catch (error) {
      Answers.logCustom('Wallet Operation', { type: 'Gift', message: error.message })
      if (error.name !== 'DataError') {
        logSentry(error, 'Gift')
      }

      Alert.alert(tl.t('success'), tl.t('seed.confirm.success'))
      this.setState({ loading: false })
      navigation.dispatch(resetAction)
    } finally {
      context.loadUserData()
    }
  }

  _filterOut = (word, index) => word.filter((e, i) => i !== index)

  _selectWord = (word, index) => {
    const { remainingWords, selected } = this.state
    this.setState({
      remainingWords: this._filterOut(remainingWords, index),
      selected: [...selected, word]
    })
  }

  _deselectWord = (word, index) => {
    const { remainingWords, selected } = this.state
    this.setState({
      remainingWords: [...remainingWords, word],
      selected: this._filterOut(selected, index)
    })
  }

  _resetWords = () => {
    this.setState((state) => ({
      selected: [],
      remainingWords: [...state.initialWords]
    }))
  }

  render () {
    const { loading } = this.state

    return (
      <Utils.Container testID='ConfirmSeed'>
        <ScrollView>
          <Utils.Content align='center' justify='center'>
            <Utils.Text>
              {tl.t('seed.confirm.explanation')}
            </Utils.Text>
          </Utils.Content>
          <Utils.View height={1} backgroundColor={Colors.secondaryText} />
          <Utils.Content flex={1} background={Colors.darkerBackground}>
            <Utils.Row wrap='wrap' justify='center'>
              {this.state.selected.map((word, index) => (
                <FadeIn name={`${index}`} key={index}>
                  <WordWrapper
                    onPress={() => this._deselectWord(word, index)}
                  >
                    <Utils.Text>{word}</Utils.Text>
                  </WordWrapper>
                </FadeIn>
              ))}
            </Utils.Row>
            <Utils.View height={1} backgroundColor={Colors.secondaryText} marginY={16} />
            <Utils.Row wrap='wrap' justify='center' testID='remainingWords'>
              {this.state.remainingWords.map((word, index) => (
                <FadeIn name={`${index}`} key={index}>
                  <WordWrapper
                    onPress={() => this._selectWord(word, index)}
                  >
                    <Utils.Text>{word}</Utils.Text>
                  </WordWrapper>
                </FadeIn>
              ))}
            </Utils.Row>
          </Utils.Content>
          <Utils.View height={1} backgroundColor={Colors.secondaryText} />
          <Utils.VerticalSpacer />
          <Utils.Row justify='center'>
            <Utils.View align='center' paddingY='medium'>
              <ButtonGradient
                text={tl.t('seed.confirm.button.reset')}
                disabled={loading || !this.state.selected.length}
                onPress={this._resetWords}
              />
            </Utils.View>
            <Utils.HorizontalSpacer size='large' />
            <Utils.View align='center' paddingY='medium'>
              <ButtonGradient
                testID='ConfirmButton'
                text={tl.t('seed.confirm.button.confirm')}
                disabled={loading || this.state.selected.length < 12}
                onPress={this._handleSubmit}
              />
            </Utils.View>
          </Utils.Row>
        </ScrollView>
      </Utils.Container>
    )
  }
}

export default withContext(Confirm)
