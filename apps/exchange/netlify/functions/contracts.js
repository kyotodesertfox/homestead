const fs   = require('fs');
const path = require('path');

function parseEnv(filePath) {
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(l => l.includes('='))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  );
}

exports.handler = async () => {
  const env = parseEnv(path.join(__dirname, 'addresses.env'));

  return {
    statusCode: 200,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      WETH:           env.VITE_WETH,
      BEER_TOKEN:     env.VITE_BEER_TOKEN,
      BEERNFT:        env.VITE_BEER_NFT,
      ROUTER:         env.VITE_ROUTER,
      FACTORY:        env.VITE_FACTORY,
      MARKETPLACE:    env.VITE_MARKETPLACE,
      TREASURY:       env.VITE_TREASURY,
      BEER_WETH_PAIR: env.VITE_BEER_WETH_PAIR,
      TOKEN_DEPLOYER: env.VITE_TOKEN_DEPLOYER,
      NFT_DEPLOYER:   env.VITE_NFT_DEPLOYER,
      STK_HOMESTEAD:  env.VITE_STK_HOMESTEAD,
      EGG_TOKEN:      env.VITE_EGG_TOKEN,
      EGGNFT:         env.VITE_EGG_NFT,
      EGG_WETH_PAIR:  env.VITE_EGG_WETH_PAIR,
      PRICE_EVIDENCE: env.VITE_PRICE_EVIDENCE,
    }),
  };
};
