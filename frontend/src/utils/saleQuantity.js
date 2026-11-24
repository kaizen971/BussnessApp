// Keep the draft separate from the parsed value: clearing a field is not deletion.
export const parseSaleQuantity = (text) => {
  const digits = String(text).replace(/\s/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const quantity = Number(digits);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
};

export const isValidSaleItem = (item) => {
  const subtotal = item.quantity * item.unitPrice;
  const amount = subtotal - (item.discount || 0);
  return Number.isSafeInteger(item.quantity) && item.quantity > 0
    && Number.isFinite(subtotal) && subtotal >= 0 && subtotal <= Number.MAX_SAFE_INTEGER
    && Number.isFinite(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER;
};
