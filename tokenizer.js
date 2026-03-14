/**
 * Lightweight GPT-style token estimator.
 *
 * Uses the same regex splitting pattern that OpenAI's tiktoken uses for
 * cl100k_base (GPT-4 / GPT-3.5-turbo), then counts the resulting chunks.
 * This is NOT a full BPE merge — it's a heuristic that lands within ~10%
 * of the real count for typical English web content, which is close enough
 * for a joke invoice.
 *
 * Shared between content.js and popup.js via <script> ordering.
 */

// eslint-disable-next-line no-unused-vars
const LLMTokenizer = (() => {
  // Simplified version of the cl100k_base splitting regex.
  // Each match roughly corresponds to one token.
  const TOKEN_REGEX =
    /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

  /**
   * Estimate the number of tokens in a string.
   * @param {string} text
   * @returns {number}
   */
  function countTokens(text) {
    if (!text) return 0;
    const matches = text.match(TOKEN_REGEX);
    return matches ? matches.length : 0;
  }

  // ---------- pricing models ----------
  // Prices are per 1 000 000 tokens (input), taken from public pricing pages.
  const MODELS = {
    "claude-opus-4.6-max": {
      name: "Claude Opus 4.6 Max",
      vendor: "Anthropic",
      pricePerMillionTokens: 15.00,
    },
  };

  const DEFAULT_MODEL = "claude-opus-4.6-max";

  /**
   * Calculate cost for a given token count and model key.
   * @param {number} tokens
   * @param {string} [modelKey]
   * @returns {{ model: object, tokens: number, cost: number }}
   */
  function calculateCost(tokens, modelKey = DEFAULT_MODEL) {
    const model = MODELS[modelKey] || MODELS[DEFAULT_MODEL];
    const cost = (tokens / 1_000_000) * model.pricePerMillionTokens;
    return { model, tokens, cost };
  }

  return { countTokens, calculateCost, MODELS, DEFAULT_MODEL };
})();
