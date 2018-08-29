import React, { PureComponent } from 'react'
import { Dimensions, Clipboard } from 'react-native'
import Toast from 'react-native-easy-toast'
import Feather from 'react-native-vector-icons/Feather'
import { Answers } from 'react-native-fabric'

// Design
import QRCode from '../../components/QRCode'
import { Colors, FontSize } from '../../components/DesignSystem'
import KeyboardScreen from '../../components/KeyboardScreen'
import Share from '../../components/Share'

// Utils
import { ActionButton } from './elements'
import * as Utils from '../../components/Utils'
import tl from '../../utils/i18n'
import { withContext } from '../../store/context'
import { logSentry } from '../../utils/sentryUtils'

class ReceiveScreen extends PureComponent {
  static navigationOptions = {
    header: null
  }

  state = {
    loading: true,
    shareOpen: true
  }

  componentDidMount () {
    Answers.logContentView('Page', 'Receive')
  }

  _onLoad = () => {
    setTimeout(() => this.setState({ loading: false }), 1000)
  }

  _copy = async () => {
    try {
      await Clipboard.setString(this.props.context.publicKey)
      this.refs.toast.show(tl.t('receive.clipboardCopied'))
    } catch (error) {
      this.refs.toast.show(tl.t('error.clipboardCopied'))
      logSentry(error, 'Receive - Clipboard')
    }
  }

  render () {
    const { width } = Dimensions.get('window')
    const { context } = this.props
    const publicKey = context.publicKey

    return (
      <KeyboardScreen>
        <Utils.Content align='center'>
          <Utils.VerticalSpacer size='medium' />
          {!!publicKey && <QRCode value={publicKey} onLoad={this._onLoad} loading={this.state.loading} size={width * 0.5} />}
          <Utils.Text size='xsmall' font='medium' secondary>{publicKey}</Utils.Text>
          <Utils.VerticalSpacer size='medium' />
          <Utils.Row align='center' style={{minWidth: width * 0.6}}>
            <ActionButton onPress={this._copy}>
              <Feather
                name='clipboard'
                size={FontSize['small']}
                color={Colors.primaryText}
              />
            </ActionButton>
            <Utils.HorizontalSpacer />
            <Share WrapperButton={ActionButton} />
          </Utils.Row>
        </Utils.Content>
        <Toast
          ref='toast'
          position='center'
          fadeInDuration={750}
          fadeOutDuration={1000}
          opacity={0.8}
        />
      </KeyboardScreen>
    )
  }
}

export default withContext(ReceiveScreen)
