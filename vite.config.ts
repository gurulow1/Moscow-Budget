import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// In development the helper's /api/chat runs inside the Vite server; on Vercel api/chat.ts serves it.
function devChatApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-chat-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const request = new Request('http://localhost/api/chat', {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? 'application/json', 'x-real-ip': req.socket.remoteAddress ?? 'local' },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        });
        const { handleChat } = await server.ssrLoadModule('/server/chatCore.ts');
        const response: Response = await handleChat(request, env);
        res.statusCode = response.status;
        response.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), viteSingleFile(), devChatApi(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
