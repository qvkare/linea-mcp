#!/usr/bin/env node
import 'dotenv/config'; // Load .env file at the very beginning
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  // McpTool, // Removed import
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z, ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Define __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define McpTool type locally
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>; // Using Record<string, any> for simplicity
}

interface DiscoveredTool {
  mcpDefinition: McpTool;
  handler: (params: any) => Promise<any>;
  schema: ZodSchema<any>;
}

const discoveredTools = new Map<string, DiscoveredTool>();

// Discover tools dynamically (adapted from previous mcp.ts)
async function discoverTools() {
  discoveredTools.clear();
  const toolsDir = path.join(__dirname, 'tools');
  console.error(`Discovering tools in: ${toolsDir}`); // Log to stderr for debugging
  try {
    const categories = await fs.readdir(toolsDir, { withFileTypes: true });
    console.error(`Found ${categories.length} tool categories`);

    for (const category of categories) {
      if (category.isDirectory()) {
        const categoryName = category.name;
        // Use fileURLToPath for Windows compatibility with ESM
        const indexPath = path.join(toolsDir, categoryName, 'index.js');
        const indexUrl = `file://${indexPath.replace(/\\/g, '/')}`;
        console.error(`Attempting to import: ${indexUrl}`);

        try {
          const toolModule = await import(indexUrl);
          console.error(`Successfully imported module for ${categoryName}`);
          console.error(`Module exports: ${Object.keys(toolModule).join(', ')}`);
          
          const metadata = toolModule.toolMetadata || {};
          console.error(`Found metadata: ${Object.keys(metadata).join(', ')}`);

          for (const exportName in toolModule) {
            if (exportName.endsWith('Schema') && toolModule[exportName] instanceof ZodSchema) {
              const schema = toolModule[exportName] as ZodSchema<any>;
              
              // Get the handler name, removing the 'Schema' suffix
              const handlerNameBase = exportName.replace(/Schema$/, '');
              
              // Look for handler both with same case and with first letter lowercase
              const handlerNameExact = handlerNameBase;
              const handlerNameLowerFirst = handlerNameBase.charAt(0).toLowerCase() + handlerNameBase.slice(1);
              
              // Try to find the handler with either name
              let handler = toolModule[handlerNameExact];
              if (!handler) {
                handler = toolModule[handlerNameLowerFirst];
              }

              if (typeof handler === 'function') {
                // Find the correct metadata key (matching the actual handler name)
                const metadataKey = Object.keys(metadata).find(
                  key => key === handlerNameExact || key === handlerNameLowerFirst
                ) || handlerNameLowerFirst;
                
                const toolMeta = metadata[metadataKey] || {};
                const mcpToolName = `${categoryName}_${handlerNameLowerFirst}`;
                const description = toolMeta.description || `Tool for ${handlerNameLowerFirst} in ${categoryName}`;

                const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' });
                delete jsonSchema.$schema;
                delete jsonSchema.description;

                const mcpDefinition: McpTool = {
                  name: mcpToolName,
                  description: description,
                  inputSchema: jsonSchema as any,
                };

                discoveredTools.set(mcpToolName, {
                  mcpDefinition,
                  handler,
                  schema,
                });
                console.error(`Discovered tool: ${mcpToolName}`); // Log to stderr
              } else {
                console.error(`Found schema ${exportName} but no matching handler ${handlerNameExact} or ${handlerNameLowerFirst}`);
              }
            }
          }
        } catch (importError) {
          console.error(`Error importing tool module ${indexUrl}:`, importError);
        }
      }
    }
    console.error(`Tool discovery finished. Found ${discoveredTools.size} tools.`);
  } catch (error) {
    console.error('Error discovering tools:', error);
  }
}

class LineaMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'linea-mcp-server',
        version: '0.1.0', // Consider reading from package.json
      },
      {
        capabilities: {
          resources: {}, // No resources defined for now
          tools: {
            list: true, // Explicitly enable tools.list capability
            call: true  // Explicitly enable tools.call capability
          },
        },
      }
    );

    this.setupRequestHandlers();

    // Enhanced error handling for MCP server
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    };
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers() {
    // List Tools Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Ensure tools are discovered before listing
      if (discoveredTools.size === 0) {
        console.error('No tools discovered yet, attempting discovery again...');
        await discoverTools(); // Attempt discovery again if needed
      }
       if (discoveredTools.size === 0) {
         console.error('Tool discovery failed or yielded no tools.');
         // Optionally throw an error or return an empty list with a warning
       }
      const toolsList = Array.from(discoveredTools.values()).map(t => t.mcpDefinition);
      console.error(`Listing ${toolsList.length} tools.`); // Log to stderr
      return { tools: toolsList };
    });

    // Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.error(`Received call for tool: ${name} with args:`, args); // Log to stderr

      const tool = discoveredTools.get(name);

      if (!tool) {
        console.error(`Tool '${name}' not found.`);
        throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' not found`);
      }

      try {
        const validatedArgs = tool.schema.parse(args || {});
        console.error(`Executing handler for ${name} with validated args:`, validatedArgs);
        const result = await tool.handler(validatedArgs);
        console.error(`Handler for ${name} returned:`, result);

        return {
          content: [
            {
              type: 'text', // Changed from 'application/json' to 'text' for MCP compatibility
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        console.error(`Error executing tool '${name}':`, error);
        let errorMessage = 'Internal Server Error';
        let errorCode = ErrorCode.InternalError;
        let errorDetails: any = {};

        if (error instanceof z.ZodError) {
          errorCode = ErrorCode.InvalidParams;
          errorMessage = 'Invalid input parameters';
          errorDetails = error.format();
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Throwing an McpError is preferred for standard MCP error handling
        throw new McpError(errorCode, errorMessage, errorDetails);
      }
    });
  }

  async run() {
    try {
      // Discover tools before starting the server
      await discoverTools();

      const transport = new StdioServerTransport();
      console.error('Connecting MCP server with stdio transport...');
      
      await this.server.connect(transport);
      console.error('Linea MCP server running on stdio');
    } catch (error) {
      console.error('Error in MCP server run:', error);
      throw error;
    }
  }
}

// Start the server
const server = new LineaMcpServer();
server.run().catch(error => {
  console.error('Failed to start Linea MCP server:', error);
  process.exit(1);
});