import ExcelJS from 'exceljs';

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export function parseCsvText(text: string): ParsedSheet {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const [headers, ...dataRows] = nonEmpty;
  return { headers: headers ?? [], rows: dataRows };
}

export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = (row.values as (string | number | null | undefined)[]).slice(1);
    rows.push(values.map((v) => (v === null || v === undefined ? '' : String(v))));
  });
  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

export interface TargetField {
  key: string;
  label: string;
  aliases: string[];
}

export const TARGET_FIELDS: TargetField[] = [
  { key: 'nameEn', label: 'Name (English)', aliases: ['name', 'nameen', 'englishname', 'dealershipname', 'showroomname'] },
  { key: 'nameAr', label: 'Name (Arabic)', aliases: ['namear', 'arabicname'] },
  { key: 'lat', label: 'Latitude', aliases: ['lat', 'latitude'] },
  { key: 'lng', label: 'Longitude', aliases: ['lng', 'lon', 'long', 'longitude'] },
  { key: 'listedPhone', label: 'Phone', aliases: ['phone', 'phonenumber', 'mobile', 'listedphone', 'contactnumber'] },
  { key: 'crNumber', label: 'CR number', aliases: ['crnumber', 'cr', 'commercialregistration'] },
  { key: 'pocName', label: 'POC name', aliases: ['pocname', 'contactname', 'ownername'] },
  { key: 'pocMobile', label: 'POC mobile', aliases: ['pocmobile', 'contactmobile'] },
  { key: 'mainBrands', label: 'Main brands (comma/semicolon separated)', aliases: ['brands', 'mainbrands', 'brand'] },
  { key: 'authorised', label: 'Authorised (yes/no/unclear)', aliases: ['authorised', 'authorized'] },
  { key: 'visitStatus', label: 'Visit / partnership status', aliases: ['status', 'visitstatus', 'partnershipstatus'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'note', 'comments', 'remarks'] },
];

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function guessMapping(headers: string[]): Record<string, number | null> {
  const normalised = headers.map(normaliseHeader);
  const mapping: Record<string, number | null> = {};
  for (const field of TARGET_FIELDS) {
    let idx = normalised.findIndex((h) => field.aliases.includes(h));
    if (idx === -1) idx = normalised.findIndex((h) => field.aliases.some((a) => h.includes(a)));
    mapping[field.key] = idx === -1 ? null : idx;
  }
  return mapping;
}
