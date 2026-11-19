/**
 * NEBULA — Groq Intelligence Playground
 * api.js — Official Groq API Client & Streaming Controller
 *
 * Security: Visitor API keys are kept strictly in volatile memory or browser session
 * storage. Keys are never logged, never sent to third-party databases, and only
 * transmitted directly to the official Groq API endpoint.
 */

class GroqClient {
  constructor() {
    this.apiKey = null;
    this.storageKey = 'nebula_groq_api_key';
    this.rememberKey = false;
    this.useProxy = false;
    this.proxyEndpoint = '/api/groq';
    this.directEndpoint = 'https://api.groq.com/openai/v1';

    // Curated official Groq models metadata with context limits and capabilities
    this.modelsCatalog = [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'Meta',
        context: 128000,
        maxTokens: 32768,
        speed: '~280 T/s',
        category: 'flagship',
        badge: 'Flagship',
        description: 'State-of-the-art open weights model with performance competitive with top closed models.',
        supportsReasoning: false,
        supportsVision: false,
        recommendedTemp: 0.7
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'Meta',
        context: 128000,
        maxTokens: 8192,
        speed: '~840 T/s',
        category: 'speed',
        badge: 'Ultra Fast',
        description: 'Incredible inference velocity with full 128k context. Perfect for low-latency production tasks.',
        supportsReasoning: false,
        supportsVision: false,
        recommendedTemp: 0.7
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 Distill Llama 70B',
        provider: 'DeepSeek / Meta',
        context: 128000,
        maxTokens: 8192,
        speed: '~260 T/s',
        category: 'reasoning',
        badge: 'Reasoning',
        description: 'Native chain-of-thought reasoning model trained with reinforcement learning for math, logic, and code.',
        supportsReasoning: true,
        supportsVision: false,
        recommendedTemp: 0.6
      },
      {
        id: 'deepseek-r1-distill-qwen-32b',
        name: 'DeepSeek R1 Distill Qwen 32B',
        provider: 'DeepSeek / Alibaba',
        context: 128000,
        maxTokens: 8192,
        speed: '~390 T/s',
        category: 'reasoning',
        badge: 'Reasoning',
        description: 'DeepSeek R1 reasoning distilled into Qwen 32B architecture. Exceptional code and math deduction.',
        supportsReasoning: true,
        supportsVision: false,
        recommendedTemp: 0.6
      },
      {
        id: 'llama-3.1-70b-versatile',
        name: 'Llama 3.1 70B Versatile',
        provider: 'Meta',
        context: 128000,
        maxTokens: 8192,
        speed: '~280 T/s',
        category: 'general',
        badge: 'Versatile',
        description: 'High-capability multi-task model with extensive knowledge base and multilingual support.',
        supportsReasoning: false,
        supportsVision: false,
        recommendedTemp: 0.7
      },
      {
        id: 'llama-3.2-11b-vision-preview',
        name: 'Llama 3.2 11B Vision',
        provider: 'Meta',
        context: 128000,
        maxTokens: 8192,
        speed: '~420 T/s',
        category: 'vision',
        badge: 'Vision',
        description: 'Multimodal language and vision model capable of image comprehension and visual question answering.',
        supportsReasoning: false,
        supportsVision: true,
        recommendedTemp: 0.7
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B MoE',
        provider: 'Mistral AI',
        context: 32768,
        maxTokens: 32768,
        speed: '~450 T/s',
        category: 'moe',
        badge: 'MoE',
        description: 'Sparse mixture of experts model with 32k context. Superior multilingual syntax and instruction following.',
        supportsReasoning: false,
        supportsVision: false,
        recommendedTemp: 0.7
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B Instruct',
        provider: 'Google',
        context: 8192,
        maxTokens: 8192,
        speed: '~520 T/s',
        category: 'general',
        badge: 'Google',
        description: 'Google high-efficiency instruction-tuned model with strong reasoning, safety, and conciseness.',
        supportsReasoning: false,
        supportsVision: false,
        recommendedTemp: 0.7
      }
    ];

    // Initialize saved key if user explicitly consented to remember
    this.loadPersistedKey();
  }

  /**
   * Load key from localStorage or sessionStorage with fallback
   */
  loadPersistedKey() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored && stored.startsWith('gsk_')) {
        this.apiKey = stored;
        this.rememberKey = true;
        return;
      }
      const sessionStored = sessionStorage.getItem(this.storageKey);
      if (sessionStored && sessionStored.startsWith('gsk_')) {
        this.apiKey = sessionStored;
        this.rememberKey = false;
      }
    } catch (e) {
      console.warn('Storage read restricted:', e);
    }
  }

  /**
   * Set API key with user's persistence preference
   */
  setApiKey(key, remember = false) {
    if (!key || typeof key !== 'string') {
      throw new Error('API key must be a valid string starting with gsk_');
    }
    const cleanKey = key.trim();
    if (!cleanKey.startsWith('gsk_') && cleanKey.length < 20) {
      throw new Error('Invalid Groq API key format. Keys start with "gsk_"');
    }

    this.apiKey = cleanKey;
    this.rememberKey = remember;

    try {
      if (remember) {
        localStorage.setItem(this.storageKey, cleanKey);
        sessionStorage.removeItem(this.storageKey);
      } else {
        sessionStorage.setItem(this.storageKey, cleanKey);
        localStorage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Unable to persist API key:', e);
    }
  }

  /**
   * Remove key from memory and local/session storage
   */
  clearApiKey() {
    this.apiKey = null;
    this.rememberKey = false;
    try {
      localStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.startsWith('gsk_'));
  }

  getMaskedKey() {
    if (!this.apiKey) return null;
    if (this.apiKey.length <= 8) return '••••••••';
    return `${this.apiKey.slice(0, 6)}••••••••${this.apiKey.slice(-4)}`;
  }

  getBaseUrl() {
    return this.useProxy ? this.proxyEndpoint : this.directEndpoint;
  }

  /**
   * Validate key by querying the official Groq models endpoint
   */
  async validateKey(testKey = null) {
    const key = testKey || this.apiKey;
    if (!key) {
      return { valid: false, error: 'No API key provided.' };
    }

    const trimmed = key.trim();
    if (!trimmed.startsWith('gsk_')) {
      return {
        valid: false,
        error: 'Invalid key format. Groq API keys start with "gsk_". Please verify your key at console.groq.com/keys.'
      };
    }

    try {
      const url = `${this.getBaseUrl()}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${trimmed}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          valid: true,
          models: data.data || []
        };
      }

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Authentication failed (401). Invalid Groq API Key. Verify your key in the Groq Console at https://console.groq.com/keys.'
        };
      }

      if (response.status === 429) {
        return {
          valid: false,
          error: 'Rate limit encountered (429). Your Groq key is active but currently throttled. Please try again shortly.'
        };
      }

      const errText = await response.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch (_) {}

      return {
        valid: false,
        error: `Groq API Error (${response.status}): ${parsedErr}`
      };
    } catch (err) {
      return {
        valid: false,
        error: `Network or CORS error connecting to Groq API (${err.message}). If using browser extensions that block third-party requests, please whitelist console.groq.com or toggle Serverless Proxy mode.`
      };
    }
  }

  /**
   * Fetch live models list from Groq API, merging with rich metadata
   */
  async fetchLiveModels() {
    if (!this.hasApiKey()) {
      return this.modelsCatalog;
    }

    try {
      const res = await this.validateKey();
      if (res.valid && Array.isArray(res.models)) {
        const liveIds = new Set(res.models.map(m => m.id));
        // Enrich existing catalog with active status
        const catalogMap = new Map(this.modelsCatalog.map(m => [m.id, m]));
        const combined = [];

        // Add known models that are active
        for (const catModel of this.modelsCatalog) {
          if (liveIds.has(catModel.id)) {
            combined.push({ ...catModel, active: true });
          } else {
            combined.push({ ...catModel, active: false });
          }
        }

        // Add any newly discovered models from Groq that aren't in catalog
        for (const liveM of res.models) {
          if (!catalogMap.has(liveM.id)) {
            const isReasoning = liveM.id.toLowerCase().includes('r1') || liveM.id.toLowerCase().includes('reason');
            combined.push({
              id: liveM.id,
              name: liveM.id,
              provider: liveM.owned_by || 'Groq',
              context: liveM.context_window || 8192,
              maxTokens: 8192,
              speed: '~300 T/s',
              category: isReasoning ? 'reasoning' : 'general',
              badge: isReasoning ? 'Reasoning' : 'Live',
              description: `Dynamic Groq model provided by ${liveM.owned_by || 'GroqCloud'}.`,
              supportsReasoning: isReasoning,
              supportsVision: liveM.id.includes('vision'),
              recommendedTemp: 0.7,
              active: true
            });
          }
        }

        return combined;
      }
    } catch (e) {
      console.warn('Failed to fetch live models list, falling back to curated catalog:', e);
    }

    return this.modelsCatalog;
  }

  /**
   * Send chat completion with streaming or standard JSON response
   */
  async chatCompletion({
    model,
    messages,
    temperature = 0.7,
    max_tokens = 2048,
    top_p = 1.0,
    frequency_penalty = 0,
    presence_penalty = 0,
    stream = true,
    reasoning_effort = null,
    tools = null,
    onChunk = () => {},
    onReasoning = () => {},
    signal = null
  }) {
    if (!this.hasApiKey()) {
      throw new Error('API Key Required. Please connect your Groq API key in the top bar or settings.');
    }

    const modelMeta = this.modelsCatalog.find(m => m.id === model);
    const supportsReasoning = modelMeta ? modelMeta.supportsReasoning : (model.includes('r1') || model.includes('reason'));

    // Payload configuration strictly matching official Groq API spec
    const payload = {
      model,
      messages,
      temperature: Math.max(0, Math.min(2, Number(temperature))),
      max_tokens: Math.max(1, Number(max_tokens)),
      top_p: Math.max(0, Math.min(1, Number(top_p))),
      stream: Boolean(stream)
    };

    if (frequency_penalty !== 0) payload.frequency_penalty = Number(frequency_penalty);
    if (presence_penalty !== 0) payload.presence_penalty = Number(presence_penalty);

    // DeepSeek reasoning parameter if model supports reasoning_effort
    if (supportsReasoning && reasoning_effort) {
      payload.reasoning_effort = reasoning_effort;
    }

    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const startTime = performance.now();
    const endpoint = `${this.getBaseUrl()}/chat/completions`;

    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
      });
    } catch (netErr) {
      if (netErr.name === 'AbortError') {
        throw new Error('Request cancelled by user.');
      }
      throw new Error(`Network failure connecting to Groq (${netErr.message}). Check your internet connection or proxy settings.`);
    }

    if (!response.ok) {
      let errMessage = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errMessage = errJson.error?.message || JSON.stringify(errJson);
      } catch (_) {
        errMessage = await response.text();
      }

      if (response.status === 401) {
        throw new Error(`Invalid API key (401). Please verify your Groq key at console.groq.com/keys.`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). Groq Cloud rate limit reached: ${errMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Bad Request (400): ${errMessage}`);
      } else {
        throw new Error(`Groq API Error (${response.status}): ${errMessage}`);
      }
    }

    // NON-STREAMING RESPONSE
    if (!stream) {
      const data = await response.json();
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const choice = data.choices?.[0];
      const rawContent = choice?.message?.content || '';

      // Parse reasoning if present in <think> tags (DeepSeek R1 format)
      let reasoningContent = '';
      let cleanContent = rawContent;

      if (rawContent.includes('<think>')) {
        const thinkMatch = rawContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
        if (thinkMatch) {
          reasoningContent = thinkMatch[1].trim();
          cleanContent = rawContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();
        }
      }

      const usage = data.usage || {};
      const completionTokens = usage.completion_tokens || this.estimateTokenCount(rawContent);
      const promptTokens = usage.prompt_tokens || this.estimateMessagesTokens(messages);
      const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

      const tokensPerSec = durationMs > 0 && completionTokens > 0
        ? Math.round((completionTokens / (durationMs / 1000)) * 10) / 10
        : 0;

      return {
        content: cleanContent,
        rawContent,
        reasoningContent,
        toolCalls: choice?.message?.tool_calls || null,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          tokensPerSec,
          durationMs
        },
        rawResponse: data
      };
    }

    // STREAMING SSE RESPONSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let accumulatedRaw = '';
    let accumulatedContent = '';
    let accumulatedReasoning = '';
    let inThinkTag = false;
    let firstTokenTime = null;
    let completionTokensCount = 0;
    let toolCallsAcc = [];
    let usageData = null;

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep partial line for next iteration

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(':')) continue; // Skip comments/empty lines

          if (trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);

              // Capture usage if provided in chunk
              if (parsed.usage) {
                usageData = parsed.usage;
              }

              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              if (!firstTokenTime) {
                firstTokenTime = performance.now();
              }

              // Handle tool calls delta if present
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index || 0;
                  if (!toolCallsAcc[idx]) {
                    toolCallsAcc[idx] = { id: tc.id || '', type: tc.type || 'function', function: { name: '', arguments: '' } };
                  }
                  if (tc.id) toolCallsAcc[idx].id = tc.id;
                  if (tc.function?.name) toolCallsAcc[idx].function.name += tc.function.name;
                  if (tc.function?.arguments) toolCallsAcc[idx].function.arguments += tc.function.arguments;
                }
              }

              const deltaContent = delta.content || '';
              if (deltaContent) {
                accumulatedRaw += deltaContent;
                completionTokensCount++;

                // Real-time DeepSeek R1 <think> parsing
                if (deltaContent.includes('<think>')) {
                  inThinkTag = true;
                  const parts = deltaContent.split('<think>');
                  if (parts[0]) {
                    accumulatedContent += parts[0];
                    onChunk(parts[0], accumulatedContent);
                  }
                  if (parts[1]) {
                    accumulatedReasoning += parts[1];
                    onReasoning(parts[1], accumulatedReasoning);
                  }
                } else if (deltaContent.includes('</think>')) {
                  inThinkTag = false;
                  const parts = deltaContent.split('</think>');
                  if (parts[0]) {
                    accumulatedReasoning += parts[0];
                    onReasoning(parts[0], accumulatedReasoning);
                  }
                  if (parts[1]) {
                    accumulatedContent += parts[1];
                    onChunk(parts[1], accumulatedContent);
                  }
                } else {
                  if (inThinkTag) {
                    accumulatedReasoning += deltaContent;
                    onReasoning(deltaContent, accumulatedReasoning);
                  } else {
                    accumulatedContent += deltaContent;
                    onChunk(deltaContent, accumulatedContent);
                  }
                }
              }
            } catch (err) {
              // Ignore partial JSON parse errors in SSE line
            }
          }
        }
      }
    } catch (readErr) {
      if (readErr.name === 'AbortError') {
        throw new Error('Generation stopped by user.');
      }
      throw readErr;
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);
    const timeToFirstToken = firstTokenTime ? Math.round(firstTokenTime - startTime) : durationMs;

    const finalTokens = usageData?.completion_tokens || completionTokensCount || this.estimateTokenCount(accumulatedRaw);
    const finalPromptTokens = usageData?.prompt_tokens || this.estimateMessagesTokens(messages);
    const totalTokens = usageData?.total_tokens || (finalPromptTokens + finalTokens);

    const tokensPerSec = durationMs > 0 && finalTokens > 0
      ? Math.round((finalTokens / (durationMs / 1000)) * 10) / 10
      : 0;

    return {
      content: accumulatedContent || accumulatedRaw,
      rawContent: accumulatedRaw,
      reasoningContent: accumulatedReasoning,
      toolCalls: toolCallsAcc.length > 0 ? toolCallsAcc : null,
      usage: {
        promptTokens: finalPromptTokens,
        completionTokens: finalTokens,
        totalTokens,
        tokensPerSec,
        durationMs,
        timeToFirstToken
      }
    };
  }

  /**
   * Helper: Fast heuristic token count estimator for display
   */
  estimateTokenCount(text) {
    if (!text || typeof text !== 'string') return 0;
    // Common heuristic for English & code: ~4 characters per token
    return Math.max(1, Math.ceil(text.length / 3.8));
  }

  estimateMessagesTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    let chars = 0;
    for (const m of messages) {
      chars += (m.content ? m.content.length : 0) + 12; // message overhead
    }
    return Math.max(1, Math.ceil(chars / 3.8));
  }
}

// Export singleton instance for browser global
window.GroqClient = GroqClient;
window.groqApi = new GroqClient();

