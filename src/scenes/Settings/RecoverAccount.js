import React, { Component } from 'react'
import SectionedMultiSelect from 'react-native-sectioned-multi-select'

// Design
import { MultiSelectColors, MultiSelectStyles } from './elements'

// Utils
import tl from '../../utils/i18n'

class RecoverAccount extends Component {
    state ={
      accountsSelected: []
    }
    _onConfirm =() => {
      this.props.onUnhide(this.state.accountsSelected)
      this.setState({accountsSelected: []})
    }
    render () {
      const { accountsSelected } = this.state
      const { hiddenAccounts, renderNoResults } = this.props
      return (
        <SectionedMultiSelect
          ref={ref => { this.innerComponent = ref }}
          items={hiddenAccounts}
          uniqueKey='address'
          onSelectedItemsChange={(selected) => { this.setState({ accountsSelected: selected }) }}
          selectedItems={accountsSelected}
          onConfirm={this._onConfirm}
          showChips={false}
          showCancelButton
          hideSelect
          searchPlaceholderText={tl.t('settings.accounts.search')}
          confirmText={tl.t('restore').toUpperCase()}
          noResultsComponent={renderNoResults()}
          colors={MultiSelectColors}
          styles={MultiSelectStyles}
        />
      )
    }
}

export default RecoverAccount
