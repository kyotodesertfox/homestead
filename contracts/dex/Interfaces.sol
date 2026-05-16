// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =========================================================================
// DEPLOYER INTERFACES — Trust hierarchy verification
// =========================================================================

interface ITokenDeployer {
    function isRegistered(address token) external view returns (bool);
    function getAllTokens() external view returns (address[] memory);
}

interface INFTDeployer {
    function isRegistered(address nftContract) external view returns (bool);
    function getAllContracts() external view returns (address[] memory);
}

// =========================================================================
// DEX INTERFACES
// =========================================================================

interface IFactory {
    function feeTo() external view returns (address);
    function tokenDeployer() external view returns (address);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function sync() external;
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function withdraw(uint256 value) external;
}

interface INFTTemplate {
    function redeemed(uint256 tokenId) external view returns (bool);
    function redeem(uint256 tokenId) external;
    function markRedeemed(uint256 tokenId) external;
    function mintBatch(address to, string[] calldata cids) external returns (uint256 startTokenId);
}

interface ITreasury {
    function dexEntryFeeBps() external view returns (uint256);
    function dexExitFeeBps() external view returns (uint256);
    function lpRewardFeeBps() external view returns (uint256);
    function marketplaceFeeBps() external view returns (uint256);
    function trustedRelay() external view returns (address);
    // Called by Marketplace when a brewer's listing is created
    function markListed(uint256 batchId, uint256 listingId) external;
    // Called by Marketplace when a physical bottle is redeemed
    function onRedeem(uint256 batchId) external;
    // Called by Marketplace.createListing to validate permissionless listings
    function validateListingCaller(uint256 batchId, address caller, address nftContract) external view returns (bool);
    // Called by DEXPair when an LP holder claims rewards
    function receiveAndMintLPReward(address rewardToken, address to) external payable;
}

interface IDEXPair {
    function setRewardsTreasury(address _treasury) external;
    function claimRewards(address account) external;
    function earned(address account) external view returns (uint256);
}

// =========================================================================
// HOMESTEAD LIBRARY
// Pair addresses are looked up from the Factory (not computed via CREATE2)
// because pairs are deployed as BeaconProxy contracts using regular CREATE.
// =========================================================================

library HomesteadLibrary {

    function sortTokens(address tokenA, address tokenB)
        internal pure returns (address token0, address token1)
    {
        require(tokenA != tokenB, 'Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Library: ZERO_ADDRESS');
    }

    function getReserves(address factory, address tokenA, address tokenB)
        internal view returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0,) = sortTokens(tokenA, tokenB);
        address pair = IFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'Library: PAIR_NOT_FOUND');
        (uint112 reserve0, uint112 reserve1,) = IPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));
    }

    // Given an exact input, calculate maximum output (0.3% swap fee)
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal pure returns (uint256 amountOut)
    {
        require(amountIn > 0, 'Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'Library: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * 9970;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // Given an exact output, calculate minimum input required (0.3% swap fee)
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal pure returns (uint256 amountIn)
    {
        require(amountOut > 0, 'Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'Library: INSUFFICIENT_LIQUIDITY');
        uint256 numerator = reserveIn * amountOut * 10000;
        uint256 denominator = (reserveOut - amountOut) * 9970;
        amountIn = (numerator / denominator) + 1;
    }

    function getAmountsOut(address factory, uint256 amountIn, address[] memory path)
        internal view returns (uint256[] memory amounts)
    {
        require(path.length >= 2, 'Library: INVALID_PATH');
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
        internal view returns (uint256[] memory amounts)
    {
        require(path.length >= 2, 'Library: INVALID_PATH');
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}
