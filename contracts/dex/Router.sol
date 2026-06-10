// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Interfaces.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title  Router
 * @notice Thin executor — owns no policy. All fee decisions are delegated to
 *         Treasury at call time. Upgrade via UUPS; policy changes via Treasury.
 *
 * Fee model (all values live in Treasury, readable via getFeeSchedule):
 *   AMM fee   — 0.30% baked into HomesteadLibrary quote math (constant)
 *   Entry fee — dexEntryFeeBps  → Treasury  (on ETH → Token)
 *   Exit fee  — dexExitFeeBps   total (on Token → ETH), split:
 *                 lpRewardFeeBps  → exit pair (accrues to LP holders)
 *                 remainder       → Treasury
 */
contract Router is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    address public factory;
    address public WETH;
    address public treasury;

    // Mirrors the 9970/10000 constant in HomesteadLibrary — exposed for UI
    uint256 public constant AMM_FEE_BPS = 30;
    uint256 public constant VERSION     = 1;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'Router: EXPIRED');
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _factory,
        address _WETH,
        address _treasury,
        address _owner
    ) external initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        factory  = _factory;
        WETH     = _WETH;
        treasury = _treasury;
    }

    receive() external payable {
        // Only WETH may push ETH to this contract (via withdraw during swaps)
        assert(msg.sender == WETH);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // =========================================================================
    // FEE SCHEDULE — single call, all values from Treasury + AMM constant
    // =========================================================================

    struct FeeSchedule {
        uint256 ammFeeBps;     // AMM pair fee — baked into every quote (constant 30)
        uint256 entryFeeBps;   // platform fee on ETH → Token
        uint256 exitFeeBps;    // total platform fee on Token → ETH
        uint256 lpRewardBps;   // LP reward share of exitFeeBps → exit pair
        uint256 treasuryBps;   // Treasury share of exitFeeBps (exitFeeBps - lpRewardBps)
    }

    function getFeeSchedule() external view returns (FeeSchedule memory s) {
        s.ammFeeBps   = AMM_FEE_BPS;
        s.entryFeeBps = ITreasury(treasury).dexEntryFeeBps();
        s.exitFeeBps  = ITreasury(treasury).dexExitFeeBps();
        s.lpRewardBps = ITreasury(treasury).lpShareBps();
        s.treasuryBps = s.exitFeeBps > s.lpRewardBps ? s.exitFeeBps - s.lpRewardBps : 0;
    }

    // =========================================================================
    // ENTRY — ETH → Token
    // =========================================================================

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WETH, 'Router: INVALID_PATH');

        // Ask Treasury for current entry fee; deduct before quote so user
        // receives exactly what the quote says
        uint256 entryFeeBps = ITreasury(treasury).dexEntryFeeBps();
        uint256 entryFee    = (msg.value * entryFeeBps) / 10000;
        uint256 swapValue   = msg.value - entryFee;

        amounts = HomesteadLibrary.getAmountsOut(factory, swapValue, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'Router: INSUFFICIENT_OUTPUT_AMOUNT');

        IWETH(WETH).deposit{value: swapValue}();
        address firstPair = IFactory(factory).getPair(path[0], path[1]);
        assert(IWETH(WETH).transfer(firstPair, amounts[0]));
        _swap(amounts, path, to);

        if (entryFee > 0) {
            (bool ok,) = treasury.call{value: entryFee}("");
            require(ok, 'Router: ENTRY_FEE_FAILED');
        }
    }

    // =========================================================================
    // EXIT — Token → ETH
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
        _swap(amounts, path, address(this));

        uint256 ethOut      = amounts[amounts.length - 1];
        IWETH(WETH).withdraw(ethOut);

        // All fee policy lives in Treasury — read at execution time
        uint256 exitFeeBps  = ITreasury(treasury).dexExitFeeBps();
        uint256 lpBps       = ITreasury(treasury).lpShareBps();
        uint256 totalFee    = (ethOut * exitFeeBps) / 10000;
        uint256 lpReward    = (ethOut * lpBps)      / 10000;
        uint256 treasuryFee = totalFee > lpReward ? totalFee - lpReward : 0;
        uint256 userOut     = ethOut - totalFee;

        if (lpReward > 0) {
            address exitPair = IFactory(factory).getPair(path[path.length - 2], path[path.length - 1]);
            (bool lpOk,) = exitPair.call{value: lpReward}("");
            require(lpOk, 'Router: LP_REWARD_FAILED');
        }

        if (treasuryFee > 0) {
            (bool feeOk,) = treasury.call{value: treasuryFee}("");
            require(feeOk, 'Router: FEE_TRANSFER_FAILED');
        }

        (bool ok,) = to.call{value: userOut}("");
        require(ok, 'Router: ETH_TRANSFER_FAILED');
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
            (bool ok,) = msg.sender.call{value: msg.value - amountETH}("");
            require(ok, 'Router: REFUND_FAILED');
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

        // Auto-claim accrued LP rewards before position is reduced
        IDEXPair(pair).claimRewards(msg.sender);

        IPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = IPair(pair).burn(address(this));

        (address token0,) = HomesteadLibrary.sortTokens(token, WETH);
        (amountToken, amountETH) = token == token0 ? (amount0, amount1) : (amount1, amount0);

        require(amountToken >= amountTokenMin, 'Router: INSUFFICIENT_TOKEN_AMOUNT');
        require(amountETH >= amountETHMin, 'Router: INSUFFICIENT_ETH_AMOUNT');

        IERC20(token).transfer(to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        (bool ok,) = to.call{value: amountETH}("");
        require(ok, 'Router: ETH_TRANSFER_FAILED');
    }

    // =========================================================================
    // QUOTE HELPERS
    // =========================================================================

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory)
    {
        return HomesteadLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external view returns (uint256[] memory)
    {
        return HomesteadLibrary.getAmountsIn(factory, amountOut, path);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), 'Router: ZERO_ADDRESS');
        treasury = _treasury;
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
