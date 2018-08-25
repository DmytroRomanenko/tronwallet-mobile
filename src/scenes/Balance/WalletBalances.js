import React, { Component } from 'react'
import PropTypes from 'prop-types'

import tl from '../../utils/i18n'
import { formatNumber } from '../../utils/numberUtils'
import { orderBalances } from '../../utils/balanceUtils'
import { Colors } from '../../components/DesignSystem'
import Badge from '../../components/Badge'
import * as Utils from '../../components/Utils'
import { orderAssets } from '../../utils/assetsUtils'
import { AsyncStorage } from '../../../node_modules/aws-amplify/lib/Common'
import { USER_FILTERED_TOKENS } from '../../utils/constants'

class WalletBalances extends Component {
  state = {
    currentUserTokens: null
  }

  async componentDidUpdate (prevProps) {
    try {
      const { currentUserTokens } = this.state
      const filteredTokens = await AsyncStorage.getItem(USER_FILTERED_TOKENS)
      if (currentUserTokens !== filteredTokens) this.setState({ currentUserTokens: filteredTokens })
    } catch (error) {
      // console.log(error)
    }
  }

  _getOrderedBalances = () => {
    const { currentUserTokens } = this.state
    const { balances } = this.props
    if (currentUserTokens) {
      const parsedTokens = JSON.parse(currentUserTokens)
      const filteredBalances = balances.filter(asset => parsedTokens.findIndex(name => name === asset.name) === -1)
      return orderAssets(filteredBalances)
    }
    if (balances.length) {
      return orderAssets(balances)
    }
    return []
  }

  render () {
    const balancesToDisplay = this._getOrderedBalances()
    if (balancesToDisplay.length) {
      return (
        <React.Fragment>
          <Utils.VerticalSpacer size='large' />
          <Utils.Row justify='space-between'>
            <Utils.Text size='xsmall' secondary>
              {tl.t('balance.tokens')}
            </Utils.Text>
            <Utils.Text size='xsmall' secondary>
              {tl.t('balance.holdings')}
            </Utils.Text>
          </Utils.Row>
          <Utils.VerticalSpacer size='big' />
          {balancesToDisplay && orderBalances(balancesToDisplay).map((item) => (
            <Utils.Content key={item.name} paddingHorizontal='none' paddingVertical='medium'>
              <Utils.Row justify='space-between'>
                <Badge bg={Colors.lightestBackground} guarantee={item.verified}>{item.name}</Badge>
                <Utils.Text>{formatNumber(item.balance)}</Utils.Text>
              </Utils.Row>
            </Utils.Content>
          ))}
        </React.Fragment>
      )
    }

    return null
  }
}

WalletBalances.propTypes = {
  balances: PropTypes.array
}

WalletBalances.defaultProps = {
  balances: []
}

export default WalletBalances
