# Linea MCP Troubleshooting Guide

This document contains common issues and solutions you may encounter when setting up the Linea MCP server and integrating with MCP clients.

## MCP Client Integration Issues

### 1. "No tools available" Error

This error indicates that the MCP client cannot discover tools from the MCP server.

**Causes and Solutions:**

- **Configuration File Issues:**
  - Ensure your MCP configuration file is in the correct format
  - Check for JSON syntax errors
  - Verify there are no missing or incorrect parameters in the configuration file

- **Path Issues:**
  - Make sure Node.js is correctly installed and accessible in your PATH
  - Verify that the full path to your project is correct
  - Ensure the `cwd` parameter is set correctly

- **Recommended Solutions:**
  - Use direct Node.js execution instead of npm commands: `"command": "node", "args": ["/full/path/dist/index.js"]`
  - Try local installation instead of global package if installation fails
  - Run the MCP server in a separate terminal to check the output

### 2. "Client closed" Error

This error indicates that communication between the MCP client and the MCP server has been interrupted.

**Causes and Solutions:**

- **Communication Protocol Issues:**
  - Check server logs, especially for errors like "SyntaxError: Unexpected end of JSON input", which indicate stdio communication issues
  - npm commands can cause interference problems; use Node.js directly
  - Timeouts can occur for long-running operations

- **Environment Variables:**
  - Ensure environment variables are the same in both the `.env` file and MCP configuration
  - Check that all required environment variables are defined

- **Recommended Solutions:**
  - Use `"command": "node", "args": ["/full/path/dist/index.js"]` (instead of npm start)
  - Restart your MCP client after making changes
  - The MCP configuration should be in this format:
    ```json
    {
      "command": "node",
      "args": ["/full/path/dist/index.js"],
      "cwd": "/full/path/project-directory"
    }
    ```

### 3. JSON Parsing Errors

These errors typically indicate issues with the stdio communication protocol.

**Causes and Solutions:**

- These errors often occur when using npm scripts
- Use Node.js directly for more reliable communication
- Set the `cwd` property correctly

### 4. Connection Issues

**Causes and Solutions:**

- Verify that RPC endpoints are accessible
- Check firewall settings
- Ensure ports specified in the configuration aren't being used by other applications
- Verify that API keys are correct and active

## Troubleshooting Steps

1. **Manually Run the MCP Server:**
   ```bash
   cd /path/to/your/project
   node dist/index.js
   ```
   
2. **Examine Logs:**
   - Check for JSON parsing errors
   - Monitor tool discovery issues
   - Look for RPC connection errors

3. **Configuration Check:**
   - Verify all required environment variables are set
   - Check that paths are correct and absolute
   - Look for JSON syntax errors

## Solutions

Tested solutions for common problems:

1. **For "Client closed" or "No tools available":**
   ```json
   {
     "mcpServers": {
       "linea": {
         "command": "node",
         "args": ["/full/path/dist/index.js"],
         "cwd": "/full/path",
         "env": {
           "PORT": "3000",
           // other variables
         }
       }
     }
   }
   ```

2. **For npm startup issues:**
   - Use `node dist/index.js` instead of npm start

3. **If problems persist after restarting:**
   - Clear your MCP client's cache
   - Delete and reinstall the node modules folder: `rm -rf node_modules && npm install`
   - Synchronize the `.env` file and MCP configuration
   
## Client-Specific Issues

### Cursor

- Cursor may have issues capturing stderr
- Cursor sometimes requires restarting after MCP configuration changes
- If problems persist, try clearing the `%APPDATA%\Cursor\Cache` or `~/Library/Application Support/Cursor/Cache` directory

### Claude Desktop

- Ensure that Claude Desktop's MCP configuration file is a valid JSON file
- Claude may require additional parameters in the configuration

### Other MCP Clients

- Refer to each client's documentation
- As a general principle, direct Node.js execution is the most reliable method 