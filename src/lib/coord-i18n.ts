import type { Lang } from "./i18n";

export const COORD_COPY: Record<Lang, {
  location: string;
  editCoords: string;
  savePin: string;
  coordsHint: string;
  coordsInvalid: string;
  latLabel: string;
  lngLabel: string;
  pinUpdated: string;
  pasteCoords: string;
}> = {
  en: {
    location: "Location",
    editCoords: "Edit",
    savePin: "Save pin",
    coordsHint: "Paste 24.6, 46.7 or type each field",
    coordsInvalid: "Check latitude and longitude",
    latLabel: "Lat",
    lngLabel: "Lng",
    pinUpdated: "Pin moved",
    pasteCoords: "Paste coordinates",
  },
  ar: {
    location: "الموقع",
    editCoords: "تعديل",
    savePin: "حفظ الدبوس",
    coordsHint: "الصق 24.6, 46.7 أو اكتب كل حقل",
    coordsInvalid: "راجع خط العرض وخط الطول",
    latLabel: "عرض",
    lngLabel: "طول",
    pinUpdated: "تم نقل الدبوس",
    pasteCoords: "لصق الإحداثيات",
  },
};
