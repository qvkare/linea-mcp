# Linea ENS Integration

This document provides detailed examples and explanations for using the Linea ENS features in the Linea MCP.

## Overview

Linea Name Service (ENS) provides human-readable names for blockchain addresses on the Linea network. Using Linea MCP, you can:

- Resolve ENS names to addresses (`name → address`)
- Lookup addresses to find ENS names (`address → name`)
- Check if ENS names are available for registration
- Retrieve ENS text records (email, website, social media, etc.)

## Tools Available

| Tool Name | Description |
|-----------|-------------|
| `linea_ens_resolveName` | Resolve an ENS name to an address |
| `linea_ens_lookupAddress` | Lookup ENS name for an address |
| `linea_ens_checkNameAvailability` | Check if an ENS name is available |
| `linea_ens_getRecords` | Get ENS records for a name |

## Using ENS Tools

### Resolving an ENS Name to an Address

Resolve a Linea ENS name to its corresponding Ethereum address:

```javascript
const result = await mcp.callTool('linea_ens_resolveName', {
  name: 'qvkare.linea.eth',
  testnet: false // Use true for Linea Sepolia testnet
});

// Example response:
// {
//   "success": true,
//   "name": "qvkare.linea.eth",
//   "address": "0x8dF3e4806A3320D2642b1F2835ADDA1A40719c4E",
//   "resolved": true,
//   "network": "mainnet"
// }
```

### Looking Up an ENS Name for an Address

Find an ENS name associated with a specific Ethereum address:

```javascript
const result = await mcp.callTool('linea_ens_lookupAddress', {
  address: '0x8dF3e4806A3320D2642b1F2835ADDA1A40719c4E',
  testnet: false
});

// Example response:
// {
//   "success": true,
//   "address": "0x8dF3e4806A3320D2642b1F2835ADDA1A40719c4E",
//   "name": "qvkare.linea.eth",
//   "resolved": true,
//   "network": "mainnet"
// }
```

### Checking ENS Name Availability

Verify if an ENS name is available for registration:

```javascript
const result = await mcp.callTool('linea_ens_checkNameAvailability', {
  name: 'randomname123456.linea',
  testnet: false
});

// Example response:
// {
//   "success": true,
//   "name": "randomname123456.linea",
//   "available": true,
//   "network": "mainnet"
// }
```

### Getting ENS Records

Retrieve ENS text records associated with a name:

```javascript
const result = await mcp.callTool('linea_ens_getRecords', {
  name: 'qvkare.linea.eth',
  records: ['email', 'url', 'twitter', 'description'],
  testnet: false
});

// Example response:
// {
//   "success": true,
//   "name": "qvkare.linea.eth",
//   "records": {
//     "email": null,
//     "url": null,
//     "twitter": null,
//     "description": null
//   },
//   "network": "mainnet"
// }
```

## ENS Name Formats on Linea

Linea ENS supports multiple formats for ENS names:

- Standard format: `name.linea.eth`
- Bare format: `name.linea`
- Ethereum format: `name.eth` (if controlled by Linea ENS)
- Subdomains: `subdomain.name.linea.eth`

When using the ENS tools, it's recommended to use the full format (`name.linea.eth`) for the most reliable results.

## Network Support

All ENS tools support both:

- Linea Mainnet (default): When `testnet: false` or omitted
- Linea Sepolia Testnet: When `testnet: true`

## Integration with Viem

Under the hood, Linea MCP uses the [viem](https://github.com/wevm/viem) library for ENS resolution. The ENS contracts on Linea have been integrated into viem as of April 2024.

## Common Usage Examples

### Example 1: Displaying a User's ENS Name Instead of Address

```javascript
const address = '0x8dF3e4806A3320D2642b1F2835ADDA1A40719c4E';
const result = await mcp.callTool('linea_ens_lookupAddress', { address });

// Display user-friendly name when available
const displayName = result.name || address.substring(0, 6) + '...' + address.substring(address.length - 4);
console.log(`Hello, ${displayName}!`);
```

### Example 2: Validating a Transaction Recipient

```javascript
const recipient = 'qvkare.linea.eth';
const result = await mcp.callTool('linea_ens_resolveName', { name: recipient });

if (result.resolved) {
  // Proceed with transaction to the resolved address
  console.log(`Sending transaction to ${result.address}`);
} else {
  console.error(`Could not resolve name: ${recipient}`);
}
```

### Example 3: Checking Name Availability Before Registration

```javascript
const nameToRegister = 'mynewname.linea';
const result = await mcp.callTool('linea_ens_checkNameAvailability', { name: nameToRegister });

if (result.available) {
  console.log(`${nameToRegister} is available for registration!`);
} else {
  console.log(`${nameToRegister} is already taken.`);
}
```

## Additional Resources

- [Linea Name Service Official Website](https://names.linea.build)
- [Linea ENS Documentation](https://support.linea.build/explore/ens)
- [Viem Documentation](https://viem.sh) 