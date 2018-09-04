import React from 'react'
import PropTypes from 'prop-types'

import {
  ContactsModalWrapper,
  ContactsModalCard,
  Title
} from '../ActionModal/elements'

import Modal from '../Modal'
import { Colors } from '../DesignSystem'
import { ErrorText, CancelWrapper } from '../AddressBook/AddressForm/elements'
import Input from '../Input'
import CancelButton from '../CancelButton'
import ButtonGradient from '../ButtonGradient'

const FormModal = ({
  title,
  inputLabel,
  error,
  inputValue,
  inputPlaceholder,
  onChangeText,
  buttonText,
  buttonDisabled,
  onButtonPress,
  visible,
  closeModal,
  animationType
}) => (
  <Modal
    modalOpened={visible}
    closeModal={closeModal}
    animationType={animationType}
    transparent
  >
    <ContactsModalWrapper>
      <ContactsModalCard>
        <Title>{title}</Title>
        <Input
          label={inputLabel}
          value={inputValue}
          onChangeText={text => onChangeText(text)}
          placeholder={inputPlaceholder}
          labelWrapperColor={Colors.dusk}
        />
        {error && (
          <React.Fragment>
            <ErrorText>
              {error}
            </ErrorText>
          </React.Fragment>
        )}
        <ButtonGradient
          text={buttonText}
          onPress={onButtonPress}
          disabled={buttonDisabled}
        />
        <CancelWrapper>
          <CancelButton onCancel={closeModal} />
        </CancelWrapper>
      </ContactsModalCard>
    </ContactsModalWrapper>
  </Modal>
)

FormModal.propTypes = {
  title: PropTypes.string.isRequired,
  error: PropTypes.string,
  inputLabel: PropTypes.string.isRequired,
  inputValue: PropTypes.string,
  inputPlaceholder: PropTypes.string,
  onChangeText: PropTypes.func,
  buttonText: PropTypes.string.isRequired,
  buttonDisabled: PropTypes.bool,
  onButtonPress: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
  animationType: PropTypes.string
}

FormModal.defaultProps = {
  onChangeText: () => {},
  animationType: 'slide',
  buttonDisabled: false,
  inputValue: '',
  error: null
}

export default FormModal
