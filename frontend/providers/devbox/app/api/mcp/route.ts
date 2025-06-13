import { McpHandler } from '@mcp-sdk';


const handler = McpHandler("./app/api/mcp/devbox.json","https://devbox.gzg.sealos.run");
export { handler as GET, handler as POST, handler as DELETE };