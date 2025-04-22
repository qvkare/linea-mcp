# Changelog

All notable changes to the Linea MCP project will be documented in this file.

## [0.4.1]

### Added
- Added Linea Native Bridge configuration for mainnet and testnet.
- Introduced CCTP token messenger for USDC bridging.
- Implemented claimFunds function for claiming bridged assets.
- Updated schemas to include ClaimFundsSchema for validation.
- Enhanced bridge status checking with message status retrieval.
- Improved error handling and logging for better debugging.

### Fixed
- Fixed type conversion issues in bridge handlers for fee and value parameters.
- Resolved TypeScript errors related to number vs bigint type conversions.

## [0.4.0] 

### Added
- Integrated Linea Token API to provide new token discovery and information tools:
    - `tokens_listAvailableTokens`: List tokens on Linea with search and pagination.
    - `tokens_getTokenInfo`: Get detailed token info including name, symbol, decimals, logo, and price.
    - `tokens_getTokenPriceHistory`: Get historical hourly price data for a token.
- Used `axios` for reliable HTTP requests to the Linea Token API.
- Added Zod schemas for validating Linea Token API responses.

### Changed
- Updated `README.md` to reflect new token capabilities.
- Refined error handling for API requests and token operations.

### Fixed
- Resolved various TypeScript linter errors related to module resolution, typings, and unused imports.
- Corrected type mismatches in function signatures for token handlers.
- Ensured `console` and `URLSearchParams` are recognized by adding "dom" to `tsconfig.json` libs.

## [0.3.0]

### Added
- SyncSwap staking/yield tools for DeFi interactions
- Transaction status tool (`transactions_getStatus`)
- Gas estimation and confirmation step for transactions

### Changed
- Migrated from ethers.js v5 to viem for all blockchain interactions
- Fixed build and lint errors related to the viem migration

### Documentation
- Added .env wallet private key documentation
