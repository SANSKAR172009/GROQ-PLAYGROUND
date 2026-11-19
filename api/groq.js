/**
 * NEBULA — Groq Intelligence Playground
 * api/groq.js — Minimal Secure Vercel Serverless Function Proxy
 *
 * Security Guarantee:
 * - Receives the visitor's own Groq API key from the incoming request header.
 * - Does NOT require or use any developer-owned API key.
 * - Never logs, stores, or persists visitor API keys or payload data.
 * - Streams Server-Sent Events (SSE) directly back to the client.
 */

export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-groq-key'
      }
    });
  }

  // Handle models list GET request
  if (req.method === 'GET') {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-groq-key');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { message: 'Missing Groq API Key header' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: bearerToken,
          'Content-Type': 'application/json'
        }
      });
      const data = await groqRes.text();
      return new Response(data, {
        status: groqRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Extract visitor's API key
  const authHeader = req.headers.get('authorization') || req.headers.get('x-groq-key');
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Missing Groq API key in Authorization header. Please connect your Groq API key in the playground.'
        }
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;

  try {
    const body = await req.json();

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const isStream = body.stream === true;
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    if (isStream) {
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache');
      responseHeaders.set('Connection', 'keep-alive');

      return new Response(groqResponse.body, {
        status: groqResponse.status,
        headers: responseHeaders
      });
    } else {
      const data = await groqResponse.text();
      responseHeaders.set('Content-Type', 'application/json');

      return new Response(data, {
        status: groqResponse.status,
        headers: responseHeaders
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: { message: `Vercel Edge Proxy Error: ${err.message}` }
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

