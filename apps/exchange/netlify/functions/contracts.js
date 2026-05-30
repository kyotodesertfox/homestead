exports.handler = async () => {
  const addresses = {
    WETH:           process.env.VITE_WETH,
    BEER_TOKEN:     process.env.VITE_BEER_TOKEN,
    BEERNFT:        process.env.VITE_BEER_NFT,
    ROUTER:         process.env.VITE_ROUTER,
    FACTORY:        process.env.VITE_FACTORY,
    MARKETPLACE:    process.env.VITE_MARKETPLACE,
    TREASURY:       process.env.VITE_TREASURY,
    BEER_WETH_PAIR: process.env.VITE_BEER_WETH_PAIR,
    TOKEN_DEPLOYER: process.env.VITE_TOKEN_DEPLOYER,
    NFT_DEPLOYER:   process.env.VITE_NFT_DEPLOYER,
    STK_HOMESTEAD:  process.env.VITE_STK_HOMESTEAD,
    EGG_TOKEN:      process.env.VITE_EGG_TOKEN,
    EGGNFT:         process.env.VITE_EGG_NFT,
    EGG_WETH_PAIR:  process.env.VITE_EGG_WETH_PAIR,
    PRICE_EVIDENCE: process.env.VITE_PRICE_EVIDENCE,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(addresses),
  };
};
