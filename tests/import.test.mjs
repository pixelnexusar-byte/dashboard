import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBankRows,
  moneyNumber,
  isoDate,
  sourceId,
  totals,
  csvText,
} from "../lib/bank-import.mjs";
const headers = [
  "Fecha",
  "Descripción",
  "Origen",
  "Débitos",
  "Créditos",
  "Grupo de Conceptos",
  "Concepto",
  "Número de Terminal",
  "Observaciones Cliente",
  "Número de Comprobante",
  "Leyendas Adicionales 1",
  "Leyendas Adicionales 2",
  "Leyendas Adicionales 3",
  "Leyendas Adicionales 4",
];
const row = (date, debit, credit, desc = "Transferencia De Terceros") => [
  date,
  desc,
  "",
  debit,
  credit,
  "Transferencias",
  "",
  "",
  "",
  "123",
  "Cliente",
  "",
  "",
  "Banco de ejemplo",
];
test("Conserva créditos y débitos sin sumar saldos ni filas vacías", () => {
  const result = parseBankRows([
    ["Extracto"],
    headers,
    row(46245, 0, 50000),
    row(46245, 300, 0),
    [],
    [],
  ]);
  assert.equal(result.records.length, 2);
  assert.deepEqual(totals(result.records), {
    income: 50000,
    expense: 300,
    net: 49700,
  });
  assert.equal(result.records[0].date, "2026-08-11");
});
test("Rechaza fechas y movimientos ambiguos; no los descarta silenciosamente", () => {
  const r = parseBankRows([
    headers,
    row("31/02/2026", 0, 20),
    row("01/10/2026", 50, 50),
    row("02/10/2026", "abc", 30),
    row("02/10/2026", 0, 0),
  ]);
  assert.equal(r.records.length, 0);
  assert.equal(r.rejected.length, 4);
});
test("Importaciones repetidas generan los mismos ids y conservan movimientos iguales legítimos", async () => {
  const input = [headers, row("01/10/2026", 0, 20), row("01/10/2026", 0, 20)];
  const a = parseBankRows(input),
    b = parseBankRows(input);
  const ids = await Promise.all(
    a.records.map((r) => sourceId(r.sourceIdentity)),
  );
  assert.notEqual(ids[0], ids[1]);
  assert.equal(ids[0], await sourceId(b.records[0].sourceIdentity));
  const c = parseBankRows(input, { account: "Otra cuenta" });
  assert.notEqual(ids[0], await sourceId(c.records[0].sourceIdentity));
});
test("Importes argentinos y redondeo a centavos", () => {
  assert.equal(moneyNumber("$ 1.234,56"), 1234.56);
  assert.equal(moneyNumber("(1.234,56)"), -1234.56);
  assert.equal(moneyNumber("1234.56"), 1234.56);
  assert.deepEqual(
    totals([
      { type: "ingreso", amount: 0.1 },
      { type: "ingreso", amount: 0.2 },
    ]),
    { income: 0.3, expense: 0, net: 0.3 },
  );
});
test("Fechas ISO, locales, números Excel, Date y sistema 1904", () => {
  assert.equal(isoDate("31/10/2026"), "2026-10-31");
  assert.equal(isoDate("2026-02-31"), "");
  assert.equal(isoDate(new Date("2026-10-31T00:00:00Z")), "2026-10-31");
  assert.equal(isoDate(1, true), "1904-01-02");
});
test("No inventa el banco a partir de referencias numéricas", () => {
  const r = row("01/10/2026", 0, 20);
  r[13] = "0000123456";
  assert.equal(parseBankRows([headers, r]).records[0].entity, "");
});
test("Exportación CSV protege fórmulas y escapa texto", () => {
  const csv = csvText(
    [{ desc: '=CMD("x")' }],
    [{ key: "desc", label: "Concepto" }],
  );
  assert.ok(csv.includes("'=CMD"));
  assert.ok(csv.includes('""x""'));
});
