/**
 * Content script — injected into every page.
 *
 * Extracts visible text, counts tokens via LLMTokenizer, and responds to
 * messages from the popup with the results.
 */

(() => {
  /**
   * Pull all human-visible text out of the page.
   * Strips <script>, <style>, <noscript>, and hidden elements.
   */
  function extractPageText() {
    const clone = document.body.cloneNode(true);

    // Remove non-visible elements
    const junk = clone.querySelectorAll(
      "script, style, noscript, svg, iframe, canvas, [hidden], [aria-hidden='true']"
    );
    junk.forEach((el) => el.remove());

    // innerText respects CSS visibility and collapses whitespace nicely
    return clone.innerText || "";
  }

  /**
   * Gather page metadata for the invoice header.
   */
  function getPageMeta() {
    return {
      url: location.href,
      hostname: location.hostname,
      title: document.title || location.hostname,
      timestamp: new Date().toISOString(),
    };
  }

  // Listen for requests from the popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "COUNT_TOKENS") {
      const text = extractPageText();
      const tokens = LLMTokenizer.countTokens(text);
      const meta = getPageMeta();

      // Character & word counts are fun bonus line-items
      const chars = text.length;
      const words = text.split(/\s+/).filter(Boolean).length;
      const images = document.querySelectorAll("img").length;

      sendResponse({ tokens, chars, words, images, meta });
    }
    // Return true to indicate we will send a response asynchronously
    return true;
  });
})();
