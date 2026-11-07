"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileSpreadsheet,
  Home,
  Layers3,
  Menu,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Search,
  Settings2,
  Ship,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useDashboard } from "../lib/use-dashboard";
import {
  csvText,
  isoDate,
  parseBankRows,
  sourceId,
  totals,
} from "../lib/bank-import.mjs";

type Row = Record<string, any>;
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  wide?: boolean;
};
const today = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
const currency = (n: unknown, code = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
const dateLabel = (s: string) =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : "—";
const media = [
  "Transferencia",
  "Billetera virtual",
  "Débito automático",
  "Débito bancario",
  "Crédito bancario",
  "Tarjeta",
  "Efectivo",
  "Cheque",
  "Por confirmar",
  "Otro",
];
const payments = ["Pendiente de Pago", "Pago Parcial", "Pago Completado"];
const navigation = [
  { id: "general", label: "Resumen general", icon: Home, group: "PRINCIPAL" },
  { id: "operaciones", label: "Operaciones", icon: Ship },
  { id: "clientes", label: "Clientes", icon: Users },
  {
    id: "bancos",
    label: "Finanzas bancarias",
    icon: Building2,
    group: "ADMINISTRACIÓN",
  },
  { id: "caja", label: "Caja y movimientos", icon: Wallet },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "empresa", label: "Mi empresa", icon: Settings2 },
];
const schemas: Record<string, Field[]> = {
  bankTransactions: [
    { key: "date", label: "Fecha", type: "date", required: true },
    {
      key: "type",
      label: "Tipo de movimiento",
      options: ["ingreso", "egreso"],
      required: true,
    },
    { key: "amount", label: "Monto · ARS", type: "number", required: true },
    { key: "medium", label: "Medio de pago", options: media },
    {
      key: "desc",
      label: "Concepto / descripción",
      required: true,
      wide: true,
    },
    { key: "counterparty", label: "Persona o empresa (origen / destino)" },
    { key: "entity", label: "Banco o billetera de origen / destino" },
    { key: "category", label: "Categoría" },
    { key: "account", label: "Cuenta propia" },
    { key: "reference", label: "Comprobante / referencia" },
    { key: "notes", label: "Notas", type: "textarea", wide: true },
  ],
  transactions: [
    { key: "date", label: "Fecha", type: "date", required: true },
    { key: "type", label: "Tipo", options: ["ingreso", "egreso"] },
    { key: "amount", label: "Monto · ARS", type: "number", required: true },
    { key: "medium", label: "Medio", options: media },
    { key: "desc", label: "Concepto", required: true, wide: true },
    { key: "cat", label: "Categoría" },
    { key: "notes", label: "Notas", type: "textarea", wide: true },
  ],
  contracts: [
    { key: "client", label: "Cliente", required: true, wide: true },
    { key: "type", label: "Servicio", options: ["Marítimo", "Aéreo"] },
    {
      key: "status",
      label: "Estado comercial",
      options: ["Cotizado", "En Curso", "En Aduana", "Pagado", "Finalizado"],
    },
    { key: "note", label: "Contenedor / guía / identificador" },
    { key: "eta", label: "Fecha estimada de llegada", type: "date" },
    { key: "amount", label: "Importe total · USD", type: "number" },
    { key: "estadoPago", label: "Estado del pago", options: payments },
    {
      key: "logisticsStatus",
      label: "Estado logístico",
      options: [
        "En Origen",
        "Navegando",
        "En Tránsito",
        "En Aduana",
        "Aduana",
        "Liberado",
        "Entregado",
      ],
    },
    { key: "courier", label: "Courier" },
    { key: "bl", label: "BL marítimo" },
    { key: "phone", label: "Teléfono / WhatsApp" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "notes",
      label: "Notas del cliente / operación",
      type: "textarea",
      wide: true,
    },
  ],
  partners: [
    { key: "firstName", label: "Nombre", required: true },
    { key: "lastName", label: "Apellido", required: true },
    { key: "role", label: "Rol" },
    { key: "cuil", label: "CUIL" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Teléfono" },
    { key: "account1", label: "Cuenta 1", wide: true },
    { key: "account2", label: "Cuenta 2", wide: true },
    { key: "account3", label: "Cuenta 3", wide: true },
    { key: "notes", label: "Notas", type: "textarea", wide: true },
  ],
  marketing: [
    { key: "name", label: "Nombre de campaña", required: true, wide: true },
    { key: "type", label: "Servicio", options: ["Marítimo", "Aéreo"] },
    {
      key: "status",
      label: "Estado",
      options: ["Borrador", "Activa", "Pausada", "Finalizada"],
    },
    { key: "date", label: "Fecha", type: "date" },
    {
      key: "channel",
      label: "Canal",
      options: ["Instagram", "Facebook", "WhatsApp", "Google", "Email", "Otro"],
    },
    {
      key: "image",
      label: "URL de imagen (o adjuntá un archivo abajo)",
      type: "url",
      wide: true,
    },
    {
      key: "notes",
      label: "Descripción / texto de la campaña",
      type: "textarea",
      wide: true,
    },
  ],
  company: [
    { key: "name", label: "Razón social / nombre", required: true, wide: true },
    { key: "cuit", label: "CUIT" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Teléfono" },
    { key: "address", label: "Dirección" },
    { key: "bank", label: "Banco" },
    { key: "cbu", label: "CBU / CVU" },
    { key: "alias", label: "Alias bancario", wide: true },
  ],
};
const labels: Record<string, string> = {
  bankTransactions: "movimiento bancario",
  transactions: "movimiento de caja",
  contracts: "cliente / operación",
  partners: "socio",
  marketing: "campaña",
  company: "datos de empresa",
};
function badge(text: string) {
  return (
    <span
      className={`badge ${/Completado|Entregado|Liberado|Activa|Finalizado/.test(text || "") ? "green" : /Parcial|Aduana|Pendiente/.test(text || "") ? "amber" : "blue"}`}
    >
      {text || "Sin definir"}
    </span>
  );
}
function download(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initial(col: string): Row {
  const row: Row = {};
  for (const f of schemas[col]) row[f.key] = f.options?.[0] || "";
  if ("date" in row) row.date = today();
  if (col === "bankTransactions") {
    row.currency = "ARS";
    row.medium = "Transferencia";
  }
  if (col === "contracts") {
    row.estadoPago = payments[0];
    row.status = "Cotizado";
    row.logisticsStatus = "En Origen";
  }
  return row;
}
function validate(col: string, row: Row) {
  for (const f of schemas[col]) {
    if (f.required && String(row[f.key] ?? "").trim() === "")
      return `Completá ${f.label.toLowerCase()}.`;
    if (f.type === "date" && row[f.key] && !isoDate(row[f.key]))
      return `Revisá ${f.label.toLowerCase()}.`;
    if (
      f.type === "number" &&
      row[f.key] !== "" &&
      (!Number.isFinite(Number(row[f.key])) || Number(row[f.key]) < 0)
    )
      return "El monto debe ser un número válido y positivo.";
  }
  if (
    (col === "bankTransactions" || col === "transactions") &&
    Number(row.amount) <= 0
  )
    return "El monto debe ser mayor a cero.";
  if (col === "bankTransactions" && !["ingreso", "egreso"].includes(row.type))
    return "Seleccioná ingreso o egreso.";
  return "";
}
function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({
  label = "Sin registros todavía",
  action,
}: {
  label?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Layers3 size={30} />
      <h3>{label}</h3>
      <p>Agregá un registro para comenzar.</p>
      {action}
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: any;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={19} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function FlowChart({ rows }: { rows: Row[] }) {
  const grouped: Record<string, Row[]> = {};
  rows.forEach((r) => {
    const k = String(r.date || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(k)) (grouped[k] ??= []).push(r);
  });
  const months = Object.keys(grouped).sort().slice(-6);
  const values = months.map((m) => totals(grouped[m]));
  const max = Math.max(1, ...values.flatMap((t) => [t.income, t.expense]));
  if (!months.length)
    return <Empty label="El flujo aparecerá con tus movimientos" />;
  return (
    <>
      <div className="chart-legend">
        <span>
          <i className="dot green" />
          Ingresos
        </span>
        <span>
          <i className="dot purple" />
          Egresos
        </span>
        <small>ARS · últimos meses con registros</small>
      </div>
      <div className="flow-chart">
        {[1, 0.75, 0.5, 0.25].map((r, i) => (
          <div
            className="chart-line"
            key={r}
            style={{ bottom: `${r * 172 + 32}px` }}
          >
            <small>
              {new Intl.NumberFormat("es-AR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(max * r)}
            </small>
          </div>
        ))}
        <div className="bars">
          {months.map((m, i) => (
            <div className="month-bars" key={m}>
              <div className="bar-pair">
                <div
                  className="bar income"
                  style={{
                    height: `${Math.max(2, (values[i].income / max) * 172)}px`,
                  }}
                  title={`Ingresos ${currency(values[i].income)}`}
                />
                <div
                  className="bar expense"
                  style={{
                    height: `${Math.max(2, (values[i].expense / max) * 172)}px`,
                  }}
                  title={`Egresos ${currency(values[i].expense)}`}
                />
              </div>
              <span>
                {new Date(m + "-02T12:00:00Z").toLocaleDateString("es-AR", {
                  month: "short",
                })}{" "}
                {m.slice(2, 4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
export default function Dashboard() {
  const store = useDashboard();
  const { data, company, status, error, setError, demo, busy } = store;
  const [tab, setTab] = useState("general"),
    [sidebar, setSidebar] = useState(false),
    [query, setQuery] = useState("");
  const [direction, setDirection] = useState("todos"),
    [medium, setMedium] = useState("todos"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [service, setService] = useState("todos");
  const [page, setPage] = useState(1),
    [toast, setToast] = useState("");
  const [editor, setEditor] = useState<{
      col: string;
      id?: string;
      row: Row;
      previewIndex?: number;
    } | null>(null),
    [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<{ col: string; row: Row } | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false),
    [preview, setPreview] = useState<Row[]>([]),
    [rejected, setRejected] = useState<Row[]>([]),
    [fileName, setFileName] = useState(""),
    [fileBusy, setFileBusy] = useState(false),
    [importAccount, setImportAccount] = useState("Galicia · CC 1511970403");
  const fileRef = useRef<HTMLInputElement>(null);
  const heading = navigation.find((n) => n.id === tab)!;
  const bank = data.bankTransactions || [],
    contracts = data.contracts || [],
    cash = data.transactions || [];
  const bankTotals = totals(bank),
    cashTotals = totals(cash);
  const normalizedContracts = contracts.map((c) => ({
    ...c,
    eta: c.eta || "",
    logisticsStatus:
      c.logisticsStatus ||
      (c.status === "Finalizado"
        ? c.type === "Aéreo"
          ? "Entregado"
          : "Liberado"
        : c.status === "En Aduana"
          ? "En Aduana"
          : c.status === "En Curso"
            ? c.type === "Aéreo"
              ? "En Tránsito"
              : "Navegando"
            : "En Origen"),
    estadoPago: c.estadoPago || payments[0],
  }));
  const due = normalizedContracts.filter((c) => c.estadoPago !== payments[2]);
  const matches = (row: Row) =>
    !query ||
    Object.values(row).some(
      (v) =>
        typeof v !== "object" &&
        String(v).toLowerCase().includes(query.toLowerCase()),
    );
  const filteredBank = bank
    .filter(
      (r) =>
        matches(r) &&
        (direction === "todos" || r.type === direction) &&
        (medium === "todos" || r.medium === medium) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to),
    )
    .sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        String(a.id).localeCompare(String(b.id)),
    );
  const filteredCash = cash
    .filter(
      (r) =>
        matches(r) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        (direction === "todos" || r.type === direction),
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const filteredContracts = normalizedContracts.filter(
    (r) => matches(r) && (service === "todos" || r.type === service),
  );
  const existingIds = useMemo(() => new Set(bank.map((r) => r.id)), [bank]);
  const selectedPreview = preview.filter(
    (r) => r.selected && !existingIds.has(r.id),
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(
    () => setPage(1),
    [tab, query, direction, medium, from, to, service],
  );
  useEffect(() => {
    if (editor || importOpen || deleting) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editor, importOpen, deleting]);
  useEffect(() => {
    if (!editor && !importOpen && !deleting) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialogs = document.querySelectorAll<HTMLElement>("[role=dialog]");
    const dialog = dialogs[dialogs.length - 1];
    const selector =
      "button:not([disabled]),input:not([disabled]):not([hidden]),select:not([disabled]),textarea:not([disabled]),a[href]";
    dialog?.querySelector<HTMLElement>(selector)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !fileBusy) {
        if (editor) setEditor(null);
        else if (deleting) setDeleting(null);
        else setImportOpen(false);
      }
      if (event.key === "Tab" && dialog) {
        const elements = Array.from(
          dialog.querySelectorAll<HTMLElement>(selector),
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [editor !== null, importOpen, deleting !== null, busy, fileBusy]);
  function navigate(id: string) {
    setTab(id);
    setSidebar(false);
    setQuery("");
    setDirection("todos");
    setMedium("todos");
    setFrom("");
    setTo("");
    setService("todos");
  }
  function edit(col: string, row?: Row, previewIndex?: number) {
    setFormError("");
    setEditor({
      col,
      id: row?.id,
      row: { ...initial(col), ...row },
      previewIndex,
    });
  }
  async function saveEditor(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const problem = validate(editor.col, editor.row);
    if (problem) {
      setFormError(problem);
      return;
    }
    const payload = { ...editor.row };
    for (const f of schemas[editor.col])
      if (f.type === "number") payload[f.key] = Number(payload[f.key] || 0);
    if (editor.previewIndex !== undefined) {
      const index = editor.previewIndex;
      setPreview((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...payload } : r)),
      );
      setEditor(null);
      return;
    }
    if (await store.save(editor.col, payload, editor.id)) {
      setEditor(null);
      setToast("Cambios guardados.");
    }
  }
  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setFileBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw new Error(
          "Elegí un archivo .xlsx. Podés guardar un .xls como .xlsx desde Excel o LibreOffice.",
        );
      if (file.size > 15 * 1024 * 1024)
        throw new Error(
          "El archivo supera 15 MB. Dividilo en períodos más pequeños.",
        );
      if (!importAccount.trim())
        throw new Error(
          "Indicá la cuenta propia antes de seleccionar el archivo.",
        );
      const ExcelModule = await import("exceljs");
      const Excel = ExcelModule.default || ExcelModule;
      const book = new Excel.Workbook();
      await book.xlsx.load(await file.arrayBuffer());
      let parsed: any = null;
      let sheetName = "";
      for (const sheet of book.worksheets) {
        const rows: any[][] = [];
        sheet.eachRow({ includeEmpty: true }, (row) =>
          rows.push(
            Array.from(
              { length: sheet.columnCount },
              (_, i) => row.getCell(i + 1).value,
            ),
          ),
        );
        try {
          parsed = parseBankRows(rows, {
            date1904: book.properties.date1904,
            account: importAccount.trim(),
            fileName: file.name,
          });
          sheetName = sheet.name;
          break;
        } catch {}
      }
      if (!parsed)
        throw new Error(
          "No encontré una hoja con Fecha, Débitos y Créditos. Usá el extracto original.",
        );
      if (!parsed.records.length)
        throw new Error(
          `La hoja ${sheetName} no contiene movimientos válidos. Revisá fechas y montos.`,
        );
      const records = await Promise.all(
        parsed.records.map(async (r: Row) => ({
          ...r,
          id: await sourceId(r.sourceIdentity),
          sourceSheet: sheetName,
        })),
      );
      setPreview(records);
      setRejected(parsed.rejected);
      setFileName(file.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFileBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function confirmImport() {
    for (const row of selectedPreview) {
      const problem = validate("bankTransactions", row);
      if (problem) {
        setError(`Fila ${row.sourceRow}: ${problem}`);
        return;
      }
    }
    if (!selectedPreview.length) return;
    const result = await store.importBank(selectedPreview);
    if (result.ok) {
      setImportOpen(false);
      setPreview([]);
      setToast(
        `${result.added} movimientos importados. ${result.skipped} duplicados omitidos.`,
      );
      navigate("bancos");
    } else if (result.added)
      setToast(
        `Se guardaron ${result.added} movimientos antes del error. Podés reintentar: los ya guardados se omiten.`,
      );
  }
  const actions = (col: string, row: Row) => (
    <div className="row-actions">
      <button
        className="icon-button"
        title="Editar registro"
        aria-label={`Editar ${row.desc || row.client || row.name || row.firstName || "registro"}`}
        onClick={() => edit(col, row)}
      >
        <Pencil size={15} />
      </button>
      <button
        className="icon-button danger"
        title="Eliminar registro"
        aria-label="Eliminar registro"
        onClick={() => setDeleting({ col, row })}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  const newButton = (col: string, text = "Agregar") => (
    <button className="button primary" onClick={() => edit(col)}>
      <Plus size={17} />
      {text}
    </button>
  );
  function exportRows(rows: Row[], name: string) {
    if (!rows.length) {
      setToast("No hay movimientos para exportar.");
      return;
    }
    download(
      `${name}.csv`,
      csvText(rows, [
        { key: "date", label: "Fecha" },
        { key: "type", label: "Ingreso / egreso" },
        { key: "amount", label: "Monto ARS" },
        { key: "medium", label: "Medio" },
        { key: "desc", label: "Concepto" },
        { key: "counterparty", label: "Origen / destino" },
        { key: "entity", label: "Banco / billetera" },
        { key: "account", label: "Cuenta propia" },
        { key: "category", label: "Categoría" },
        { key: "cat", label: "Categoría caja" },
        { key: "reference", label: "Comprobante" },
        { key: "notes", label: "Notas" },
      ]),
      "text/csv;charset=utf-8",
    );
  }
  function moneyTable(rows: Row[], col: string, compact = false) {
    const pages = Math.max(1, Math.ceil(rows.length / 12));
    const current = Math.min(page, pages);
    const visible = compact
      ? rows.slice(0, 5)
      : rows.slice((current - 1) * 12, current * 12);
    return (
      <>
        {!rows.length ? (
          <Empty action={newButton(col)} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto / origen o destino</th>
                    <th>Medio</th>
                    {!compact && <th>Banco / billetera</th>}
                    <th>Tipo</th>
                    <th className="right">Monto · ARS</th>
                    {!compact && <th />}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap muted">{dateLabel(r.date)}</td>
                      <td>
                        <strong>{r.desc || "Sin concepto"}</strong>
                        <small>
                          {r.counterparty ||
                            r.category ||
                            r.cat ||
                            "Sin categoría"}
                        </small>
                      </td>
                      <td>
                        <span className="medium">
                          {r.medium || "Por confirmar"}
                        </span>
                      </td>
                      {!compact && (
                        <td className="muted">
                          {r.entity || "Sin identificar"}
                        </td>
                      )}
                      <td>
                        <span
                          className={`direction ${r.type === "ingreso" ? "positive" : "negative"}`}
                        >
                          {r.type === "ingreso" ? (
                            <ArrowDownLeft size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}{" "}
                          {r.type === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td
                        className={`right amount ${r.type === "ingreso" ? "positive" : "negative"}`}
                      >
                        {r.type === "ingreso" ? "+" : "−"}
                        {currency(r.amount)}
                      </td>
                      {!compact && <td>{actions(col, r)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!compact && (
              <div className="pagination">
                <span>
                  {rows.length} movimientos ·{" "}
                  {Math.min((current - 1) * 12 + 1, rows.length)}–
                  {Math.min(current * 12, rows.length)}
                </span>
                <div>
                  <button
                    className="icon-button"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {current} / {pages}
                  </span>
                  <button
                    className="icon-button"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }
  const subtitle: Record<string, string> = {
    general: "Tu negocio, con toda la información en un solo lugar.",
    operaciones: "Seguí cada envío, su llegada y el estado del pago.",
    clientes: "Contactos, seguimiento comercial y operaciones vinculadas.",
    bancos: "Cada ingreso y egreso, con su origen y destino.",
    caja: "Controlá los movimientos de caja de tu empresa.",
    marketing: "Organizá las campañas que hacen crecer tu negocio.",
    empresa: "Administrá tus datos y las personas de tu equipo.",
  };
  return (
    <div className="app-shell">
      {sidebar && (
        <div className="sidebar-overlay" onClick={() => setSidebar(false)} />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("general");
          }}
        >
          <span className="brand-mark">
            N<span />
          </span>
          <div>
            NEFA<small>BUSINESS WORKSPACE</small>
          </div>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">DC</span>
          <div>
            <strong>{company.name || "De China al Mundo"}</strong>
            <small>Centro de operaciones</small>
          </div>
        </div>
        <nav>
          {navigation.map((n) => (
            <React.Fragment key={n.id}>
              {n.group && <p className="nav-group">{n.group}</p>}
              <button
                className={tab === n.id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.id === "operaciones" && <em>{contracts.length}</em>}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={20} />
            <strong>Tu empresa, conectada</strong>
            <p>Importá, organizá y consultá tus movimientos.</p>
            <button
              onClick={() => {
                navigate("bancos");
                setImportOpen(true);
              }}
            >
              Importar extracto <ArrowRight size={15} />
            </button>
          </div>
          <div className="user-card">
            <span className="user-avatar">FS</span>
            <div>
              <strong>Administración</strong>
              <small>NEFA · Espacio de trabajo</small>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(true)}
              aria-label="Abrir menú"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{heading.label}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection ${status === "Conectado" ? "connected" : ""}`}
            >
              <i />
              {status}
            </span>
            <span className="top-avatar">FS</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                DE CHINA AL MUNDO / GESTIÓN EMPRESARIAL
              </div>
              <h1>
                {heading.label}
                <span>.</span>
              </h1>
              <p>{subtitle[tab]}</p>
            </div>
            <div className="heading-actions">
              {tab === "bancos" ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload size={17} />
                    Importar extracto
                  </button>
                  {newButton("bankTransactions", "Nuevo movimiento")}
                </>
              ) : tab === "operaciones" || tab === "clientes" ? (
                newButton(
                  "contracts",
                  tab === "clientes" ? "Nuevo cliente" : "Nueva operación",
                )
              ) : tab === "caja" ? (
                newButton("transactions", "Nuevo movimiento")
              ) : tab === "marketing" ? (
                newButton("marketing", "Nueva campaña")
              ) : tab === "empresa" ? (
                <button
                  className="button primary"
                  onClick={() => edit("company", company)}
                >
                  <Pencil size={16} />
                  Editar empresa
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() => {
                    navigate("bancos");
                    setImportOpen(true);
                  }}
                >
                  <Upload size={17} />
                  Importar extracto
                </button>
              )}
            </div>
          </div>
          {demo && (
            <div className="demo-banner">
              <Layers3 size={16} />
              <strong>Vista de demostración</strong> · Datos ficticios. Los
              cambios de esta vista no se guardan en Firebase.
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>No se pudo completar la acción</strong>
                <p>{error}</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Cerrar error"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {status === "Conectando" || status === "Sincronizando" ? (
            <div className="sync-hint">
              <RefreshCw size={14} className="spin" />
              Conectando con tus datos…
            </div>
          ) : null}
          {tab === "general" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Ingresos bancarios"
                  value={currency(bankTotals.income)}
                  detail="Todos los movimientos registrados"
                  icon={ArrowDownLeft}
                  tone="green"
                />
                <Stat
                  label="Egresos bancarios"
                  value={currency(bankTotals.expense)}
                  detail="Todos los movimientos registrados"
                  icon={ArrowUpRight}
                  tone="purple"
                />
                <Stat
                  label="Flujo neto bancario"
                  value={currency(bankTotals.net)}
                  detail="Ingresos − egresos · no es saldo bancario"
                  icon={Wallet}
                />
                <Stat
                  label="Operaciones activas"
                  value={String(
                    contracts.filter((c) => c.status !== "Finalizado").length,
                  ).padStart(2, "0")}
                  detail={`${due.length} con cobro por completar`}
                  icon={Ship}
                  tone="amber"
                />
              </div>
              <div className="overview-grid">
                <Section
                  title="Flujo de dinero"
                  subtitle="Ingresos y egresos bancarios por mes"
                  action={<span className="quiet-label">ARS</span>}
                >
                  <FlowChart rows={bank} />
                </Section>
                <Section
                  title="Estado de operaciones"
                  subtitle="Seguimiento de cobros · USD"
                >
                  <div className="operation-summary">
                    <div className="donut">
                      <svg
                        className="donut-ring"
                        viewBox="0 0 120 120"
                        role="img"
                        aria-label={`${normalizedContracts.filter((c) => c.estadoPago === payments[2]).length} de ${contracts.length} pagos completados`}
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#273047"
                          strokeWidth="12"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#75e5c2"
                          strokeWidth="12"
                          transform="rotate(-90 60 60)"
                          strokeDasharray={`${(normalizedContracts.filter((c) => c.estadoPago === payments[2]).length / Math.max(contracts.length, 1)) * 339.292} 339.292`}
                        />
                      </svg>
                      <div>
                        <strong>{contracts.length}</strong>
                        <span>operaciones</span>
                      </div>
                    </div>
                    <div className="status-lines">
                      {payments.map((p, i) => (
                        <div key={p}>
                          <span>
                            <i
                              className={`dot ${["amber", "purple", "green"][i]}`}
                            />
                            {p.replace(" de Pago", "")}
                          </span>
                          <strong>
                            {
                              normalizedContracts.filter(
                                (c) => c.estadoPago === p,
                              ).length
                            }
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="note-box">
                    Los importes de operaciones se registran en USD y se
                    mantienen separados de caja y bancos en ARS.
                  </div>
                </Section>
              </div>
              <Section
                title="Últimos movimientos bancarios"
                subtitle="Lo más reciente de tu cuenta"
                action={
                  <button
                    className="text-button"
                    onClick={() => navigate("bancos")}
                  >
                    Ver todos <ArrowRight size={16} />
                  </button>
                }
              >
                {moneyTable(
                  [...bank].sort((a, b) =>
                    String(b.date).localeCompare(String(a.date)),
                  ),
                  "bankTransactions",
                  true,
                )}
              </Section>
              <div className="overview-bottom">
                <Section
                  title="Próximas llegadas"
                  subtitle="Operaciones con fecha estimada"
                >
                  <div className="arrival-list">
                    {normalizedContracts
                      .filter(
                        (c) =>
                          c.eta &&
                          !["Liberado", "Entregado"].includes(
                            c.logisticsStatus,
                          ),
                      )
                      .sort((a, b) => a.eta.localeCompare(b.eta))
                      .slice(0, 3)
                      .map((c) => (
                        <button key={c.id} onClick={() => edit("contracts", c)}>
                          <span className="arrival-icon">
                            {c.type === "Aéreo" ? (
                              <Plane size={19} />
                            ) : (
                              <Ship size={19} />
                            )}
                          </span>
                          <div>
                            <strong>{c.client}</strong>
                            <small>{c.note || c.type}</small>
                          </div>
                          <span>{dateLabel(c.eta)}</span>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    {!normalizedContracts.some(
                      (c) =>
                        c.eta &&
                        !["Liberado", "Entregado"].includes(c.logisticsStatus),
                    ) && (
                      <p className="empty-inline">Sin llegadas programadas.</p>
                    )}
                  </div>
                </Section>
                <div className="quick-card">
                  <span>MENOS TAREAS, MÁS CONTROL</span>
                  <h2>
                    Tu extracto.
                    <br />
                    Todo organizado.
                  </h2>
                  <p>
                    Subí el archivo del banco, revisá los movimientos y confirmá
                    la importación.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => {
                      navigate("bancos");
                      setImportOpen(true);
                    }}
                  >
                    Importar mi extracto <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
          {(tab === "bancos" || tab === "caja") &&
            (() => {
              const isBank = tab === "bancos";
              const rows = isBank ? filteredBank : filteredCash;
              const values = totals(rows);
              const col = isBank ? "bankTransactions" : "transactions";
              return (
                <>
                  <div className="stats-grid three">
                    <Stat
                      label="Ingresos del filtro"
                      value={currency(values.income)}
                      detail={`${rows.filter((r) => r.type === "ingreso").length} movimientos`}
                      icon={ArrowDownLeft}
                      tone="green"
                    />
                    <Stat
                      label="Egresos del filtro"
                      value={currency(values.expense)}
                      detail={`${rows.filter((r) => r.type === "egreso").length} movimientos`}
                      icon={ArrowUpRight}
                      tone="purple"
                    />
                    <Stat
                      label="Flujo neto del filtro"
                      value={currency(values.net)}
                      detail="No incluye el saldo inicial de la cuenta"
                      icon={Wallet}
                    />
                  </div>
                  {isBank && (
                    <div className="import-strip">
                      <span className="import-icon">
                        <FileSpreadsheet size={24} />
                      </span>
                      <div>
                        <strong>Del extracto al dashboard, en un paso</strong>
                        <p>
                          Excel bancario · Vista previa editable · Control de
                          duplicados
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setImportOpen(true)}
                      >
                        <Upload size={16} />
                        Seleccionar archivo
                      </button>
                    </div>
                  )}
                  <Section
                    title={
                      isBank ? "Movimientos bancarios" : "Movimientos de caja"
                    }
                    subtitle={
                      isBank
                        ? "Cuenta, medio y origen o destino en cada registro"
                        : "Caja se administra por separado de los movimientos bancarios"
                    }
                    action={
                      <button
                        className="button small secondary"
                        onClick={() =>
                          exportRows(
                            rows,
                            isBank ? "movimientos_bancarios" : "caja",
                          )
                        }
                      >
                        <Download size={15} />
                        Exportar CSV
                      </button>
                    }
                  >
                    <div className="filters">
                      <label className="search-field">
                        <Search size={17} />
                        <input
                          placeholder="Buscar concepto, persona, banco…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          aria-label="Buscar movimientos"
                        />
                      </label>
                      <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        aria-label="Filtrar tipo"
                      >
                        <option value="todos">Todos los tipos</option>
                        <option value="ingreso">Ingresos</option>
                        <option value="egreso">Egresos</option>
                      </select>
                      {isBank && (
                        <select
                          value={medium}
                          onChange={(e) => setMedium(e.target.value)}
                          aria-label="Filtrar medio"
                        >
                          <option value="todos">Todos los medios</option>
                          {Array.from(
                            new Set([
                              ...media,
                              ...bank.map((r) => r.medium).filter(Boolean),
                            ]),
                          ).map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      )}
                      <label className="date-filter">
                        Desde
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label className="date-filter">
                        Hasta
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                      {(query ||
                        from ||
                        to ||
                        direction !== "todos" ||
                        medium !== "todos") && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setQuery("");
                            setFrom("");
                            setTo("");
                            setDirection("todos");
                            setMedium("todos");
                          }}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    {moneyTable(rows, col)}
                  </Section>
                </>
              );
            })()}
          {(tab === "operaciones" || tab === "clientes") && (
            <>
              <div className="stats-grid three">
                <Stat
                  label="Registros comerciales"
                  value={String(contracts.length).padStart(2, "0")}
                  detail="Un registro por cliente / operación"
                  icon={Users}
                />
                <Stat
                  label="Operaciones marítimas"
                  value={String(
                    contracts.filter((c) => c.type === "Marítimo").length,
                  ).padStart(2, "0")}
                  detail="Seguimiento de contenedores"
                  icon={Ship}
                  tone="purple"
                />
                <Stat
                  label="Operaciones aéreas"
                  value={String(
                    contracts.filter((c) => c.type === "Aéreo").length,
                  ).padStart(2, "0")}
                  detail="Envíos courier"
                  icon={Plane}
                  tone="green"
                />
              </div>
              <Section
                title={
                  tab === "clientes"
                    ? "Cartera comercial"
                    : "Seguimiento de operaciones"
                }
                subtitle="Clientes y operaciones comparten el registro comercial original"
                action={
                  <div className="segmented">
                    {["todos", "Marítimo", "Aéreo"].map((t) => (
                      <button
                        className={service === t ? "selected" : ""}
                        key={t}
                        onClick={() => setService(t)}
                      >
                        {t === "todos" ? "Todos" : t}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="filters">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      placeholder="Buscar cliente, guía, contenedor…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Buscar clientes u operaciones"
                    />
                  </label>
                  <span className="quiet-label">
                    {filteredContracts.length} registros
                  </span>
                </div>
                {!filteredContracts.length ? (
                  <Empty action={newButton("contracts")} />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente / operación</th>
                          <th>Servicio</th>
                          <th>
                            {tab === "clientes"
                              ? "Contacto"
                              : "Llegada estimada"}
                          </th>
                          <th>Estado</th>
                          <th>Pago</th>
                          <th className="right">Importe · USD</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContracts.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <strong>{c.client}</strong>
                              <small>{c.note || "Sin identificador"}</small>
                            </td>
                            <td>
                              <span className="service-tag">
                                {c.type === "Aéreo" ? (
                                  <Plane size={15} />
                                ) : (
                                  <Ship size={15} />
                                )}{" "}
                                {c.type}
                              </span>
                            </td>
                            <td className="muted">
                              {tab === "clientes" ? (
                                <>
                                  {c.phone || "Sin teléfono"}
                                  <small>{c.email || "Sin email"}</small>
                                </>
                              ) : (
                                dateLabel(c.eta)
                              )}
                            </td>
                            <td>
                              {badge(
                                tab === "clientes"
                                  ? c.status
                                  : c.logisticsStatus,
                              )}
                            </td>
                            <td>{badge(c.estadoPago)}</td>
                            <td className="right amount">
                              {currency(c.amount, "USD")}
                            </td>
                            <td>{actions("contracts", c)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </>
          )}
          {tab === "marketing" && (
            <>
              <div className="stats-grid three">
                <Stat
                  label="Campañas"
                  value={String(data.marketing.length).padStart(2, "0")}
                  detail="Todas tus acciones comerciales"
                  icon={Megaphone}
                />
                <Stat
                  label="Activas"
                  value={String(
                    data.marketing.filter((c) => c.status === "Activa").length,
                  ).padStart(2, "0")}
                  detail="Campañas en circulación"
                  icon={CheckCircle2}
                  tone="green"
                />
                <Stat
                  label="En preparación"
                  value={String(
                    data.marketing.filter(
                      (c) => !c.status || c.status === "Borrador",
                    ).length,
                  ).padStart(2, "0")}
                  detail="Borradores para seguir trabajando"
                  icon={Pencil}
                  tone="purple"
                />
              </div>
              <div className="campaign-grid">
                {data.marketing.filter(matches).map((c, i) => (
                  <article className="campaign-card" key={c.id}>
                    <div className={`campaign-art art-${i % 3}`}>
                      {c.image ? (
                        <img src={c.image} alt={c.name} />
                      ) : (
                        <>
                          <span>DE CHINA AL MUNDO</span>
                          {c.type === "Aéreo" ? (
                            <Plane size={66} strokeWidth={1} />
                          ) : (
                            <Ship size={66} strokeWidth={1} />
                          )}
                          <strong>{c.name}</strong>
                          <small>Tu negocio, sin fronteras.</small>
                        </>
                      )}
                      <div className="art-badge">
                        {badge(c.status || "Borrador")}
                      </div>
                    </div>
                    <div className="campaign-body">
                      <div className="campaign-meta">
                        {c.channel || "Canal sin definir"}{" "}
                        <span>· {dateLabel(c.date)}</span>
                      </div>
                      <h3>{c.name}</h3>
                      <p>
                        {c.notes || "Agregá la descripción de esta campaña."}
                      </p>
                      <div className="campaign-foot">
                        <span className="service-tag">{c.type}</span>
                        {actions("marketing", c)}
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  className="new-campaign"
                  onClick={() => edit("marketing")}
                >
                  <span>
                    <Plus size={28} />
                  </span>
                  <strong>Tu próxima campaña</strong>
                  <p>Una nueva oportunidad para crecer</p>
                </button>
              </div>
            </>
          )}
          {tab === "empresa" && (
            <>
              <div className="company-grid">
                <Section
                  title="Información de la empresa"
                  subtitle="Datos comerciales y de contacto"
                  action={
                    <button
                      className="icon-button"
                      title="Editar empresa"
                      onClick={() => edit("company", company)}
                    >
                      <Pencil size={17} />
                    </button>
                  }
                >
                  <div className="company-profile">
                    <span className="company-logo">DC</span>
                    <h2>{company.name || "Completá tu empresa"}</h2>
                    <p>{company.address || "Dirección por completar"}</p>
                  </div>
                  <dl className="detail-list">
                    {[
                      ["CUIT", "cuit"],
                      ["Email", "email"],
                      ["Teléfono", "phone"],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{company[key] || "Sin completar"}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
                <Section
                  title="Cuenta bancaria"
                  subtitle="Datos para cobrar y operar"
                  action={<Building2 size={21} className="muted" />}
                >
                  <div className="bank-card">
                    <div>
                      <Building2 size={23} />
                      <span>CUENTA DE LA EMPRESA</span>
                    </div>
                    <h3>{company.bank || "Agregá tu banco"}</h3>
                    <small>ALIAS</small>
                    <strong>{company.alias || "SIN COMPLETAR"}</strong>
                    <small>CBU / CVU</small>
                    <p className="mono">{company.cbu || "Sin completar"}</p>
                  </div>
                  <div className="bank-card-footer">
                    <span>Datos editables desde “Editar empresa”</span>
                    <button
                      className="text-button"
                      onClick={() => edit("company", company)}
                    >
                      Editar <Pencil size={14} />
                    </button>
                  </div>
                </Section>
              </div>
              <Section
                title="Socios y equipo"
                subtitle="Personas, roles y cuentas asociadas"
                action={newButton("partners", "Agregar socio")}
              >
                <div className="partners-grid">
                  {data.partners.map((s) => (
                    <div className="partner-card" key={s.id}>
                      <div className="partner-top">
                        <span className="partner-avatar">
                          {(s.firstName || "?")[0]}
                          {(s.lastName || "")[0]}
                        </span>
                        {actions("partners", s)}
                      </div>
                      <h3>
                        {s.firstName} {s.lastName}
                      </h3>
                      <p>{s.role || "Socio"}</p>
                      <dl>
                        {[
                          ["CUIL", s.cuil],
                          ["Email", s.email],
                          ["Teléfono", s.phone],
                          ["Cuenta 1", s.account1],
                          ["Cuenta 2", s.account2],
                          ["Cuenta 3", s.account3],
                        ]
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  ))}
                  {!data.partners.length && <Empty />}
                </div>
              </Section>
              <div className="backup-card">
                <div>
                  <Download size={23} />
                  <div>
                    <h3>Una copia de tu información</h3>
                    <p>
                      Descargá todos los registros y datos de empresa en JSON.
                    </p>
                  </div>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    download(
                      `NEFA_respaldo_${today()}.json`,
                      JSON.stringify(
                        {
                          version: 2,
                          exportedAt: new Date().toISOString(),
                          company,
                          ...data,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  Descargar respaldo
                </button>
              </div>
            </>
          )}
          <footer className="footer">
            <span>
              NEFA <b>Workspace</b> · De China al Mundo
            </span>
            <span>Importes en ARS y USD identificados por sección</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {importOpen && (
        <div className="modal-backdrop">
          <section
            className="modal import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow">FINANZAS BANCARIAS</span>
                <h2 id="import-title">Importar extracto</h2>
              </div>
              <button
                className="icon-button"
                disabled={busy || fileBusy}
                onClick={() => setImportOpen(false)}
                aria-label="Cerrar importación"
              >
                <X size={21} />
              </button>
            </header>
            <div className="modal-content">
              <div className="import-steps">
                <span className="active">
                  1 <b>Seleccionar archivo</b>
                </span>
                <i />
                <span className={preview.length ? "active" : ""}>
                  2 <b>Revisar movimientos</b>
                </span>
                <i />
                <span>
                  3 <b>Confirmar</b>
                </span>
              </div>
              {error && (
                <div className="error-banner" role="alert">
                  <AlertTriangle size={18} />
                  <p>{error}</p>
                </div>
              )}
              <div className="upload-zone">
                <FileSpreadsheet size={32} />
                <div>
                  <h3>{fileName || "Tu extracto bancario en Excel"}</h3>
                  <p>
                    Fecha, débitos y créditos. Lectura local del archivo .xlsx,
                    hasta 15 MB.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={fileBusy || busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={17} />
                  {fileBusy
                    ? "Leyendo…"
                    : preview.length
                      ? "Cambiar archivo"
                      : "Seleccionar archivo"}
                </button>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => readFile(e.target.files?.[0])}
                />
              </div>
              <label className="account-field">
                Cuenta propia del extracto
                <input
                  value={importAccount}
                  onChange={(e) => setImportAccount(e.target.value)}
                  disabled={!!preview.length || fileBusy || busy}
                />
                <small>
                  {preview.length
                    ? "Para cambiar la cuenta, limpiá la vista previa y volvé a seleccionar el archivo."
                    : "Se usa para distinguir importaciones de diferentes cuentas."}
                </small>
              </label>
              {preview.length > 0 && (
                <>
                  <div className="preview-stats">
                    <div>
                      <span>Movimientos leídos</span>
                      <strong>{preview.length}</strong>
                    </div>
                    <div>
                      <span>Ingresos del archivo</span>
                      <strong className="positive">
                        {currency(totals(preview).income)}
                      </strong>
                    </div>
                    <div>
                      <span>Egresos del archivo</span>
                      <strong className="negative">
                        {currency(totals(preview).expense)}
                      </strong>
                    </div>
                    <div>
                      <span>Ya importados</span>
                      <strong>
                        {preview.filter((r) => existingIds.has(r.id)).length}
                      </strong>
                    </div>
                  </div>
                  <div className="preview-note">
                    <AlertTriangle size={17} />
                    <p>
                      El medio y la categoría se sugieren desde el concepto.
                      Revisalos antes de importar. Los registros ya importados
                      se omiten y conservan sus ediciones.
                    </p>
                  </div>
                  {rejected.length > 0 && (
                    <div className="error-banner">
                      <p>
                        {rejected.length} filas rechazadas:{" "}
                        {rejected
                          .map((r) => `fila ${r.row}: ${r.reason}`)
                          .join("; ")}
                      </p>
                    </div>
                  )}
                  <div className="table-wrap preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              aria-label="Seleccionar todos los nuevos"
                              checked={
                                selectedPreview.length > 0 &&
                                selectedPreview.length ===
                                  preview.filter((r) => !existingIds.has(r.id))
                                    .length
                              }
                              onChange={(e) =>
                                setPreview((prev) =>
                                  prev.map((r) => ({
                                    ...r,
                                    selected: e.target.checked,
                                  })),
                                )
                              }
                            />
                          </th>
                          <th>Fecha</th>
                          <th>Concepto / origen o destino</th>
                          <th>Tipo</th>
                          <th>Medio</th>
                          <th className="right">Monto ARS</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr
                            key={r.id}
                            className={existingIds.has(r.id) ? "duplicate" : ""}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={!!r.selected && !existingIds.has(r.id)}
                                disabled={existingIds.has(r.id) || busy}
                                aria-label={`Seleccionar fila ${r.sourceRow}`}
                                onChange={(e) =>
                                  setPreview((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? { ...x, selected: e.target.checked }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="nowrap">{dateLabel(r.date)}</td>
                            <td>
                              <strong>{r.desc}</strong>
                              <small>
                                {existingIds.has(r.id)
                                  ? "Ya importado"
                                  : r.counterparty ||
                                    r.entity ||
                                    "Sin contraparte identificada"}
                              </small>
                            </td>
                            <td
                              className={
                                r.type === "ingreso" ? "positive" : "negative"
                              }
                            >
                              {r.type === "ingreso" ? "Ingreso" : "Egreso"}
                            </td>
                            <td>{r.medium}</td>
                            <td className="right amount">
                              {currency(r.amount)}
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                disabled={existingIds.has(r.id) || busy}
                                title="Editar antes de importar"
                                onClick={() => edit("bankTransactions", r, i)}
                              >
                                <Pencil size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="selected-summary">
                    <span>
                      {selectedPreview.length} movimientos seleccionados
                    </span>
                    <strong>
                      Neto a importar: {currency(totals(selectedPreview).net)}
                    </strong>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setPreview([]);
                        setRejected([]);
                        setFileName("");
                      }}
                    >
                      Limpiar vista previa
                    </button>
                  </div>
                </>
              )}
              {!preview.length && (
                <div className="import-explainer">
                  <div>
                    <CheckCircle2 size={19} />
                    <h3>Ingresos y egresos separados</h3>
                    <p>
                      Créditos como ingresos. Débitos como egresos. Sin sumar el
                      saldo de la cuenta.
                    </p>
                  </div>
                  <div>
                    <Pencil size={19} />
                    <h3>Todo revisable</h3>
                    <p>
                      Editá fechas, importes, medios, categorías y contrapartes
                      antes de confirmar.
                    </p>
                  </div>
                  <div>
                    <Layers3 size={19} />
                    <h3>Sin repetir el mismo extracto</h3>
                    <p>
                      Se conservan movimientos iguales legítimos y se omiten
                      filas ya importadas.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <span>Los datos se guardan al confirmar.</span>
              <button
                className="button secondary"
                disabled={busy || fileBusy}
                onClick={() => setImportOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={!selectedPreview.length || busy || fileBusy}
                onClick={confirmImport}
              >
                <Check size={17} />
                {busy
                  ? "Importando…"
                  : `Importar ${selectedPreview.length || ""} movimientos`}
              </button>
            </footer>
          </section>
        </div>
      )}
      {editor && (
        <div className="modal-backdrop editor-backdrop">
          <section
            className="modal editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <form onSubmit={saveEditor}>
              <header className="modal-head">
                <div>
                  <span className="eyebrow">
                    {editor.previewIndex !== undefined
                      ? "REVISIÓN DEL EXTRACTO"
                      : "NEFA WORKSPACE"}
                  </span>
                  <h2 id="editor-title">
                    {editor.id ? "Editar" : "Agregar"} {labels[editor.col]}
                  </h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                  aria-label="Cerrar editor"
                >
                  <X size={21} />
                </button>
              </header>
              <div className="modal-content">
                <div className="form-grid">
                  {schemas[editor.col].map((f) => (
                    <label key={f.key} className={f.wide ? "wide" : ""}>
                      {f.label}
                      {f.required && <span className="required"> *</span>}
                      {f.options ? (
                        <select
                          value={editor.row[f.key] ?? ""}
                          onChange={(e) =>
                            setEditor({
                              ...editor,
                              row: { ...editor.row, [f.key]: e.target.value },
                            })
                          }
                        >
                          {!f.options.includes(editor.row[f.key]) &&
                            editor.row[f.key] && (
                              <option>{editor.row[f.key]}</option>
                            )}
                          {f.options.map((v) => (
                            <option key={v} value={v}>
                              {v === "ingreso"
                                ? "Ingreso"
                                : v === "egreso"
                                  ? "Egreso"
                                  : v}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={editor.row[f.key] || ""}
                          onChange={(e) =>
                            setEditor({
                              ...editor,
                              row: { ...editor.row, [f.key]: e.target.value },
                            })
                          }
                        />
                      ) : (
                        <input
                          type={
                            f.type === "url" &&
                            String(editor.row[f.key]).startsWith("data:")
                              ? "text"
                              : f.type || "text"
                          }
                          required={f.required}
                          min={f.type === "number" ? 0 : undefined}
                          step={f.type === "number" ? "0.01" : undefined}
                          value={editor.row[f.key] ?? ""}
                          onChange={(e) =>
                            setEditor({
                              ...editor,
                              row: { ...editor.row, [f.key]: e.target.value },
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                {editor.col === "marketing" && (
                  <label className="image-upload">
                    Adjuntar imagen (hasta 600 KB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (
                          !["image/png", "image/jpeg", "image/webp"].includes(
                            f.type,
                          ) ||
                          f.size > 600 * 1024
                        ) {
                          setFormError("Usá PNG, JPG o WebP de hasta 600 KB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () =>
                          setEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  row: {
                                    ...prev.row,
                                    image: String(reader.result),
                                  },
                                }
                              : prev,
                          );
                        reader.readAsDataURL(f);
                      }}
                    />
                    {editor.row.image && (
                      <img
                        src={editor.row.image}
                        alt="Vista previa de campaña"
                      />
                    )}
                  </label>
                )}
                {(formError || error) && (
                  <div className="form-error" role="alert">
                    {formError || error}
                  </div>
                )}
              </div>
              <footer className="modal-footer">
                <span>* Campos obligatorios</span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Cancelar
                </button>
                <button className="button primary" disabled={busy}>
                  <Check size={17} />
                  {busy
                    ? "Guardando…"
                    : editor.previewIndex !== undefined
                      ? "Aplicar a vista previa"
                      : "Guardar cambios"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {deleting && (
        <div className="modal-backdrop editor-backdrop">
          <section
            className="modal delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="modal-content">
              <span className="delete-icon">
                <Trash2 size={24} />
              </span>
              <h2 id="delete-title">Eliminar registro</h2>
              <p>
                Se eliminará “
                {deleting.row.desc ||
                  deleting.row.client ||
                  deleting.row.name ||
                  deleting.row.firstName}
                ”. Esta acción no se puede deshacer.
              </p>
              {error && <p className="form-error">{error}</p>}
            </div>
            <footer className="modal-footer">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Cancelar
              </button>
              <button
                className="button destructive"
                disabled={busy}
                onClick={async () => {
                  if (await store.remove(deleting.col, deleting.row.id)) {
                    setDeleting(null);
                    setToast("Registro eliminado.");
                  }
                }}
              >
                {busy ? "Eliminando…" : "Eliminar registro"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
