/**
 * popup.js — drives the hoken invoice popup.
 *
 * Sends a message to the active tab's content script, receives token counts,
 * and renders a deadpan-corporate invoice.
 */

(() => {
  const $ = (sel) => document.querySelector(sel);

  // ---- helpers ----

  function formatCurrency(n) {
    return "$" + n.toFixed(6);
  }

  function formatNumber(n) {
    return n.toLocaleString("en-US");
  }

  function generateInvoiceNumber() {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `HKN-${hex.toUpperCase()}`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // ---- rendering ----

  let lastData = null;

  function addLineItem(tbody, description, qty, rate, amount) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-desc">${description}</td>
      <td class="col-qty">${qty}</td>
      <td class="col-rate">${rate}</td>
      <td class="col-amount">${amount}</td>
    `;
    tbody.appendChild(tr);
  }

  function renderInvoice(data, modelKey) {
    const { tokens, chars, words, images, meta } = data;
    const { model, cost } = LLMTokenizer.calculateCost(tokens, modelKey);

    // Header / parties
    $("#bill-to-name").textContent = meta.hostname;
    $("#bill-to-url").textContent = meta.title;

    // Meta
    $("#invoice-number").textContent = generateInvoiceNumber();
    $("#invoice-date").textContent = formatDate(meta.timestamp);

    // Line items
    const tbody = $("#line-items-body");
    tbody.innerHTML = "";

    const ratePerToken = model.pricePerMillionTokens / 1_000_000;

    addLineItem(
      tbody,
      "Token processing",
      formatNumber(tokens),
      `$${ratePerToken.toFixed(8)}/tok`,
      formatCurrency(cost)
    );

    // Surcharge: images "vision" fee — $0.001 per image, just for fun
    const visionCost = images * 0.001;
    if (images > 0) {
      addLineItem(
        tbody,
        "Vision surcharge",
        formatNumber(images),
        "$0.00100000/img",
        formatCurrency(visionCost)
      );
    }

    // Totals
    const subtotal = cost + visionCost;
    const tax = subtotal * 0.13;
    const insurance = subtotal * 0.03;
    const grandTotal = subtotal + tax + insurance;

    $("#subtotal").textContent = formatCurrency(subtotal);
    $("#tax").textContent = formatCurrency(tax);
    $("#insurance").textContent = formatCurrency(insurance);
    $("#grand-total").textContent = formatCurrency(grandTotal);

    // Show invoice, hide loading
    $("#loading").classList.add("hidden");
    $("#invoice").classList.remove("hidden");
  }

  // ---- init ----

  function showError(msg) {
    $("#loading").classList.add("hidden");
    $("#invoice").classList.add("hidden");
    if (msg) $("#error-msg").textContent = msg;
    $("#error").classList.remove("hidden");
  }

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        showError("No active tab found.");
        return;
      }

      // chrome:// and edge:// pages can't be scripted
      if (
        tab.url &&
        (tab.url.startsWith("chrome://") ||
          tab.url.startsWith("edge://") ||
          tab.url.startsWith("about:"))
      ) {
        showError("Cannot invoice browser internal pages. Nice try though.");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "COUNT_TOKENS" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showError(
            "Could not reach this page. Try refreshing and clicking hoken again."
          );
          return;
        }

        lastData = response;
        renderInvoice(response, LLMTokenizer.DEFAULT_MODEL);
      });
    } catch (err) {
      showError("Something went wrong: " + err.message);
    }
  }

  init();
})();
