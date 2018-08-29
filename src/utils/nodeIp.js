import { AsyncStorage } from 'react-native'
import { logSentry } from '../utils/sentryUtils'

class NodeIp {
  constructor () {
    this.nodeIp = '54.236.37.243:50051'
    this.nodeSolidityIp = '54.236.37.243:50052'
    this.nodeIpTestnet = '18.216.36.219:50051'
    this.nodeSolidityIpTestnet = '18.204.117.182:50051 '
  }

  getStorageNodes = async () => {
    try {
      const [nodeIp, nodeSolidityIp, nodeType] = await Promise.all([
        AsyncStorage.getItem('NODE_IP'),
        AsyncStorage.getItem('NODE_SOLIDITY_IP'),
        AsyncStorage.getItem('NODE_TYPE')
      ])
      if (nodeIp && nodeSolidityIp) return { nodeIp, nodeSolidityIp, isTestnet: nodeType === 'test' }
      else return null
    } catch (error) {
      logSentry(error, 'NodeIp - getStorage')
      return { nodeIp: this.nodeIp, nodeSolidityIp: this.nodeSolidityIp, isTestnet: false }
    }
  }

  async initNodes () {
    try {
      const nodes = await this.getStorageNodes()
      if (nodes) return
      const setSwitchTestnet = () => AsyncStorage.setItem('NODE_TYPE', 'main')
      const setNode = () => AsyncStorage.setItem('NODE_IP', this.nodeIp)
      const setSolidityNode = () =>
        AsyncStorage.setItem('NODE_SOLIDITY_IP', this.nodeSolidityIp)
      await Promise.all([setNode(), setSolidityNode(), setSwitchTestnet()])
    } catch (error) {
      logSentry(error, 'NodeIp - init')
    }
  }

  async setNodeIp (type, nodeip) {
    // Types
    // 'main' or 'solidity'
    try {
      const item = type === 'solidity' ? 'NODE_SOLIDITY_IP' : 'NODE_IP'
      await AsyncStorage.setItem(item, nodeip)
    } catch (error) {
      logSentry(error, 'NodeIp - setNodeIp')
    }
  }
  async setAllNodesIp (mainnode, soliditynode) {
    try {
      const setNode = () => AsyncStorage.setItem('NODE_IP', mainnode)
      const setSolidityNode = () =>
        AsyncStorage.setItem('NODE_SOLIDITY_IP', soliditynode)
      await Promise.all([setNode(), setSolidityNode()])
    } catch (error) {
      logSentry(error, 'NodeIp - setall')
    }
  }

  async getAllNodesIp () {
    const defaultNodes = { nodeIp: this.nodeIp, nodeSolidityIp: this.nodeSolidityIp, isTestnet: false }
    try {
      const nodes = await this.getStorageNodes()
      return nodes || defaultNodes
    } catch (error) {
      logSentry(error, 'NodeIp - getall')
      return defaultNodes
    }
  }

  async setToTestnet () {
    try {
      const setNode = () => AsyncStorage.setItem('NODE_IP', this.nodeIpTestnet)
      const setSolidityNode = () =>
        AsyncStorage.setItem('NODE_SOLIDITY_IP', this.nodeSolidityIpTestnet)
      await Promise.all([setNode(), setSolidityNode()])
    } catch (error) {
      logSentry(error, 'NodeIp - setTestnet')
    }
  }

  async resetNodesIp (type) {
    // Types
    // 'main' or 'solidity'
    try {
      const item = type === 'solidity' ? 'NODE_SOLIDITY_IP' : 'NODE_IP'
      const newIp = type === 'solidity' ? this.nodeSolidityIp : this.nodeIp
      await AsyncStorage.setItem(item, newIp)
    } catch (error) {
      logSentry(error, 'NodeIp - reset')
    }
  }

  async switchTestnet (switchValue) {
    // Node Types
    // 'main' for main net  or 'test'test net
    try {
      if (switchValue) {
        await this.setToTestnet()
      } else {
        await Promise.all([this.resetNodesIp('main'), this.resetNodesIp('solidity')])
      }
      const type = switchValue ? 'test' : 'main'
      await AsyncStorage.setItem('NODE_TYPE', type)
    } catch (error) {
      logSentry(error, 'NodeIp - switch')
    }
  }
}

export default new NodeIp()
