import React from 'react'
import { Answers } from 'react-native-fabric'

import {
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  View,
  Platform
} from 'react-native'

import LinearGradient from 'react-native-linear-gradient'
import ProgressBar from 'react-native-progress/Bar'
import moment from 'moment'
import { debounce, union } from 'lodash'

import tl from '../../utils/i18n'
import getAssetsStore from '../../store/assets'
import { Colors } from '../../components/DesignSystem'
import { orderAssets, updateAssets } from '../../utils/assetsUtils'
import { ONE_TRX } from '../../services/client'
import guarantee from '../../assets/guarantee.png'
import NavigationHeader from '../../components/Navigation/Header'
import { logSentry } from '../../utils/sentryUtils'

import {
  Container,
  Row
} from '../../components/Utils'

import {
  Card,
  CardContent,
  TokenPrice,
  Featured,
  Text,
  TokenName,
  VerticalSpacer,
  FeaturedText,
  FeaturedTokenName,
  FeaturedTokenPrice,
  HorizontalSpacer,
  BuyButton,
  ButtonText,
  TokensTitle
} from './Elements'
import { rgb } from '../../../node_modules/polished'

const AMOUNT_TO_FETCH = 20

class ParticipateHome extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state
    return {
      header: (
        <NavigationHeader
          title={tl.t('participate.title')}
          onSearch={name => params._onSearch(name)}
          onSearchPressed={() => params._onSearchPressed()}
        />
      )
    }
  }

  state = {
    assetList: [],
    currentList: [],
    featuredTokens: [],
    start: 0,
    loading: false,
    searchMode: false
  }

  async componentDidMount () {
    Answers.logContentView('Tab', 'Participate')
    this._onSearch = debounce(this._onSearch, 350)
    this.props.navigation.setParams({
      _onSearch: this._onSearch,
      _onSearchPressed: this._onSearchPressed
    })

    await this._getTwxFromStore()
    this._loadData()
  }

  _getTwxFromStore = async () => {
    const store = await getAssetsStore()
    const filtered = store.objects('Asset')
      .filtered(`name == 'TWX'`)
      .map(item => Object.assign({}, item))

    if (filtered.length) {
      this.setState({ featuredTokens: orderAssets(filtered) })
    }
  }

  _loadData = async () => {
    this.setState({ loading: true })

    try {
      const assets = await this._updateAssets(0)
      this.setState({ assetList: assets, currentList: assets })
    } catch (e) {
      this.setState({ error: e.message })
      logSentry(e, 'Participate - Load Data')
    } finally {
      this.setState({ loading: false })
    }
  }

  _loadMore = async () => {
    const { start, assetList, searchMode } = this.state

    if (searchMode) return

    this.setState({ loading: true })
    const newStart = start + AMOUNT_TO_FETCH

    try {
      const assets = await this._updateAssets(newStart)
      const updatedAssets = union(assetList, assets)

      this.setState({ start: newStart, assetList: updatedAssets, currentList: updatedAssets })
    } catch (error) {
      this.setState({ error: error.message })
      logSentry(error, 'Participate - Load more candidates')
    } finally {
      this.setState({ loading: false })
    }
  }

  _updateAssets = async (start) => {
    const assets = await updateAssets(start, AMOUNT_TO_FETCH)
    return assets
      .filter(({ issuedPercentage, name, startTime, endTime }) =>
        issuedPercentage < 100 && name !== 'TRX' && name !== 'TWX' && startTime < Date.now() && endTime > Date.now())
      .sort((a, b) => b.issuedPercentage - a.issuedPercentage)
  }

  _renderFeaturedTokens = () => {
    const { searchMode, featuredTokens } = this.state

    if (searchMode) {
      return null
    }

    return (
      <View>
        <TokensTitle>
          {tl.t('participate.tokens')}
        </TokensTitle>
        <VerticalSpacer size={20} />
        {featuredTokens.map(token => <React.Fragment key={token.name}>{this._renderCard(token)}</React.Fragment>)}
      </View>
    )
  }

  _onSearchPressed = () => {
    const { searchMode } = this.state

    this.setState({ searchMode: !searchMode })
    if (searchMode) this._onSearch('')
  }

  _onSearch = async (name) => {
    const { assetList } = this.state

    try {
      if (name) {
        this.setState({ loading: true, searchMode: true })
        const assets = await updateAssets(0, 10, name)
        const filtered = assets.filter(({ issuedPercentage, name, startTime, endTime }) =>
          issuedPercentage < 100 && name !== 'TRX' && startTime < Date.now() && endTime > Date.now()
        )
        this.setState({ currentList: filtered, loading: false })
      } else {
        this.setState({ currentList: assetList, loading: false, searchMode: false })
      }
    } catch (error) {
      this.setState({ error: error.message })
      logSentry(error, 'Participate - on search')
    }
  }

  _renderCardContent = ({ name, price, issuedPercentage, endTime, verified }) => (
    <React.Fragment>
      {verified && (
        <Featured>
          <FeaturedText align='center'>{tl.t('participate.featured')}</FeaturedText>
        </Featured>
      )}
      <CardContent>
        <Row justify='space-between' align='center'>
          {verified ? (
            <Row align='center'>
              <HorizontalSpacer size={8} />

              <FeaturedTokenName>{name}</FeaturedTokenName>
              <HorizontalSpacer size={4} />
              <Image source={guarantee} style={{ height: 14, width: 14 }} />
            </Row>
          ) : (
            <TokenName>{name}</TokenName>
          )}
          {verified ? <FeaturedTokenPrice>{price / ONE_TRX} TRX</FeaturedTokenPrice> : <TokenPrice>{price / ONE_TRX} TRX</TokenPrice>}
        </Row>
        <VerticalSpacer size={verified ? 12 : 20} />
        <Row>
          <View style={{flex: 1, justifyContent: 'center'}}>
            <ProgressBar
              progress={Math.round(issuedPercentage) / 100}
              borderWidth={0}
              width={null} height={4}
              color={rgb(6, 231, 123)}
              unfilledColor={rgb(25, 26, 42)}
            />
            <VerticalSpacer size={6} />
            <Row justify='space-between'>
              <Text>{tl.t('ends')} {moment(endTime).fromNow()}</Text>
              <Text>{Math.round(issuedPercentage)}%</Text>
            </Row>
          </View>
          <HorizontalSpacer size={20} />
          {name === 'TWX' && (
            <BuyButton elevation={8}>
              <ButtonText>{tl.t('participate.button.buyNow')}</ButtonText>
            </BuyButton>
          )}
        </Row>
      </CardContent>
    </React.Fragment>
  )

  _renderCard = (asset) => {
    return (
      <React.Fragment>
        <TouchableOpacity onPress={() => { this.props.navigation.navigate('Buy', { item: asset }) }}>
          <Card>
            {asset.verified ? (
              <LinearGradient
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                colors={[rgb(255, 68, 101), rgb(246, 202, 29)]}
                style={{ flex: 1 }}
              >
                {this._renderCardContent(asset)}
              </LinearGradient>
            ) : (
              this._renderCardContent(asset)
            )}
          </Card>
          <VerticalSpacer size={15} />
        </TouchableOpacity>
      </React.Fragment>
    )
  }

  _renderLoading = () => {
    const { loading } = this.state

    if (loading) {
      return (
        <React.Fragment>
          <ActivityIndicator size='small' color={Colors.primaryText} />
          <VerticalSpacer size={10} />
        </React.Fragment>
      )
    }

    return null
  }

  render () {
    const { currentList } = this.state
    const orderedBalances = orderAssets(currentList)

    return (
      <Container>
        <FlatList
          ListHeaderComponent={this._renderFeaturedTokens()}
          ListFooterComponent={this._renderLoading()}
          data={orderedBalances}
          renderItem={({ item }) => this._renderCard(item)}
          keyExtractor={asset => asset.name}
          scrollEnabled
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={this._loadMore}
          onEndReachedThreshold={0.75}
        />
      </Container>
    )
  }
}

export default ParticipateHome
