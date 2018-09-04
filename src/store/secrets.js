import Realm from 'realm'
import sha256 from 'crypto-js/sha256'
import pbkdf2 from 'crypto-js/pbkdf2'
import hex from 'crypto-js/enc-hex'
import base64 from 'base-64'
import base64js from 'base64-js'
import DeviceInfo from 'react-native-device-info'

const UserSecretSchema = {
  name: 'UserSecret',
  primaryKey: 'address',
  properties: {
    confirmed: 'bool',
    address: 'string',
    password: 'string',
    mnemonic: 'string',
    privateKey: 'string',
    publicKey: 'string',
    name: 'string',
    alias: 'string',
    hide: 'bool'
  }
}

const getStore = async pin => {
  const idHex = hex.stringify(sha256(DeviceInfo.getDeviceId()))
  const pwdHex = hex.stringify(sha256(pin))

  const key = pbkdf2(pwdHex, idHex, { keySize: 512 / 64 })
  const keyEnc64 = base64.encode(key.toString())
  const keyBytes = base64js.toByteArray(keyEnc64)

  return Realm.open({
    path: `realm.userSecrets`,
    schema: [UserSecretSchema],
    encryptionKey: keyBytes,
    schemaVersion: 2,
    migration: (oldRealm, newRealm) => {
      const newObjects = newRealm.objects('UserSecret')
      if (newObjects.length) {
        if (oldRealm.schemaVersion < 1) {
          newObjects[0].name = 'Main Account'
          newObjects[0].alias = '@main_account'
        }
        if (oldRealm.schemaVersion < 2) {
          newObjects.forEach(object => {
            object.hide = false
          })
        }
      }
    }
  })
}

export default getStore
