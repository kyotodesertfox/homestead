// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Interfaces.sol";

contract Router {

    address public immutable factory;
    address public immutable WETH;
    address public immutable treasury;

    // Platform fees — all route to Treasury
    uint256 public entryFeeBps = 0;    // ETH → token: free (upgradeable via new Router deployment)
    uint256 public exitFeeBps  = 500;  // token → ETH: 5%

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'Router: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH, address _treasury) {
        factory  = _factory;
        WETH     = _WETH;
        treasury = _treasury;
    }

    receive() external payable {
        assert(msg.sender == WETH);
    }

    // =========================================================================
    // ENTRY — ETH → Token (free platform fee)
    // =========================================================================

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WETH, 'Router: INVALID_PATH');

        amounts = HomesteadLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'Router: INSUFFICIENT_OUTPUT_AMOUNT');

        IWETH(WETH).deposit{value: amounts[0]}();
        address firstPair = IFactory(factory).getPair(path[0], path[1]);
        assert(IWETH(WETH).transfer(firstPair, amounts[0]));
        _swap(amounts, path, to);
    }

    // =========================================================================
    // EXIT — Token → ETH (5% platform fee → Treasury)
    // =========================================================================

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WETH, 'Router: INVALID_PATH');

        amounts = HomesteadLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'Router: INSUFFICIENT_OUTPUT_AMOUNT');

        address firstPair = IFactory(factory).getPair(path[0], path[1]);
        IERC20(path[0]).transferFrom(msg.sender, firstPair, amounts[0]);

        // Router receives WETH, unwraps, deducts platform fee, forwards remainder
        _swap(amounts, path, address(this));

        uint256 ethOut = amounts[amounts.length - 1];
        IWETH(WETH).withdraw(ethOut);

        uint256 platformFee = (ethOut * exitFeeBps) / 10000;
        uint256 userProceeds = ethOut - platformFee;

        if (platformFee > 0) {
            (bool feeSuccess,) = treasury.call{value: platformFee}("");
            require(feeSuccess, 'Router: FEE_TRANSFER_FAILED');
        }

        (bool success,) = to.call{value: userProceeds}("");
        require(success, 'Router: ETH_TRANSFER_FAILED');
    }

    // =========================================================================
    // LIQUIDITY
    // =========================================================================

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        address pair = IFactory(factory).getPair(token, WETH);
        require(pair != address(0), 'Router: PAIR_NOT_FOUND');

        (uint256 reserveToken, uint256 reserveETH) = HomesteadLibrary.getReserves(factory, token, WETH);

        if (reserveToken == 0 && reserveETH == 0) {
            (amountToken, amountETH) = (amountTokenDesired, msg.value);
        } else {
            uint256 amountETHOptimal = (amountTokenDesired * reserveETH) / reserveToken;
            if (amountETHOptimal <= msg.value) {
                require(amountETHOptimal >= amountETHMin, 'Router: INSUFFICIENT_ETH_AMOUNT');
                (amountToken, amountETH) = (amountTokenDesired, amountETHOptimal);
            } else {
                uint256 amountTokenOptimal = (msg.value * reserveToken) / reserveETH;
                require(amountTokenOptimal >= amountTokenMin, 'Router: INSUFFICIENT_TOKEN_AMOUNT');
                (amountToken, amountETH) = (amountTokenOptimal, msg.value);
            }
        }

        IERC20(token).transferFrom(msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        liquidity = IPair(pair).mint(to);

        if (msg.value > amountETH) {
            (bool success,) = msg.sender.call{value: msg.value - amountETH}("");
            require(success, 'Router: REFUND_FAILED');
        }
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountToken, uint256 amountETH) {
        address pair = IFactory(factory).getPair(token, WETH);
        require(pair != address(0), 'Router: PAIR_NOT_FOUND');

        IPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = IPair(pair).burn(address(this));

        (address token0,) = HomesteadLibrary.sortTokens(token, WETH);
        (amountToken, amountETH) = token == token0 ? (amount0, amount1) : (amount1, amount0);

        require(amountToken >= amountTokenMin, 'Router: INSUFFICIENT_TOKEN_AMOUNT');
        require(amountETH >= amountETHMin, 'Router: INSUFFICIENT_ETH_AMOUNT');

        IERC20(token).transfer(to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        (bool success,) = to.call{value: amountETH}("");
        require(success, 'Router: ETH_TRANSFER_FAILED');
    }

    // =========================================================================
    // QUOTE HELPERS
    // =========================================================================

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts)
    {
        return HomesteadLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external view returns (uint256[] memory amounts)
    {
        return HomesteadLibrary.getAmountsIn(factory, amountOut, path);
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = HomesteadLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? IFactory(factory).getPair(output, path[i + 2])
                : _to;
            IPair(IFactory(factory).getPair(input, output)).swap(amount0Out, amount1Out, to);
        }
    }
}
