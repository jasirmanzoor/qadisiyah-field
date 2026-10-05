export type NoteProposal = { key: string; label: string; value: string | number };

const NUM = "(\\d{1,3}(?:[,.]\\d{3})*|\\d+)";

export function extractNoteProposals(text: string): NoteProposal[] {
  const raw = text.replace(/,/g, "");
  const out: NoteProposal[] = [];
  const inv = raw.match(new RegExp(`(?:inv|inventory|stock|مخزون|سيارات)\\D{0,12}${NUM}`, "i"));
  if (inv) out.push({ key: "inventoryUnits", label: "Stock", value: Number(inv[1]) });
  const asp = raw.match(/(?:asp|price|سعر)\D{0,12}(\d{2,7})\s*(k)?/i);
  if (asp) out.push({ key: "avgSellingPriceSar", label: "ASP", value: Number(asp[1]) * (asp[2] ? 1000 : 1) });
  const size = raw.match(/(?:size|sqm|m2|متر|مساحة)\D{0,12}(\d{2,6})/i);
  if (size) out.push({ key: "showroomSizeSqm", label: "Size", value: Number(size[1]) });
  const age = raw.match(/(\d{1,3})\s*%\D{0,16}(?:older|over|>\s*5|أقدم)/i);
  if (age) out.push({ key: "inventoryAgePctOver5", label: "Older than 5 years", value: Number(age[1]) });
  if (/finance available|تمويل/i.test(text)) out.push({ key: "financeAvailable", label: "Finance", value: "yes" });
  if (/new and used|جديد ومستعمل/i.test(text)) out.push({ key: "vehicleType", label: "Type", value: "mix" });
  else if (/used only|مستعمل/i.test(text)) out.push({ key: "vehicleType", label: "Type", value: "used_only" });
  const brands = text.match(/(?:brands|ماركات)\s*[:\-]\s*([^\n]+)/i);
  if (brands) out.push({ key: "mainBrands", label: "Brands", value: brands[1].trim() });
  const phone = text.match(/(?:\+966|0)?5\d{8}/);
  if (phone) out.push({ key: "phone", label: "Phone", value: phone[0] });
  return out;
}
