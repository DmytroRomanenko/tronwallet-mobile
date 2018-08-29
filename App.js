import React, { Component } from 'react'
import { StatusBar, Platform, YellowBox, SafeAreaView, AsyncStorage } from 'react-native'
import {
  createBottomTabNavigator,
  createStackNavigator,
  createMaterialTopTabNavigator
} from 'react-navigation'
import { createIconSetFromFontello } from 'react-native-vector-icons'
import axios from 'axios'
import Config from 'react-native-config'
import OneSignal from 'react-native-onesignal'
import { Sentry } from 'react-native-sentry'
import { logSentry } from './src/utils/sentryUtils'

import { Colors, ScreenSize } from './src/components/DesignSystem'

import LoadingScene from './src/scenes/Loading'
import SendScene from './src/scenes/Send'
import MarketScene from './src/scenes/Market'
import BalanceScene from './src/scenes/Balance'
import VoteScene from './src/scenes/Vote'
import ReceiveScene from './src/scenes/Receive'
import TransactionListScene from './src/scenes/Transactions'
import SubmitTransactionScene from './src/scenes/SubmitTransaction'
import FreezeScene from './src/scenes/Freeze'
import Settings from './src/scenes/Settings'
import About from './src/scenes/About'
import TokenInfoScene from './src/scenes/Participate/TokenInfo'
import BuyScene from './src/scenes/Participate/Buy'
import GetVaultScene from './src/scenes/GetVault'
import FreezeVoteScene from './src/components/Vote/Freeze'
import RewardsScene from './src/scenes/Rewards'
import NetworkConnection from './src/scenes/Settings/NetworkModal'
import SeedSave from './src/scenes/Seed/Save'
import SeedRestore from './src/scenes/Seed/Restore'
import SeedConfirm from './src/scenes/Seed/Confirm'
import TransactionDetails from './src/scenes/TransactionDetails'
import ParticipateHome from './src/scenes/Participate'
import Pin from './src/scenes/Pin'
import FirstTime from './src/scenes/FirstTime'
import TransactionSuccess from './src/scenes/TransactionSuccess'
import AccountsScene from './src/scenes/Accounts'
import ContactsScene from './src/scenes/Contacts'
import EditAddressBookItem from './src/scenes/EditAddressBookItem'
import AddContactScene from './src/scenes/Contacts/Add'
import NavigationHeader from './src/components/Navigation/Header'
import MakePayScene from './src/scenes/Payments/Make'
import PaymentsScene from './src/scenes/Payments'
import ScanPayScene from './src/scenes/Payments/Scan'
import CreateSeed from './src/scenes/Seed/Create'

import Client from './src/services/client'
import { Context } from './src/store/context'
import NodesIp from './src/utils/nodeIp'
import { getUserSecrets } from './src/utils/secretsUtils'
import getBalanceStore from './src/store/balance'
import { USER_PREFERRED_CURRENCY } from './src/utils/constants'
import { ONE_SIGNAL_KEY } from './config'
import ConfigJson from './package.json'

import fontelloConfig from './src/assets/icons/config.json'

import './ReactotronConfig'

if (!__DEV__) {
  Sentry.config('https://8ffba48a3f30473883ba930c49ab233d@sentry.io/1236809', {
    disableNativeIntegration: Platform.OS === 'android',
    release: ConfigJson.version
  }).install()
}
const Icon = createIconSetFromFontello(fontelloConfig, 'tronwallet')

YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader'])

const SettingsStack = createStackNavigator({
  Settings,
  About,
  SeedSave,
  SeedConfirm,
  NetworkConnection
}, {
  navigationOptions: {
    headerStyle: {
      backgroundColor: Colors.background,
      elevation: 0,
      borderColor: Colors.background
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontFamily: 'rubik-medium'
    }
  }
})

const tabWidth = ScreenSize.width / 2
const indicatorWidth = 15
const AddressBookTabs = createMaterialTopTabNavigator(
  {
    Contacts: ContactsScene,
    Accounts: AccountsScene
  },
  {
    navigationOptions: { header: null },
    tabBarOptions: {
      activeTintColor: Colors.primaryText,
      inactiveTintColor: '#66688f',
      style: {
        paddingTop: 10,
        backgroundColor: Colors.background,
        elevation: 0
      },
      labelStyle: {
        fontSize: 12,
        lineHeight: 12,
        letterSpacing: 0.6,
        fontFamily: 'Rubik-Medium'
      },
      indicatorStyle: {
        width: indicatorWidth,
        height: 1.2,
        marginLeft: tabWidth / 2 - indicatorWidth / 2
      }
    }
  }
)

const AddressBookStack = createStackNavigator({
  AddressBook: AddressBookTabs,
  EditAddressBookItem,
  AddContact: AddContactScene
}, {
  navigationOptions: {
    header: <NavigationHeader title='ADDRESS BOOK' />
  }
})

const BalanceStack = createStackNavigator({
  BalanceScene,
  ReceiveScene,
  FreezeScene,
  SendScene,
  PaymentsScene,
  MakePayScene,
  ScanPayScene
})

const TransactionList = createStackNavigator({
  TransactionListScene,
  TransactionDetails
})

const ParticipateStack = createStackNavigator(
  {
    ParticipateHome,
    TokenInfo: TokenInfoScene,
    Buy: BuyScene
  }
)

const AppTabs = createBottomTabNavigator({
  Market: MarketScene,
  Vote: {
    screen: VoteScene,
    path: 'vote'
  },
  AddressBook: AddressBookStack,
  Balance: BalanceStack,
  Transactions: TransactionList,
  Participate: ParticipateStack,
  Settings: SettingsStack
}, {
  navigationOptions: ({ navigation }) => ({
    tabBarIcon: ({ focused, tintColor }) => {
      const { routeName } = navigation.state
      let iconName
      if (routeName === 'Market') {
        iconName = `graph,-bar,-chart,-statistics,-analytics`
      } else if (routeName === 'Balance') {
        iconName = `wallet,-money,-cash,-balance,-purse`
      } else if (routeName === 'Transfer') {
        iconName = `fly,-send,-paper,-submit,-plane`
      } else if (routeName === 'AddressBook') {
        iconName = `diary,-contact,-address,-organizer,-book`
      } else if (routeName === 'Vote') {
        iconName = `shout-out,-speaker,-offer,-announcement,-loud`
      } else if (routeName === 'Transactions') {
        iconName = `network,-arrow,-up-dowm,-mobile-data,-send-receive`
      } else if (routeName === 'Receive') {
        iconName = `scan,-bar-code,-qr-code,-barcode,-scanner`
      } else if (routeName === 'Settings') {
        iconName = `gear,-settings,-update,-setup,-config`
      } else if (routeName === 'Participate') {
        iconName = `dollar,-currency,-money,-cash,-coin`
      }

      return <Icon name={iconName} size={26} color={tintColor} />
    }
  }),
  tabBarOptions: {
    activeTintColor: Colors.primaryText,
    inactiveTintColor: Colors.secondaryText,
    style: {
      backgroundColor: 'black'
    },
    showLabel: false
  },
  initialRouteName: 'Balance'
})

const RootNavigator = createStackNavigator({
  Loading: LoadingScene,
  CreateSeed,
  FirstTime,
  Pin,
  SeedRestore,
  App: AppTabs,
  GetVault: GetVaultScene,
  SubmitTransaction: {
    screen: SubmitTransactionScene,
    path: 'transaction/:tx'
  },
  TransactionSuccess,
  Freeze: FreezeVoteScene,
  Rewards: RewardsScene
}, {
  mode: 'modal',
  navigationOptions: {
    gesturesEnabled: false,
    header: null
  },
  cardStyle: { shadowColor: 'transparent' }
})

const prefix =
  Platform.OS === 'android' ? 'tronwalletmobile://tronwalletmobile/' : 'tronwalletmobile://'

class App extends Component {
  state = {
    price: {},
    freeze: {},
    balances: {},
    accounts: [],
    publicKey: null,
    pin: null,
    oneSignalId: null,
    shareModal: false,
    queue: null,
    currency: null
  }

  async componentDidMount () {
    setTimeout(() => {
      OneSignal.init(ONE_SIGNAL_KEY)
      OneSignal.inFocusDisplaying(2)
      OneSignal.addEventListener('ids', this._onIds)
      OneSignal.addEventListener('opened', this._onOpened)
      OneSignal.addEventListener('received', this._onReceived)
      OneSignal.configure()
    }, 1000)

    this._setNodes()

    const preferedCurrency = await AsyncStorage.getItem(USER_PREFERRED_CURRENCY)
    this._getPrice(preferedCurrency)
    this.setState({ currency: preferedCurrency })
  }

  componentWillUnmount () {
    OneSignal.removeEventListener('ids', this._onIds)
    OneSignal.removeEventListener('opened', this._onOpened)
    OneSignal.removeEventListener('received', this._onReceived)
  }

  _onIds = device => {
    // console.log('Device info: ', device)
    this.setState({ oneSignalId: device.userId })
  }

  _onReceived = notification => {
    // console.log('Notification received: ', notification)
  }

  _onOpened = openResult => {
    // console.log('Message: ', openResult.notification.payload.body)
    // console.log('Data: ', openResult.notification.payload.additionalData)
    // console.log('isActive: ', openResult.notification.isAppInFocus)
    // console.log('openResult: ', openResult)
  }

  _resetAccounts = () => this.setState({accounts: [], publicKey: null})

  _loadUserData = async () => {
    let accounts = await getUserSecrets(this.state.pin)
    // First Time
    if (!accounts.length) return

    if (this.state.accounts) {
      // merge store with state
      accounts = accounts.map(account => {
        const stateAccount = this.state.accounts.find(item => item.address === account.address)
        return Object.assign({}, stateAccount, account)
      })
    }
    this.setState({ accounts }, async () => {
      await this._updateBalances(accounts)
      await this._updateAllFreeze(accounts)
      if (!this.state.publicKey) {
        const { address } = accounts[0]
        this.setState({ publicKey: address })
      }
    })
  }

  _updateBalance = async address => {
    const addressBalances = await Client.getBalances(address)
    const balances = { ...this.state.balances, [address]: addressBalances }
    let { accounts } = this.state
    accounts = accounts.map(account => {
      if (account.address === address) {
        account.balance = addressBalances.find(item => item.name === 'TRX').balance
      }
      return account
    })
    this.setState({ accounts, balances })
    getBalanceStore().then(store => {
      store.write(() => {
        addressBalances.map(item =>
          store.create('Balance', {
            ...item,
            account: address,
            id: `${address}${item.name}`
          }, true))
      })
    })
  }

  _updateBalances = async accounts => {
    for (let i = 0; i < accounts.length; i++) {
      this._updateBalance(accounts[i].address)
    }
  }

  _updatePower = async address => {
    const data = await Client.getFreeze(address)
    let { freeze, accounts } = this.state
    freeze[address] = data
    accounts = accounts.map(account => {
      if (account.address === address) {
        account.tronPower = data.total
        account.bandwidth = data.bandwidth.netRemaining
      }
      return account
    })
    this.setState({
      accounts,
      freeze
    })
  }

  _updateAllFreeze = async accounts => {
    for (let i = 0; i < accounts.length; i++) {
      this._updatePower(accounts[i].address)
    }
  }

  _setCurrency = currency => {
    this.setState({ currency }, () => AsyncStorage.setItem(USER_PREFERRED_CURRENCY, currency))
    if (!this.state.price[currency]) this._getPrice(currency)
  }

  _getFreeze = async (address) => {
    try {
      const value = await Client.getFreeze(address)
      this.setState({ freeze: Object.assign({}, this.state.freeze, { [address]: value }) })
    } catch (e) {
      this.setState({ freeze: Object.assign({}, this.state.freeze, { e }) })
      logSentry(e, 'App - GetFreeze')
    }
  }

  _getPrice = async (currency = 'USD') => {
    try {
      const { data: { data } } = await axios.get(`${Config.TRX_PRICE_API}/?convert=${currency}`)
      const { price } = this.state
      price[currency] = data.quotes[currency]
      if (currency !== 'USD') {
        price.USD = data.quotes.USD
      }
      this.setState({ price, circulatingSupply: data.circulating_supply })
    } catch (e) {
      logSentry(e, 'App - GetPrice')
    }
  }

  _setNodes = async () => {
    try {
      await NodesIp.initNodes()
    } catch (e) {
      logSentry(e, 'App - SetNodes')
    }
  }

  _setPublicKey = publicKey => this.setState({ publicKey })

  _setPin = (pin, callback) => {
    this.setState({ pin }, () => {
      this._loadUserData()
      callback()
    })
  }

  _openShare = () => {
    this.setState({
      shareModal: true
    })
  }

  _closeShare = () => {
    this.setState({
      shareModal: false
    })
  }

  _toggleShare = () => {
    this.setState((state) => ({
      shareModal: !state.shareModal
    }))
  }

  render () {
    const contextProps = {
      ...this.state,
      loadUserData: this._loadUserData,
      getFreeze: this._getFreeze,
      getPrice: this._getPrice,
      setPublicKey: this._setPublicKey,
      setPin: this._setPin,
      openShare: this._openShare,
      closeShare: this._closeShare,
      toggleShare: this._toggleShare,
      updateBalances: this._updateBalances,
      setCurrency: this._setCurrency,
      resetAccount: this._resetAccounts
    }

    return (
      <SafeAreaView style={{ backgroundColor: Colors.background, flex: 1 }} >
        <Context.Provider value={contextProps}>
          <StatusBar barStyle='light-content' />
          <RootNavigator uriPrefix={prefix} />
        </Context.Provider>
      </SafeAreaView>
    )
  }
}

export default App
