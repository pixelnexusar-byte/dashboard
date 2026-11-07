// Importación sin red. No evalúa fórmulas ni macros del archivo.
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export function cellValue(value) {
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return cellValue(value.result);
    if (value.richText) return value.richText.map((part) => part.text).join("");
    if (value.text) return value.text;
    return "";
  }
  return value ?? "";
}
export function moneyNumber(input) {
  input = cellValue(input);
  if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
  let s = String(input)
    .trim()
    .replace(/\s|\$|ARS|USD/gi, "");
  if (!s || s === "-") return 0;
  const negative = s.startsWith("(") && s.endsWith(")");
  s = s.replace(/[()]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : NaN;
}
export const cents = (value) => Math.round((Number(value) || 0) * 100);
export function isoDate(input, date1904 = false) {
  input = cellValue(input);
  if (input instanceof Date)
    return Number.isFinite(input.getTime())
      ? input.toISOString().slice(0, 10)
      : "";
  if (typeof input === "number" && Number.isFinite(input)) {
    return new Date(
      Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) +
        Math.floor(input) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
  }
  const s = String(input).trim();
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  let y, m, d;
  if (match) [, y, m, d] = match;
  else {
    match = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) return "";
    [, d, m, y] = match;
  }
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    dt.getUTCFullYear() !== Number(y) ||
    dt.getUTCMonth() !== Number(m) - 1 ||
    dt.getUTCDate() !== Number(d)
  )
    return "";
  return dt.toISOString().slice(0, 10);
}
export function classify(description, group, entity) {
  const text = normalize(`${description} ${group}`);
  const name = normalize(entity);
  if (/impuesto|imp\.|iva\b|sellos|ley 25413/.test(text))
    return { medium: "Débito automático", category: "Impuestos" };
  if (/interes|comision|mantenimiento/.test(text))
    return { medium: "Débito bancario", category: "Gastos bancarios" };
  if (/cashback|reintegro/.test(text))
    return { medium: "Crédito bancario", category: "Reintegros" };
  if (/mercado libre|mercado pago|uala|naranja|personal pay/.test(name))
    return { medium: "Billetera virtual", category: "Transferencias" };
  if (/transfer|transf|trf|coelsa/.test(text))
    return { medium: "Transferencia", category: "Transferencias" };
  if (/tarjeta|visa|mastercard/.test(text))
    return { medium: "Tarjeta", category: "Compras" };
  if (/efectivo|cajero|deposito/.test(text))
    return { medium: "Efectivo", category: "General" };
  return { medium: "Por confirmar", category: "General" };
}
// grid: filas con índices desde cero. Se busca el encabezado, no se supone fila fija.
export function parseBankRows(
  grid,
  { date1904 = false, account = "Galicia · CC 1511970403", fileName = "" } = {},
) {
  const headerIndex = grid.findIndex(
    (row) =>
      row.some((v) => normalize(cellValue(v)) === "fecha") &&
      row.some((v) => normalize(cellValue(v)) === "debitos") &&
      row.some((v) => normalize(cellValue(v)) === "creditos"),
  );
  if (headerIndex < 0)
    throw new Error(
      "No se encontraron las columnas Fecha, Débitos y Créditos. Usá el extracto XLSX original del banco.",
    );
  const headers = grid[headerIndex].map((v) => normalize(cellValue(v)));
  const get = (row, label) => cellValue(row[headers.indexOf(normalize(label))]);
  const records = [],
    rejected = [];
  const occurrences = new Map();
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row.some((v) => String(cellValue(v)).trim())) continue;
    const rawDate = get(row, "Fecha"),
      rawDebit = get(row, "Débitos"),
      rawCredit = get(row, "Créditos");
    if (!rawDate && !moneyNumber(rawDebit) && !moneyNumber(rawCredit)) continue;
    const date = isoDate(rawDate, date1904),
      debit = moneyNumber(rawDebit),
      credit = moneyNumber(rawCredit);
    if (
      !date ||
      !Number.isFinite(debit) ||
      !Number.isFinite(credit) ||
      debit < 0 ||
      credit < 0 ||
      (debit > 0 && credit > 0) ||
      (debit === 0 && credit === 0)
    ) {
      rejected.push({
        row: i + 1,
        reason: !date ? "Fecha inválida" : "Débito o crédito inválido/ambiguo",
      });
      continue;
    }
    const desc = String(get(row, "Descripción")).trim();
    const counterparty = String(get(row, "Leyendas Adicionales 1")).trim();
    const extra4 = String(get(row, "Leyendas Adicionales 4")).trim();
    const entity = /[a-záéíóúñ]/i.test(extra4) ? extra4 : "";
    const reference = String(get(row, "Número de Comprobante")).trim();
    const type = credit > 0 ? "ingreso" : "egreso";
    const amount = cents(credit || debit) / 100;
    const group = String(get(row, "Grupo de Conceptos"));
    const inferred = classify(desc, group, entity);
    const identity = JSON.stringify([
      normalize(account),
      date,
      type,
      cents(amount),
      normalize(desc),
      normalize(counterparty),
      reference,
      normalize(extra4),
    ]);
    const occurrence = (occurrences.get(identity) || 0) + 1;
    occurrences.set(identity, occurrence);
    records.push({
      date,
      type,
      amount,
      desc: desc || "Movimiento bancario",
      ...inferred,
      counterparty,
      entity,
      reference,
      account,
      currency: "ARS",
      notes: String(get(row, "Observaciones Cliente")).trim(),
      sourceFile: fileName,
      sourceRow: i + 1,
      sourceIdentity: `${identity}|${occurrence}`,
      selected: true,
    });
  }
  return { records, rejected, headerRow: headerIndex + 1 };
}
export function totals(records) {
  let income = 0,
    expense = 0;
  for (const row of records) {
    if (row.type === "ingreso") income += cents(row.amount);
    else if (row.type === "egreso") expense += cents(row.amount);
  }
  return {
    income: income / 100,
    expense: expense / 100,
    net: (income - expense) / 100,
  };
}
export async function sourceId(identity) {
  const bytes = new TextEncoder().encode(identity);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return (
    "extracto_" +
    Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export function csvText(rows, columns) {
  const quote = (v) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return (
    "\ufeff" +
    [
      columns.map((c) => quote(c.label)).join(";"),
      ...rows.map((row) => columns.map((c) => quote(row[c.key])).join(";")),
    ].join("\r\n")
  );
}
