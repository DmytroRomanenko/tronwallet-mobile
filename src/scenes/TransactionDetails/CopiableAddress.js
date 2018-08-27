import React, { PureComponent } from 'react'
import { TouchableOpacity, Clipboard } from 'react-native'

import tl from '../../utils/i18n'
import { logSentry } from '../../utils/sentryUtils'

class Copiable extends PureComponent {
  state = {
    text: ''
  }

  static getDerivedStateFromProps = (nextProps) => ({
    text: nextProps.children
  })

  _onCopy = async () => {
    const { showToast } = this.props
    try {
      const { text } = this.state
      await Clipboard.setString(text)
      showToast(tl.t('transactionDetails.clipboard.publicKey'))
    } catch (error) {
      showToast(tl.t('error.clipboardCopied'))
      logSentry(error)
    }
  }

  _renderText = () => {
    const { TextComponent } = this.props
    const { text } = this.state
    return <TextComponent>{text}</TextComponent>
  }

  render () {
    return (
      <TouchableOpacity onPress={this._onCopy}>
        {this._renderText()}
      </TouchableOpacity>
    )
  }
}

export default Copiable
