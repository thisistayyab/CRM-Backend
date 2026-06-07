const PHONE_REGEX = /(?:\+92|0)?3[0-9]{9}|\b3[0-9]{9}\b/g;

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function parseFacebookOrderMessage(text, products = []) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const joined = lines.join(' ');

  let customerName = '';
  let phoneNumber = '';
  let customerAddress = '';
  const matchedProducts = [];

  const phoneMatches = joined.match(PHONE_REGEX) || [];
  if (phoneMatches.length) {
    phoneNumber = normalizePhone(phoneMatches[0]);
  }

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(name|customer|naam)\s*[:=-]/i.test(line)) {
      customerName = line.split(/[:=-]/).slice(1).join(':').trim();
      continue;
    }
    if (/^(phone|mobile|contact|whatsapp|cell)\s*[:=-]/i.test(line)) {
      const m = line.match(PHONE_REGEX);
      if (m) phoneNumber = normalizePhone(m[0]);
      continue;
    }
    if (/^(address|location|area|delivery)\s*[:=-]/i.test(line)) {
      customerAddress = line.split(/[:=-]/).slice(1).join(':').trim();
      continue;
    }
    if (/^(product|item|order)\s*[:=-]/i.test(line)) {
      const productLine = line.split(/[:=-]/).slice(1).join(':').trim();
      matchProductLine(productLine, products, matchedProducts);
    }
  }

  if (!customerName && lines.length) {
    const first = lines[0];
    if (!PHONE_REGEX.test(first) && !/^(name|phone|address|product)/i.test(first)) {
      customerName = first.replace(/[^a-zA-Z\s]/g, '').trim() || first;
    }
  }

  if (!customerAddress) {
    const addressLine = lines.find(l =>
      /road|street|block|phase|society|town|city|near|gali|mohalla|colony|sector/i.test(l) &&
      !PHONE_REGEX.test(l)
    );
    if (addressLine) customerAddress = addressLine.replace(/^(address|location)\s*[:=-]\s*/i, '');
  }

  for (const line of lines) {
    if (PHONE_REGEX.test(line) && line.replace(/\D/g, '').includes(phoneNumber)) continue;
    if (line === customerName || line === customerAddress) continue;
    matchProductLine(line, products, matchedProducts);
  }

  return {
    customerName,
    phoneNumber,
    customerAddress,
    matchedProducts,
    confidence: [customerName, phoneNumber, customerAddress].filter(Boolean).length
  };
}

function matchProductLine(line, products, matchedProducts) {
  const qtyMatch = line.match(/(\d+)\s*[x×]\s*(.+)|(.+?)\s*[x×]\s*(\d+)|(\d+)\s+(.+)/i);
  let qty = 1;
  let namePart = line;

  if (qtyMatch) {
    if (qtyMatch[1] && qtyMatch[2]) { qty = parseInt(qtyMatch[1], 10); namePart = qtyMatch[2]; }
    else if (qtyMatch[3] && qtyMatch[4]) { namePart = qtyMatch[3]; qty = parseInt(qtyMatch[4], 10); }
    else if (qtyMatch[5] && qtyMatch[6]) { qty = parseInt(qtyMatch[5], 10); namePart = qtyMatch[6]; }
  }

  const lowerName = namePart.toLowerCase();
  const product = products.find(p =>
    lowerName.includes(p.productname?.toLowerCase()) ||
    p.productname?.toLowerCase().includes(lowerName)
  );

  if (product && !matchedProducts.find(m => m.productId === product._id)) {
    matchedProducts.push({
      productId: product._id,
      productName: product.productname,
      quantity: qty,
      price: product.price,
      salePrice: product.salePrice || product.price
    });
  }
}
