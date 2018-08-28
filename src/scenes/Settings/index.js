import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  ScrollView,
  AsyncStorage,
  Modal,
  WebView,
  SafeAreaView
} from 'react-native'

import RNRestart from 'react-native-restart'
import SectionedMultiSelect from 'react-native-sectioned-multi-select'
import ActionSheet from 'react-native-actionsheet'
import Toast from 'react-native-easy-toast'
import { Answers } from 'react-native-fabric'
import { createIconSetFromFontello } from 'react-native-vector-icons'
import { StackActions, NavigationActions } from 'react-navigation'
import OneSignal from 'react-native-onesignal'
import Switch from 'react-native-switch-pro'

// Design
import * as Utils from '../../components/Utils'
import { Colors, Spacing } from '../../components/DesignSystem'
import NavigationHeader from '../../components/Navigation/Header'
import { SectionTitle } from './elements'

// Utils
import getBalanceStore from '../../store/balance'
import { orderAssets } from '../../utils/assetsUtils'
import { USER_PREFERRED_LANGUAGE, USER_FILTERED_TOKENS, FIXED_TOKENS } from '../../utils/constants'
import tl from '../../utils/i18n'
import fontelloConfig from '../../assets/icons/config.json'
import { withContext } from '../../store/context'
import { hardResetWalletData } from '../../utils/userAccountUtils'
import { getUserSecrets } from '../../utils/secretsUtils'
import Client from '../../services/client'
import Loading from '../../components/LoadingScene'
import { logSentry } from '../../utils/sentryUtils'

const Icon = createIconSetFromFontello(fontelloConfig, 'tronwallet')

const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: 'Loading' })],
  key: null
})

const LANGUAGES = [
  { value: tl.t('cancel') },
  { key: 'en-US', value: 'English' },
  { key: 'pt-BR', value: 'Português' },
  { key: 'fr-FR', value: 'Français' },
  { key: 'nl-NL', value: 'Nederlands' },
  { key: 'es-ES', value: 'Español' },
  { key: 'ch-CH', value: '中文' }
]

class Settings extends Component {
  static navigationOptions = () => {
    return {
      header: <NavigationHeader title={tl.t('settings.title')} />
    }
  }

  state = {
    seed: null,
    loading: true,
    modalVisible: false,
    uri: '',
    subscriptionStatus: null,
    changingSubscription: false,
    userTokens: [],
    userSelectedTokens: [],
    currentSelectedTokens: []
  }

  componentDidMount () {
    Answers.logContentView('Tab', 'Settings')
    this._onLoadData()
    this._getSelectedTokens()
    OneSignal.getPermissionSubscriptionState(
      status => this.setState({ subscriptionStatus: status.userSubscriptionEnabled === 'true' })
    )
    this._didFocus = this.props.navigation.addListener('didFocus', this._getSelectedTokens)
  }

  componentWillUnmount () {
    this._didFocus.remove()
  }

  _onLoadData = async () => {
    const data = await getUserSecrets(this.props.context.pin)
    // When hard reseting wallet data will be empty
    const seed = data.length ? data[0].mnemonic : this.state.seed
    this.setState({ seed, loading: false })
  }

  _getSelectedTokens = async () => {
    try {
      const store = await getBalanceStore()
      const tokens = store.objects('Balance')
        .filtered('TRUEPREDICATE DISTINCT(name)')
        .filter(({ name }) => FIXED_TOKENS.findIndex(token => token === name) === -1)
        .map(({ name }) => ({ id: name, name }))

      const filteredTokens = await AsyncStorage.getItem(USER_FILTERED_TOKENS)
      const selectedTokens = filteredTokens ? JSON.parse(filteredTokens) : []

      this.setState({
        userTokens: orderAssets(tokens),
        userSelectedTokens: selectedTokens,
        currentSelectedTokens: selectedTokens
      })
    } catch (error) {
      logSentry(error)
    }
  }

  _resetWallet = async () => {
    Alert.alert(
      tl.t('warning'),
      tl.t('settings.reset.warning'),
      [
        {text: tl.t('cancel'), style: 'cancel'},
        {text: tl.t('settings.reset.button'),
          onPress: () => this.props.navigation.navigate('Pin', {
            shouldGoBack: true,
            testInput: pin => pin === this.props.context.pin,
            onSuccess: async () => {
              await hardResetWalletData(this.props.context.pin)
              this.props.context.resetAccount()
              this.props.navigation.dispatch(resetAction)
            }
          })}
      ],
      { cancelable: false }
    )
  }

  _changePin = () => {
    this.props.navigation.navigate('Pin', {
      shouldGoBack: true,
      testInput: pin => pin === this.props.context.pin,
      onSuccess: () => {
        this.props.navigation.navigate('Pin', {
          shouldDoubleCheck: true,
          shouldGoBack: true,
          onSuccess: pin => this.props.context.setPin(pin, () => this.refs.settingsToast.show(tl.t('settings.pin.success')))
        })
      }
    })
  }

  _changeSubscription = () => {
    this.setState(
      ({ subscriptionStatus }) => ({ subscriptionStatus: !subscriptionStatus }),
      () => {
        OneSignal.setSubscription(this.state.subscriptionStatus)
        OneSignal.getPermissionSubscriptionState(
          status => console.log('subscriptions status', status)
        )
        if (this.state.subscriptionStatus) {
          Client.registerDeviceForNotifications(
            this.props.context.oneSignalId,
            this.props.context.publicKey
          )
        } else {
          // TODO: remove device from db
        }
      }
    )
  }

  _openLink = (uri) => this.setState({ modalVisible: true, uri })

  _handleLanguageChange = async (index) => {
    if (index !== 0) {
      const language = LANGUAGES[index]
      try {
        await AsyncStorage.setItem(USER_PREFERRED_LANGUAGE, language.key)
        Alert.alert(
          tl.t('settings.language.success.title', { language: language.value }),
          tl.t('settings.language.success.description'),
          [
            {text: tl.t('settings.language.button.cancel'), style: 'cancel'},
            {text: tl.t('settings.language.button.confirm'), onPress: () => RNRestart.Restart()}
          ],
          { cancelable: false }
        )
      } catch (e) {
        this.refs.settingsToast.show(tl.t('settings.language.error'))
        logSentry(e)
      }
    }
  }

  _saveSelectedTokens = async () => {
    const { currentSelectedTokens } = this.state
    try {
      await AsyncStorage.setItem(USER_FILTERED_TOKENS, JSON.stringify(currentSelectedTokens))
      this.setState({ userSelectedTokens: currentSelectedTokens })
    } catch (error) {
      logSentry(error)
    }
  }

  _renderNoResults = () => (
    <Utils.Text lineHeight={20} size='small' color={Colors.background}>
      {tl.t('settings.token.noResult')}
    </Utils.Text>
  )

  _showTokenSelect = () => {
    const { userSelectedTokens } = this.state
    this.setState({ currentSelectedTokens: userSelectedTokens })
    this.SectionedMultiSelect._toggleSelector()
  }

  _renderList = () => {
    const { seed, userTokens } = this.state
    const list = [
      {
        title: tl.t('settings.sectionTitles.wallet'),
        sectionLinks: [
          {
            title: tl.t('settings.token.title'),
            icon: 'sort,-filter,-arrange,-funnel,-filter',
            hide: userTokens.length === 0,
            onPress: this._showTokenSelect
          },
          {
            title: tl.t('settings.about.title'),
            icon: 'question-mark,-circle,-sign,-more,-info',
            onPress: () => { this.props.navigation.navigate('About') }
          },
          {
            title: tl.t('settings.accepts.title'),
            icon: 'question-mark,-circle,-sign,-more,-info',
            onPress: () => { this._openLink('https://www.tronwallet.me/partners') }
          }
        ]
      },
      {
        title: tl.t('settings.sectionTitles.security'),
        sectionLinks: [
          {
            title: tl.t('settings.backup.title'),
            icon: 'key,-password,-lock,-privacy,-login',
            onPress: () => this.props.navigation.navigate('Pin', {
              shouldGoBack: true,
              testInput: pin => pin === this.props.context.pin,
              onSuccess: () => this.props.navigation.navigate('SeedSave', { seed })
            })
          },
          {
            title: tl.t('settings.restore.title'),
            icon: 'folder-sync,-data,-folder,-recovery,-sync',
            onPress: () => this.props.navigation.navigate('Pin', {
              shouldGoBack: true,
              testInput: pin => pin === this.props.context.pin,
              onSuccess: () => this.props.navigation.navigate('SeedRestore')
            })
          },
          {
            title: tl.t('settings.reset.title'),
            icon: 'delete,-trash,-dust-bin,-remove,-recycle-bin',
            onPress: this._resetWallet
          }
        ]
      },
      {
        title: tl.t('settings.sectionTitles.notification'),
        sectionLinks: [
          {
            title: tl.t('settings.language.title'),
            icon: 'earth,-globe,-planet,-world,-universe',
            onPress: () => this.ActionSheet.show()
          },
          {
            title: tl.t('settings.notifications.title'),
            icon: 'user,-person,-avtar,-profile-picture,-dp',
            right: () => {
              if ((this.state.subscriptionStatus === null) || this.state.changingSubscription) {
                return <ActivityIndicator size='small' color={Colors.primaryText} />
              }
              return (
                <Switch
                  circleStyle={{ backgroundColor: Colors.orange }}
                  backgroundActive={Colors.yellow}
                  backgroundInactive={Colors.secondaryText}
                  value={this.state.subscriptionStatus}
                  onSyncPress={this._changeSubscription}
                />
              )
            }
          },
          {
            title: tl.t('settings.network.title'),
            icon: 'share,-network,-connect,-community,-media',
            onPress: () => this.props.navigation.navigate('NetworkConnection')
          }
        ]
      }
    ]

    return (
      <ScrollView>
        {list.map(item => (
          <View key={item.title}>
            <SectionTitle>
              {item.title}
            </SectionTitle>
            {item.sectionLinks.map(item => {
              const arrowIconName = 'arrow,-right,-right-arrow,-navigation-right,-arrows'
              return !item.hide
                ? (
                  <TouchableWithoutFeedback onPress={item.onPress} key={item.title}>
                    <Utils.Item padding={16}>
                      <Utils.Row justify='space-between' align='center'>
                        <Utils.Row justify='space-between' align='center'>
                          <View style={styles.rank}>
                            <Icon
                              name={item.icon}
                              size={22}
                              color={Colors.secondaryText}
                            />
                          </View>
                          <Utils.View>
                            <Utils.Text lineHeight={20} size='small'>
                              {item.title}
                            </Utils.Text>
                          </Utils.View>
                        </Utils.Row>
                        {(!!item.onPress && !item.right) && (
                          <Icon
                            name={arrowIconName}
                            size={15}
                            color={Colors.secondaryText}
                          />
                        )}
                        {item.right && item.right()}
                      </Utils.Row>
                    </Utils.Item>
                  </TouchableWithoutFeedback>
                ) : null
            })}
          </View>
        ))}
      </ScrollView>
    )
  }

  render () {
    const { userTokens, currentSelectedTokens, uri, modalVisible } = this.state
    const languageOptions = LANGUAGES.map(language => language.value)

    return (
      <Utils.Container
        keyboardShouldPersistTaps='always'
        keyboardDismissMode='interactive'
      >
        <ActionSheet
          ref={ref => { this.ActionSheet = ref }}
          title={tl.t('settings.language.choose')}
          options={languageOptions}
          cancelButtonIndex={0}
          onPress={index => this._handleLanguageChange(index)}
        />
        <Toast
          ref='settingsToast'
          position='top'
          fadeInDuration={1250}
          fadeOutDuration={1250}
          opacity={0.8}
        />
        <Modal
          animationType='slide'
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => this.setState({ modalVisible: false })}
        >
          <SafeAreaView style={{flex: 1, backgroundColor: Colors.background}}>
            <NavigationHeader title=' ' onBack={() => { this.setState({ modalVisible: false }) }} />
            <WebView
              source={{ uri }}
              renderLoading={() => <Loading />}
              startInLoadingState
            />
          </SafeAreaView>
        </Modal>
        <SectionedMultiSelect
          ref={ref => { this.SectionedMultiSelect = ref }}
          items={userTokens}
          uniqueKey='id'
          onSelectedItemsChange={(selected) => this.setState({ currentSelectedTokens: selected })}
          selectedItems={currentSelectedTokens}
          onConfirm={this._saveSelectedTokens}
          showChips={false}
          showCancelButton
          hideSelect
          searchPlaceholderText={tl.t('settings.token.search')}
          confirmText={tl.t('settings.token.confirm')}
          noResultsComponent={this._renderNoResults()}
        />
        <ScrollView>
          {this._renderList()}
        </ScrollView>
      </Utils.Container>
    )
  }
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 8,
    margin: Spacing.medium,
    backgroundColor: Colors.darkerBackground,
    borderColor: Colors.darkerBackground
  },
  listItemTitle: {
    paddingLeft: 20,
    color: Colors.primaryText
  },
  rank: {
    paddingRight: 10
  }
})

export default withContext(Settings)
