import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

export async function stdioServer(server: Server) {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
