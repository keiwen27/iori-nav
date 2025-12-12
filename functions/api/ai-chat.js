
import { isAdminAuthenticated, errorResponse, jsonResponse } from '../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Authentication
  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return errorResponse('Messages array is required', 400);
    }

    if (!env.AI) {
      return errorResponse('Workers AI binding (env.AI) not found', 500);
    }

    const model = env.WORKERS_AI_MODEL || '@cf/meta/llama-3-8b-instruct';

    const response = await env.AI.run(model, {
      messages: messages
    });

    return jsonResponse({
        code: 200,
        data: response.response || response // Some models return { response: "..." }, others just the string or object
    });

  } catch (e) {
    console.error('Workers AI error:', e);
    return errorResponse(`Workers AI failed: ${e.message}`, 500);
  }
}
