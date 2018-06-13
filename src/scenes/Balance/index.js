import React, { Component } from 'react'
import { LineChart } from 'react-native-svg-charts'
import { tint } from 'polished'
import { FlatList, Image, TouchableOpacity, ScrollView, View } from 'react-native'
import moment from 'moment'
import axios from 'axios'

import Gradient from '../../components/Gradient'
import * as Utils from '../../components/Utils'
import { Colors } from '../../components/DesignSystem'
import Client from '../../services/client'
import LoadingScene from '../../components/LoadingScene'
import formatAmount from '../../utils/formatnumber'
import ButtonGradient from '../../components/ButtonGradient'

class BalanceScene extends Component {
  state = {
    loading: true,
    error: null,
    assetBalance: [],
    trxBalance: 0,
    trxPrice: 0
  }

  componentDidMount () {
    this._navListener = this.props.navigation.addListener('willFocus', () => {
      this.loadData()
    })
  }

  componentWillUnmount () {
    this._navListener.remove()
  }

  loadData = async () => {
    this.setState({ loading: true })
    try {
      const getData = await Promise.all([Client.getBalances(), Client.getTokenList()])
      const balances = getData[0]
      const tokenList = getData[1]
      const trxBalance = balances.find(b => b.name === 'TRX')
      const assetBalance = balances.filter(b => b.name !== 'TRX')
      const assetList = tokenList.filter(t => !balances.find(b => t.name === b.name))
      const { data: { data } } = await axios.get(
        'https://api.coinmarketcap.com/v2/ticker/1958'
      )

      this.setState({
        trxBalance: trxBalance.balance,
        assetBalance: [...assetBalance, ...assetList],
        loading: false,
        trxPrice: data.quotes.USD.price
      })
    } catch (error) {
      this.setState({ error: error.message, loading: false })
    }
  }

  navigateToParticipate = token => this.props.navigation.navigate('Participate', { token })

  renderParticipateButton = item => {
    const now = moment()
    if (item.percentage >= 100 || moment(item.startTime).isAfter(now) || moment(item.endTime).isBefore(now)) {
      return <View style={{ justifyContent: 'center', paddingHorizontal: 12 }}>
        <Utils.Text color={Colors.red}>FINISHED</Utils.Text>
      </View>
    } else {
      return <ButtonGradient
        size='small'
        onPress={() => this.navigateToParticipate(item)}
        text='Participate'
      />
    }
  }

  renderTokens = ({ item }) => {
    const { assetBalance } = this.state
    if (!assetBalance.length) return
    return (
      <Utils.Row align='center' justify='space-between'>
        <Utils.Label color={tint(0.9, Colors.background)}>
          <Utils.Text>{item.name}</Utils.Text>
        </Utils.Label>
        {
          item.balance
            ? <Utils.Text>{`${formatAmount(item.balance)}`}</Utils.Text>
            : this.renderParticipateButton(item)
        }
      </Utils.Row>
    )
  }

  render () {
    const { navigation } = this.props
    const { assetBalance, trxBalance, loading, trxPrice, error } = this.state

    if (loading) return <LoadingScene />

    return (
      <Utils.Container>
        <Utils.StatusBar />
        <ScrollView>
          <Utils.VerticalSpacer size='large' />
          <Utils.Row justify='center'>
            <Utils.View align='center'>
              <Image
                source={require('../../assets/tron-logo-small.png')}
                resizeMode='contain'
                style={{ height: 60 }}
              />
              <Utils.VerticalSpacer size='medium' />
              <Utils.Text secondary>BALANCE</Utils.Text>
              <Utils.Text size='medium'>{formatAmount(trxBalance)} TRX</Utils.Text>
            </Utils.View>
          </Utils.Row>
          <Utils.Content>
            <Utils.Content>
              <LineChart
                style={{ height: 30 }}
                data={[
                  50,
                  10,
                  40,
                  95,
                  -4,
                  -24,
                  85,
                  91,
                  35,
                  53,
                  -53,
                  24,
                  50,
                  -20,
                  -80
                ]}
                svg={{ stroke: 'url(#gradient)', strokeWidth: 3 }}
                animate
              >
                <Gradient />
              </LineChart>
            </Utils.Content>
            <Utils.Text size='xsmall' secondary>
              $ {trxPrice}
            </Utils.Text>
            <Utils.VerticalSpacer size='medium' />
            {assetBalance.length ? (
              <FlatList
                data={assetBalance}
                renderItem={this.renderTokens}
                keyExtractor={item => item.name}
                ItemSeparatorComponent={() => (
                  <Utils.VerticalSpacer size='large' />
                )}
                scrollEnabled
              />
            ) : (
              <Utils.View align='center'>
                <Utils.VerticalSpacer size='big' />
                {/* <Image
                source={require('../../assets/empty.png')}
                resizeMode='contain'
                style={{ height: 220 }}
              /> */}
                <Utils.VerticalSpacer size='medium' />
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    marginHorizontal: 5,
                    flexDirection: 'row'
                  }}
                  onPress={() => navigation.navigate('Tokens')}
                >
                  <Utils.Text secondary font='light' size='small'>Click here to participate in other tokens.</Utils.Text>
                </TouchableOpacity>
              </Utils.View>
            )}
            <Utils.Error>{error}</Utils.Error>
          </Utils.Content>
        </ScrollView>
      </Utils.Container>
    )
  }
}

export default BalanceScene
