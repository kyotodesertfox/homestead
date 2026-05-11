// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev The "Dictionary" of your ecosystem.
 * These interfaces allow the Router and Factory to communicate.
 */

interface IFactory {
    function feeTo() external view returns (address);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1);
    function swap(uint amount0Out, uint amount1Out, address to) external;
    function burn(address to) external returns (uint amount0, uint amount1);
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
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
}

/**
 * @dev ArtLibrary: Handles the math for sorting tokens and finding pair addresses.
 * Note: The init code hash must match your DEXPair deployment for safety.
 */
library ArtLibrary {
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'ArtLibrary: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'ArtLibrary: ZERO_ADDRESS');
    }

    // Calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex'ff',
            factory,
            keccak256(abi.encodePacked(token0, token1)),
                                                                  hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // Standard Uniswap V2 Init Code Hash
        )))));
    }

    function getAmountsIn(address factory, uint amountOut, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, 'ArtLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            // Simplified Math for testing; real V2 math would be applied in the final DEX version
            amounts[i - 1] = amountOut + (amountOut / 100);
        }
    }
}
