import { useNavigate } from "@tanstack/react-router";
import { COPY, STATUS_LABEL, trainingCopy } from "@/lib/i18n";
import { formatDistance, haversineM, MARKET_CENTERS, optimizeWalkOrder } from "@/lib/geo";
import { dealersInMarket, dealerMarket, dualPartner, isDualLocation } from "@/lib/markets";
import { cn, formatNumber, formatPct, formatSar, formatSarCompact, mapsLink, telLink, uid, waLink } from "@/lib/utils";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { SHIFA_CORRIDOR_ORDER, SHIFA_PUBLIC_SNIPPETS, shifaCorridor } from "@/lib/shifa-seed";
import {
  MapPinPlus,
  LocateFixed,
  Route as RouteIcon,
  Satellite,
  Map as MapIcon,
  Search,
  X,
  Navigation,
  Phone,
  MessageCircle,
  MapPinned,
  Crosshair,
  List as ListIcon,
  Copy,
  Check,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MapFocus } from "./map-canvas";

const MapCanvas = lazy(() => import("./map-canvas").then((m) => ({ default: m.MapCanvas })));
