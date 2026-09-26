import baseWorker from './voice-entry';
import { handleGitHubWebhook, type GitHubWebhookEnv } from './github-webhook';

type BaseFetch = typeof baseWorker.fetch;
type BaseEnv = Parameters<BaseFetch>[1];
type BaseContext = Parameters<BaseFetch>[2];
type BaseEmail = typeof baseWorker.email;
type EmailMessage = Parameters<BaseEmail>[0];

type Env = BaseEnv & GitHubWebhookEnv;

export default {
  async fetch(request: Request, env: Env, ctx: BaseContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/webhooks/github') {
      return handleGitHubWebhook(request, env);
    }
    return baseWorker.fetch(request, env, ctx);
  },

  async email(message: EmailMessage, env: Env): Promise<void> {
    await baseWorker.email(message, env);
  },
};
