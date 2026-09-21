/**
 * Clean a DigiSol Hub contacts CSV: validate emails, drop typo domains, dedupe.
 *
 * Usage:
 *   node scripts/clean-contacts.mjs [input] [output]
 *   npm run clean-contacts -- [input] [output]
 *
 * Defaults: ./contacts.csv → ./cleaned-contacts.csv
 */
import fs from "node:fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

const CONTACT_CSV_COLUMNS = [
  "name",
  "email",
  "company",
  "domain",
  "phone",
  "service",
  "tags",
  "notes",
  "campaign_channel",
  "ab_variant",
];

const EMAIL_ALIASES = [
  "email",
  "e-mail",
  "email address",
  "email_address",
  "emailaddress",
  "mail",
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SUSPICIOUS_DOMAINS = ["gamil.com", "gmial.com", "yaho.com", "hotmai.com"];

const INPUT_FILE = process.argv[2] || "./contacts.csv";
const OUTPUT_FILE = process.argv[3] || "./cleaned-contacts.csv";

function resolveEmailColumn(record) {
  const keys = Object.keys(record);
  const lowerMap = new Map(keys.map((key) => [key.trim().toLowerCase(), key]));

  for (const alias of EMAIL_ALIASES) {
    const match = lowerMap.get(alias);
    if (match) return match;
  }

  return keys.find((key) => /e[\s_-]?mail/i.test(key.trim())) || "email";
}

function pickHubFields(record, email) {
  const lowerMap = new Map(
    Object.entries(record).map(([key, value]) => [key.trim().toLowerCase(), value])
  );

  const out = { email };
  for (const column of CONTACT_CSV_COLUMNS) {
    if (column === "email") continue;
    if (!lowerMap.has(column)) continue;
    const value = lowerMap.get(column);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      out[column] = String(value).trim();
    }
  }

  return out;
}

async function cleanList() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const records = [];
  let totalProcessed = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let emailColumn = null;
  const seenEmails = new Set();

  console.log(`Reading and processing: ${INPUT_FILE}`);

  const parser = fs.createReadStream(INPUT_FILE).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
  );

  for await (const record of parser) {
    totalProcessed++;

    if (!emailColumn) {
      emailColumn = resolveEmailColumn(record);
    }

    const raw = record[emailColumn];
    const email = raw ? String(raw).trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      invalidCount++;
      continue;
    }

    const domain = email.split("@")[1];
    if (SUSPICIOUS_DOMAINS.includes(domain)) {
      invalidCount++;
      continue;
    }

    if (seenEmails.has(email)) {
      duplicateCount++;
      continue;
    }

    seenEmails.add(email);
    records.push(pickHubFields(record, email));
  }

  const columns =
    records.length > 0
      ? CONTACT_CSV_COLUMNS.filter((column) =>
          records.some((row) => Object.prototype.hasOwnProperty.call(row, column))
        )
      : ["email"];

  const output = await new Promise((resolve, reject) => {
    stringify(records, { header: true, columns }, (err, csv) => {
      if (err) reject(err);
      else resolve(csv);
    });
  });

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log("\n--- Cleanup Complete ---");
  console.log(`Email column used: ${emailColumn || "(none)"}`);
  console.log(`Total rows processed: ${totalProcessed}`);
  console.log(`Invalid/typo emails removed: ${invalidCount}`);
  console.log(`Duplicate emails removed: ${duplicateCount}`);
  console.log(`Clean contacts saved to: ${OUTPUT_FILE}`);
}

cleanList().catch((err) => {
  console.error(err);
  process.exit(1);
});
