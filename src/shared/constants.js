const constants = {
 S3_BUCKET: 'gaseth',
 GAS_API_URL: `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`,
}
module.exports = constants;
