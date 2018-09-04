import React from 'react'

import * as Elements from './elements'
import { Colors } from '../../components/DesignSystem'

const thousandSeparator = /(\d)(?=(\d{3})+(\s|$))/g

const formatText = (text, numbersOnly, onChangeText, type) => {
  if (numbersOnly) {
    if (type === 'int') {
      return onChangeText(text.replace(/[^0-9]/g, ''))
    } else {
      const decimal = text.replace(/[^0-9.]/g, '').split('.')
      if (decimal.length >= 2) {
        return onChangeText(`${decimal[0]}.${decimal[1].substr(0, 6)}`)
      } else {
        return onChangeText(text.replace(/[^0-9.]/g, ''))
      }
    }
  }
  return onChangeText(text)
}

const formatValue = (value, numbersOnly, type) => {
  if (numbersOnly) {
    const valueString = value.toString()
    if (type === 'int') {
      return valueString.replace(thousandSeparator, '$1,')
    } else {
      const decimal = valueString.split('.')
      if (decimal.length >= 2) {
        return `${decimal[0].replace(thousandSeparator, '$1,')}.${decimal[1].substr(0, 6)}`
      } else {
        return valueString.replace(thousandSeparator, '$1,')
      }
    }
  } else {
    return value
  }
}

const Input = ({
  innerRef,
  label,
  labelWrapperColor,
  leftContent,
  rightContent,
  onChangeText,
  value,
  numbersOnly,
  type,
  editable,
  placeholder,
  ...props
}) => (
  <Elements.Wrapper>
    <Elements.LabelWrapper color={labelWrapperColor}>
      <Elements.Label>{label}</Elements.Label>
    </Elements.LabelWrapper>
    <Elements.InputWrapper>
      {leftContent && leftContent()}
      {/* Do not change the order of props in the component
        below. It needs to be first so that keyboardType comes
        before autoCapitalize or it won't show with the decimal
        button.  */}
      <Elements.TextInput
        {...props}
        innerRef={innerRef}
        value={formatValue(value, numbersOnly, type)}
        autoCorrect={false}
        autoCapitalize='none'
        underlineColorAndroid='transparent'
        onChangeText={text => formatText(text, numbersOnly, onChangeText, type)}
        placeholderTextColor={placeholder ? props.placeholderTextColor : Colors.background}
        placeholder={placeholder || 'hidden'}
        editable={editable}
      />
      {rightContent && rightContent()}
    </Elements.InputWrapper>
  </Elements.Wrapper>
)

Input.defaultProps = {
  labelWrapperColor: '#191A2A',
  placeholderTextColor: '#66688F',
  returnKeyType: 'send',
  numbersOnly: false,
  editable: true,
  showPlaceholder: true
}

export default Input
