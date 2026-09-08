function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "," || char === "\t") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  full_name: "name",
  contact_name: "name",
  business: "company",
  business_name: "company",
  company_name: "company",
  website: "domain",
  site: "domain",
  mobile: "phone",
  telephone: "phone",
  phone_number: "phone",
  email_address: "email",
  offer: "service",
  labels: "tags",
  note: "notes",
  notes_preview: "notes",
};

export function parseCsv(text: string) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? normalizeHeader(header));
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

export function toCsv(rows: Record<string, string | null | undefined>[], columns: string[]) {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escape(String(row[column] ?? ""))).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export const CONTACT_CSV_COLUMNS = [
  "name",
  "email",
  "company",
  "domain",
  "phone",
  "service",
  "tags",
  "notes",
] as const;
