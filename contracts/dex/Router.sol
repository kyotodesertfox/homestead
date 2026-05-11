// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Interfaces.sol";

contract ArtRouter {
    address public immutable factory;
    address public immutable WETH;

    // Hardcoded Laws for Gas Efficiency
    uint256 public constant MIN_BURN_BIPS = 1000; // 10% Absolute Floor
    uint256 public constant FEE_BPS = 30;         // 0.3% DEX Fee

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'ArtRouter: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from WETH
    }

    /**
     # @dev The "Harvest" logic.
     * This is how you or the DAO claim the Generational Wealth.
     * It forces the 10% minimum burn of ART.
     */
    function harvest(address pair, uint256 lpAmount, uint256 burnRateBips) external {
        address treasury = IFactory(factory).feeTo();
        require(msg.sender == treasury, "ArtRouter: ONLY_TREASURY");
        require(burnRateBips >= MIN_BURN_BIPS, "ArtRouter: BELOW_BURN_FLOOR");

        // 1. Move LP from Treasury to Pair to trigger burn
        IERC20(pair).transferFrom(treasury, pair, lpAmount);
        (uint amount0, uint amount1) = IPair(pair).burn(address(this));

        // 2. Identify ART vs ETH (Assuming token0 is ART)
        uint256 amountToBurn = (amount0 * burnRateBips) / 10000;
        uint256 amountToKeep = amount0 - amountToBurn;

        // 3. The "God-Like" Move: Send to Dead Address
        IERC20(IPair(pair).token0()).transfer(address(0xdEaD), amountToBurn);

        // 4. The "Greedy" (Survival) Move: Send ART + ETH to Treasury
        IERC20(IPair(pair).token0()).transfer(treasury, amountToKeep);
        IWETH(WETH).withdraw(amount1);
        (bool success, ) = treasury.call{value: address(this).balance}("");
        require(success, "ArtRouter: ETH_TRANSFER_FAILED");
    }

    // --- Native ETH Swaps ---

    function swapETHForExactArt(uint amountOut, address[] calldata path, address to, uint deadline)
    external payable ensure(deadline) returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'ArtRouter: INVALID_PATH');
        amounts = ArtLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, 'ArtRouter: EXCESSIVE_INPUT_AMOUNT');

        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(ArtLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);

        // Refund dust ETH
        if (msg.value > amounts[0]) {
            (bool success,) = msg.sender.call{value: msg.value - amounts[0]}("");
            require(success, "ArtRouter: REFUND_FAILED");
        }
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = ArtLibrary.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? ArtLibrary.pairFor(factory, output, path[i + 2]) : _to;
            IPair(ArtLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to);
        }
    }
}
