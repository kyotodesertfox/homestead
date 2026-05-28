// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITreasury {
    function receiveAndMintLPReward(address rewardToken, address to) external payable;
}

contract DEXPair is Initializable, ReentrancyGuardUpgradeable, ERC20Upgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public factory;
    address public token0;
    address public token1;
    address public weth;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;     // slot reserved — was Uniswap V2 TWAP timestamp

    uint256 public price0CumulativeLast;    // slot reserved — was TWAP price accumulator (token0)
    uint256 public price1CumulativeLast;    // slot reserved — was TWAP price accumulator (token1)
    uint256 public kLast;                   // slot reserved — was Uniswap V2 protocol fee tracker

    // ---- LP REWARDS (added in upgrade) ----
    address public rewardsTreasury;
    uint256 public rewardPerTokenStored;                           // scaled by 1e18
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public pendingRewards;             // accrued ETH per LP holder

    uint256[38] private __gap;

    // =========================================================================

    uint256 private constant MINIMUM_LIQUIDITY   = 1000;
    uint256 private constant GAS_GUARD_MULTIPLE  = 3;
    uint256 private constant GAS_GUARD_UNITS     = 150000;
    uint256 private constant SWAP_FEE_BPS        = 30;

    function swapFeeBps() external pure returns (uint256) { return SWAP_FEE_BPS; }

    // The non-WETH token in this pair — what LP holders earn as rewards
    function rewardToken() public view returns (address) {
        return token0 == weth ? token1 : token0;
    }

    // =========================================================================
    // RECEIVE — reward ETH sent by Router on exit swaps
    // =========================================================================

    receive() external payable {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply > 0) {
            rewardPerTokenStored += (msg.value * 1e18) / _totalSupply;
            emit RewardAdded(msg.value, rewardPerTokenStored);
        }
        // if no LPs yet, ETH accrues in contract until first LP claims or burns
    }

    // =========================================================================
    // LP REWARDS
    // =========================================================================

    function setRewardsTreasury(address _treasury) external {
        require(msg.sender == factory, 'DEXPair: FORBIDDEN');
        rewardsTreasury = _treasury;
    }

    function earned(address account) public view returns (uint256) {
        return (balanceOf(account) * (rewardPerTokenStored - userRewardPerTokenPaid[account])) / 1e18;
    }

    function _updateReward(address account) internal {
        if (account != address(0)) {
            pendingRewards[account] += earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    function _claim(address account) internal {
        uint256 reward = pendingRewards[account];
        if (reward > 0 && rewardsTreasury != address(0)) {
            pendingRewards[account] = 0;
            ITreasury(rewardsTreasury).receiveAndMintLPReward{value: reward}(rewardToken(), account);
            emit RewardClaimed(account, reward);
        }
    }

    function claimRewards(address account) external nonReentrant {
        _updateReward(account);
        _claim(account);
    }

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);
    event RewardAdded(uint256 amount, uint256 rewardPerTokenStored);
    event RewardClaimed(address indexed account, uint256 ethForwarded);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _token0, address _token1, address _weth) external initializer {
        __ReentrancyGuard_init();
        __ERC20_init("Homestead LP", "HLP");
        factory = msg.sender;
        token0  = _token0;
        token1  = _token1;
        weth    = _weth;
    }

    // =========================================================================
    // RESERVES
    // =========================================================================

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    // OZ ERC20Upgradeable v5 hook — fires on every LP token mint, burn, and transfer.
    // Settle rewards for both parties before balances change so earned() is correct.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && from != address(this)) _updateReward(from);
        if (to   != address(0) && to   != address(this)) _updateReward(to);
        super._update(from, to, value);
    }

    function _syncReserves(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, 'DEXPair: OVERFLOW');
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }

    // =========================================================================
    // MINT — Add liquidity, receive LP tokens
    // Caller must transfer token0 and token1 to this contract before calling.
    // =========================================================================

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = getReserves();

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0  = balance0 - _reserve0;
        uint256 amount1  = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdEaD), MINIMUM_LIQUIDITY);
        } else {
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        require(liquidity > 0, 'DEXPair: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _syncReserves(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    // =========================================================================
    // BURN — Return LP tokens, receive underlying tokens
    // Caller must transfer LP tokens to this contract before calling.
    // =========================================================================

    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1) = getReserves();

        uint256 balance0  = IERC20(token0).balanceOf(address(this));
        uint256 balance1  = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, 'DEXPair: INSUFFICIENT_LIQUIDITY_BURNED');

        _burn(address(this), liquidity);
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        _syncReserves(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // =========================================================================
    // SWAP
    // Caller must transfer input tokens to this contract before calling.
    // Slippage protection is enforced by the Router (amountOutMin).
    // =========================================================================

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, 'DEXPair: INSUFFICIENT_OUTPUT_AMOUNT');

        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'DEXPair: INSUFFICIENT_LIQUIDITY');
        require(to != token0 && to != token1, 'DEXPair: INVALID_TO');

        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'DEXPair: INSUFFICIENT_INPUT_AMOUNT');

        // Gas guard: when WETH is one side of the pair, the 0.3% fee is measurable in ETH.
        // If fee < 3x gas cost the trade is economically net-negative for the protocol;
        // force it to fail rather than drain the Treasury on micro trades during congestion.
        // TOKEN/TOKEN pairs skip this check as their fee is not denominated in ETH.
        if (token0 == weth && amount0In > 0) {
            require(
                (amount0In * 30) / 10000 >= tx.gasprice * GAS_GUARD_UNITS * GAS_GUARD_MULTIPLE,
                'DEXPair: TRADE_TOO_SMALL'
            );
        } else if (token1 == weth && amount1In > 0) {
            require(
                (amount1In * 30) / 10000 >= tx.gasprice * GAS_GUARD_UNITS * GAS_GUARD_MULTIPLE,
                'DEXPair: TRADE_TOO_SMALL'
            );
        }

        // Constant product invariant check (0.3% swap fee)
        uint256 balance0Adjusted = (balance0 * 10000) - (amount0In * 30);
        uint256 balance1Adjusted = (balance1 * 10000) - (amount1In * 30);
        require(
            balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * uint256(_reserve1) * (10000**2),
            'DEXPair: INVARIANT'
        );

        _syncReserves(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // =========================================================================
    // SYNC — Force reserves to match actual balances
    // =========================================================================

    function sync() external nonReentrant {
        _syncReserves(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    // =========================================================================
    // MATH
    // =========================================================================

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}
