import { McpHandler } from '@mcp-sdk';


const handler = McpHandler("./app/api/mcp/devbox.json","http://localhost:3000");
export { handler as GET, handler as POST, handler as DELETE };