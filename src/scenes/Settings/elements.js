import styled, { css } from 'styled-components'
import { Colors } from '../../components/DesignSystem'

const BaseText = css`
  color: ${Colors.secondaryText};
  margin-top: 25px;
  margin-bottom: 10px;
  margin-horizontal: 16px;
`
export const SectionTitle = styled.Text`
  ${BaseText}
`

export const MultiSelectColors = {
  text: Colors.primaryText,
  searchPlaceholderTextColor: Colors.primaryText,
  searchSelectionColor: Colors.primaryText,
  chipColor: Colors.primaryText,
  success: Colors.secondaryGradient[0],
  cancel: Colors.secondaryGradient[0],
  primary: Colors.secondaryGradient[0]
}

export const MultiSelectStyles = {
  container: {
    backgroundColor: Colors.lightBackground
  },
  separator: {
    backgroundColor: Colors.lightestBackground
  },
  searchBar: {
    backgroundColor: Colors.lightBackground
  }
}
