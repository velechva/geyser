var TokenPool = artifacts.require('TokenPool')
var TokenGeyser = artifacts.require('TokenGeyser')

module.exports = function(deployer) {
    deployer.deploy(TokenPool)
    deployer.deploy(TokenGeyser)
}