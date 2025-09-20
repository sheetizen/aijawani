// Cloudflare Pages function environment variables
interface Env {
  AUTH_USERNAME?: string;
  AUTH_PASSWORD?: string;
}

// FIX: Define the PagesFunction type for Cloudflare Pages, as it's not globally available in this context.
type PagesFunction<EnvT = unknown> = (context: { request: Request; env: EnvT }) => Promise<Response>;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { AUTH_USERNAME, AUTH_PASSWORD } = env;

  if (!AUTH_USERNAME || !AUTH_PASSWORD) {
    console.error("Authentication environment variables (AUTH_USERNAME, AUTH_PASSWORD) are not set.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username, password } = await request.json() as Record<string, any>;

    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
