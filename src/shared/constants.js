const constants = {
 S3_BUCKET: 'gaseth',
 ETHERSCAN_GAS_API_URL: `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`,
 BLOCKNATIVE_GAS_API_URL: "https://api.blocknative.com/gasprices/blockprices",
}
module.exports = constants;
