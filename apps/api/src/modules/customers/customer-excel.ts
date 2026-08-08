import * as XLSX from 'xlsx';

export type ImportRowError = {
  row: number;
  reason: string;
};

export type ParsedImportRow = {
  row: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags: string[];
  status?: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'CHURNED';
};

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'customer name', 'customer'],
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'cell', 'cellphone', 'tel'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  tags: ['tags', 'tag', 'labels', 'label'],
  notes: ['notes', 'note', 'comments', 'comment'],
  status: ['status', 'customer status'],
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^[+]?[\d\s-]+$/;
const VALID_STATUSES = new Set(['ACTIVE', 'AT_RISK', 'INACTIVE', 'CHURNED']);

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function resolveColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((h) => aliases.includes(h));
    if (index >= 0) map[field] = index;
  }
  return map;
}

export function parseCustomerExcel(buffer: Buffer): {
  rows: ParsedImportRow[];
  errors: ImportRowError[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, reason: 'Excel file has no worksheets' }] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix.length) {
    return { rows: [], errors: [{ row: 0, reason: 'Excel file is empty' }] };
  }

  const headerRow = (matrix[0] ?? []).map(normalizeHeader);
  const col = resolveColumnMap(headerRow);

  if (col.name === undefined && col.firstName === undefined) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          reason: 'Missing required columns. Include at least Name (or First Name) and Phone headers.',
        },
      ],
    };
  }
  if (col.phone === undefined) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          reason: 'Missing required columns. Include at least Name and Phone headers.',
        },
      ],
    };
  }

  const rows: ParsedImportRow[] = [];
  const errors: ImportRowError[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  for (let i = 1; i < matrix.length; i++) {
    const excelRow = i + 1;
    const line = matrix[i] ?? [];
    const fullName = col.name !== undefined ? cellString(line[col.name]) : '';
    const firstName =
      col.firstName !== undefined ? cellString(line[col.firstName]) : '';
    const lastName =
      col.lastName !== undefined ? cellString(line[col.lastName]) : '';
    const name =
      fullName ||
      [firstName, lastName].filter(Boolean).join(' ').trim();
    const phone = cellString(line[col.phone]).replace(/\s+/g, ' ').trim();
    const emailRaw = col.email !== undefined ? cellString(line[col.email]) : '';
    const tagsRaw = col.tags !== undefined ? cellString(line[col.tags]) : '';
    const notes = col.notes !== undefined ? cellString(line[col.notes]) : '';
    const statusRaw =
      col.status !== undefined ? cellString(line[col.status]).toUpperCase().replace(/\s+/g, '_') : '';

    const isBlank =
      !name && !phone && !emailRaw && !tagsRaw && !notes && !statusRaw;
    if (isBlank) continue;

    if (!name) {
      errors.push({ row: excelRow, reason: 'Missing required field: Name' });
      continue;
    }
    if (name.length < 2 || name.length > 120) {
      errors.push({ row: excelRow, reason: 'Name must be between 2 and 120 characters' });
      continue;
    }
    if (!phone) {
      errors.push({ row: excelRow, reason: 'Missing required field: Phone' });
      continue;
    }
    if (phone.length < 7 || phone.length > 20 || !PHONE_RE.test(phone)) {
      errors.push({ row: excelRow, reason: 'Invalid phone number' });
      continue;
    }

    const email = emailRaw ? emailRaw.toLowerCase() : undefined;
    if (email && !EMAIL_RE.test(email)) {
      errors.push({ row: excelRow, reason: 'Invalid email address' });
      continue;
    }

    let status: ParsedImportRow['status'] | undefined;
    if (statusRaw) {
      if (!VALID_STATUSES.has(statusRaw)) {
        errors.push({
          row: excelRow,
          reason: 'Invalid status (use ACTIVE, AT_RISK, INACTIVE, or CHURNED)',
        });
        continue;
      }
      status = statusRaw as ParsedImportRow['status'];
    }

    const phoneKey = phone.replace(/[\s-]/g, '');
    if (seenPhones.has(phoneKey)) {
      errors.push({ row: excelRow, reason: 'Duplicate phone number within the file' });
      continue;
    }
    if (email && seenEmails.has(email)) {
      errors.push({ row: excelRow, reason: 'Duplicate email within the file' });
      continue;
    }

    seenPhones.add(phoneKey);
    if (email) seenEmails.add(email);

    rows.push({
      row: excelRow,
      name,
      phone,
      email,
      notes: notes || undefined,
      tags: tagsRaw
        ? tagsRaw
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
      status,
    });
  }

  return { rows, errors };
}

export function buildCustomerExportWorkbook(
  customers: Array<{
    name: string;
    phone: string;
    email?: string | null;
    tags: string[];
    status: string;
    pointsBalance: number;
    visitCount: number;
    lifetimeValue: number;
    loyaltyBand: string;
    churnRisk: string;
    lastVisitAt?: string | null;
    notes?: string | null;
    createdAt: string;
  }>,
): Buffer {
  const rows = customers.map((c) => ({
    Name: c.name,
    Phone: c.phone,
    Email: c.email ?? '',
    Tags: c.tags.join(', '),
    Status: c.status,
    Points: c.pointsBalance,
    Visits: c.visitCount,
    'Lifetime Value': c.lifetimeValue,
    'Loyalty Band': c.loyaltyBand,
    'Churn Risk': c.churnRisk,
    'Last Visit': c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : '',
    Notes: c.notes ?? '',
    'Created At': c.createdAt.slice(0, 10),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [
    {
      Name: '',
      Phone: '',
      Email: '',
      Tags: '',
      Status: '',
      Points: '',
      Visits: '',
      'Lifetime Value': '',
      'Loyalty Band': '',
      'Churn Risk': '',
      'Last Visit': '',
      Notes: '',
      'Created At': '',
    },
  ]);

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function isExcelFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}
