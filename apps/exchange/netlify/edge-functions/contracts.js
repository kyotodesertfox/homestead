export default async () => {
  const addresses = {
    WETH:           Deno.env.get('VITE_WETH'),
    BEER_TOKEN:     Deno.env.get('VITE_BEER_TOKEN'),
    BEERNFT:        Deno.env.get('VITE_BEER_NFT'),
    ROUTER:         Deno.env.get('VITE_ROUTER'),
    FACTORY:        Deno.env.get('VITE_FACTORY'),
    MARKETPLACE:    Deno.env.get('VITE_MARKETPLACE'),
    TREASURY:       Deno.env.get('VITE_TREASURY'),
    BEER_WETH_PAIR: Deno.env.get('VITE_BEER_WETH_PAIR'),
    TOKEN_DEPLOYER: Deno.env.get('VITE_TOKEN_DEPLOYER'),
    NFT_DEPLOYER:   Deno.env.get('VITE_NFT_DEPLOYER'),
    STK_HOMESTEAD:  Deno.env.get('VITE_STK_HOMESTEAD'),
    EGG_TOKEN:      Deno.env.get('VITE_EGG_TOKEN'),
    EGGNFT:         Deno.env.get('VITE_EGG_NFT'),
    EGG_WETH_PAIR:  Deno.env.get('VITE_EGG_WETH_PAIR'),
    PRICE_EVIDENCE: Deno.env.get('VITE_PRICE_EVIDENCE'),
  };

  return new Response(JSON.stringify(addresses), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config = { path: '/api/contracts' };
