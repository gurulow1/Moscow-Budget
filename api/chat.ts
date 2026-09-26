import { handleChat } from '../server/chatCore';

// Vercel function behind the budget helper. The OpenRouter key lives only in the project's environment variables.
export const config = { runtime: 'edge' };

export default function handler(request: Request) {
  return handleChat(request, process.env);
}
