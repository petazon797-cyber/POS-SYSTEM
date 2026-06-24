// Small shared helpers used across controllers.

/**
 * Generates a human-readable, mostly-unique sale/receipt number.
 * Format: POS-YYYYMMDD-HHMMSS-<3 random digits>
 * Good enough for a single-store system; for multi-branch, prefix
 * with a store code (e.g. YGN-01-POS-...).
 */
function generateSaleNumber() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomPart = Math.floor(100 + Math.random() * 900); // 3-digit random
  return `POS-${datePart}-${timePart}-${randomPart}`;
}

function generatePoNumber() {
  const now = new Date();
  return `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

module.exports = { generateSaleNumber, generatePoNumber };
