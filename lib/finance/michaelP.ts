export const MICHAEL_P_RECORD_CATEGORIES = [
  "Receipt",
  "Expense",
  "Income",
  "Invoice",
  "Contract",
  "Bank statement",
  "Tax document",
  "Payroll record",
  "Vendor record",
  "Customer record",
  "Company report",
  "Other company document",
] as const;

export type MichaelPRecordCategory =
  (typeof MICHAEL_P_RECORD_CATEGORIES)[number];

export const MICHAEL_P_APPROVAL_RULES = [
  "Preserve every original document.",
  "Flag uncertain categories, duplicate records, missing dates, and unclear amounts for CEO review.",
  "Never make payments or transfer money.",
  "Never submit taxes or legal filings.",
  "Never delete originals or alter official records.",
  "Never finalize material accounting corrections without CEO approval.",
] as const;

export const MICHAEL_P_DEFAULT_FOLDERS = [
  "00 Inbox — Needs Review",
  "01 Income",
  "02 Expenses",
  "03 Receipts",
  "04 Invoices",
  "05 Banking",
  "06 Contracts",
  "07 Taxes",
  "08 Reports",
  "09 Audit History",
] as const;
