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
import { SectionTitle, MultiSelectColors, MultiSelectStyles } from './elements'
import AccountRecover from './RecoverAccount'
// Utils
import getBalanceStore from '../../store/balance'
import { orderAssets } from '../../utils/assetsUtils'
import { USER_PREFERRED_LANGUAGE, USER_FILTERED_TOKENS, FIXED_TOKENS, ALWAYS_ASK_PIN } from '../../utils/constants'
import tl from '../../utils/i18n'
import fontelloConfig from '../../assets/icons/config.json'
import { withContext } from '../../store/context'
import { hardResetWalletData } from '../../utils/userAccountUtils'
import { getUserSecrets, unhideSecret } from '../../utils/secretsUtils'
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
    currentSelectedTokens: [],
    hiddenAccounts: []
  }

  componentDidMount () {
    Answers.logContentView('Tab', 'Settings')
    this._onLoadData()
    this._getSelectedTokens()
    OneSignal.getPermissionSubscriptionState(
      status => this.setState({ subscriptionStatus: status.userSubscriptionEnabled === 'true' })
    )
    this._didFocus = this.props.navigation.addListener('didFocus', () => this._onLoadData(), this._getSelectedTokens)
  }

  componentWillUnmount () {
    this._didFocus.remove()
  }

  _onLoadData = async () => {
    const accounts = await getUserSecrets(this.props.context.pin)
    const hiddenAccounts = accounts.filter(account => account.hide)
    // When hard reseting wallet data will be empty
    const seed = accounts.length ? accounts[0].mnemonic : this.state.seed
    this.setState({ seed, loading: false, hiddenAccounts })
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
      logSentry(error, 'Settings - Selected tokens')
    }
  }

  _setAskPin = async () => {
    const { alwaysAskPin } = this.props.context
    await AsyncStorage.setItem(ALWAYS_ASK_PIN, `${!alwaysAskPin}`)
    this.props.context.setAskPin(!alwaysAskPin)
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

  _onUnhideAccounts = async (accountsSelected = []) => {
    const { loadUserData, pin } = this.props.context
    if (!accountsSelected.length) return
    try {
      unhideSecret(pin, accountsSelected)
      this._onLoadData()
      loadUserData()
    } catch (error) {
      logSentry(error, 'Hide Accounts Error')
    }
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
        logSentry(e, 'Settings - Language Change')
      }
    }
  }

  _saveSelectedTokens = async () => {
    const { currentSelectedTokens } = this.state
    try {
      await AsyncStorage.setItem(USER_FILTERED_TOKENS, JSON.stringify(currentSelectedTokens))
      this.setState({ userSelectedTokens: currentSelectedTokens })
    } catch (error) {
      logSentry(error, 'Settings - Save tokens')
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
    const { secretMode } = this.props.context
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
            hide: secretMode === 'privatekey',
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
          },
          {
            title: tl.t('settings.askPin'),
            icon: 'lock,-secure,-safety,-safe,-protect',
            right: () => {
              return (
                <Switch
                  circleStyle={{ backgroundColor: Colors.orange }}
                  backgroundActive={Colors.yellow}
                  backgroundInactive={Colors.secondaryText}
                  value={this.props.context.alwaysAskPin}
                  onAsyncPress={(callback) => {
                    this.props.navigation.navigate('Pin', {
                      shouldGoBack: true,
                      testInput: pin => pin === this.props.context.pin,
                      onSuccess: () => this._setAskPin()
                    })
                    /* eslint-disable */
                    callback(false)
                    /* eslint-disable */
                  }}
                />
              )
            }
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
      },{
        title: tl.t('settings.sectionTitles.accounts'),
        sectionLinks: [
          {
            title:  tl.t('settings.accounts.restoreAccounts'),
            icon: 'files,-agreement,-notes,-docs,-pages',
            onPress: () => this.state.hiddenAccounts.length
             ? this.AccountRecover.innerComponent._toggleSelector()
             : Alert.alert(tl.t('account'), tl.t('settings.accounts.noAccounts'))
          },
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
    const { userTokens, currentSelectedTokens, uri, modalVisible, hiddenAccounts } = this.state
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
          colors={MultiSelectColors}
          styles={MultiSelectStyles}
        />
        <AccountRecover
          ref={ref => {this.AccountRecover = ref}}
          hiddenAccounts={hiddenAccounts}
          onUnhide={this._onUnhideAccounts}
          renderNoResults={this._renderNoResults}
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
