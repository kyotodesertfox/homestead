// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEXPair is Initializable, ReentrancyGuard, ERC20Upgradeable {

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
    uint32  private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast;

    uint256[42] private __gap;

    // =========================================================================

    uint256 private constant MINIMUM_LIQUIDITY   = 1000;
    uint256 private constant GAS_GUARD_MULTIPLE  = 3;
    uint256 private constant GAS_GUARD_UNITS     = 150000;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _token0, address _token1, address _weth) external initializer {
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

    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, 'DEXPair: OVERFLOW');

        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed    = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint256(uint224((_reserve1 << 112) / _reserve0)) * timeElapsed;
            price1CumulativeLast += uint256(uint224((_reserve0 << 112) / _reserve1)) * timeElapsed;
        }

        reserve0           = uint112(balance0);
        reserve1           = uint112(balance1);
        blockTimestampLast = blockTimestamp;

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

        _update(balance0, balance1, _reserve0, _reserve1);
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

        _update(balance0, balance1, _reserve0, _reserve1);
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

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // =========================================================================
    // SYNC — Force reserves to match actual balances
    // =========================================================================

    function sync() external nonReentrant {
        _update(
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
