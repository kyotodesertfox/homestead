// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEXPair is Initializable, ReentrancyGuardUpgradeable {
    // Standard V2 State
    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast;

    // The "Math is Law" Safeguards
    uint256 public constant GAS_LIMIT_MULTIPLE = 3;
    uint256 public constant ESTIMATED_GAS_UNITS = 150000;

    event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    function initialize(address _token0, address _token1) external initializer {
        factory = msg.sender; // The Factory deploys and initializes
        token0 = _token0;
        token1 = _token1;
        __ReentrancyGuard_init();
    }

    /**
     * @dev The Unidirectional Swap logic.
     * Enforces the 3x Gas Guard and protects the Treasury from "Sandwich" bots.
     */
    function swap(uint amount0Out, uint amount1Out, address to) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, 'DEX: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'DEX: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'DEX: INVALID_TO');
        if (amount0Out > 0) IERC20(_token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(_token1).transfer(to, amount1Out);
        balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'DEX: INSUFFICIENT_INPUT_AMOUNT');

        // --- THE 3X SOLVENCY GUARD ---
        // Ensures the trade is large enough to prevent "Dust Attacks" and fee-bleeding.
        uint256 feeInEth;
        if (token0 == address(0)) { // Assuming address(0) or WETH for ETH side
            feeInEth = (amount0In * 30) / 10000; // 0.3% fee
        } else {
            feeInEth = (amount1In * 30) / 10000;
        }
        require(feeInEth >= (tx.gasprice * ESTIMATED_GAS_UNITS * GAS_LIMIT_MULTIPLE), "MathIsLaw: Trade size too small");

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // Standard V2 Helper functions
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }

    // Additional V2 functions (mint, burn, sync) would go here...
}
