import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, Dealership, Photo, SyncQueueItem } from './types';
import { buildSeedDealerships } from './seed';
import { buildShifaDealerships } from './shifa-seed';
import { mergeDealershipRecords } from './merge-dealerships';
import { duplicatePairId } from './duplicate-detection';
import type { AgentFinding, DuplicateFlag, ResearchRunLogEntry, ResearchTask } from './research-types';

const DB_NAME = 'qadisiyah-survey';
const DB_VERSION = 2;

interface SurveyDB extends DBSchema {
  dealerships: {
    key: string;
    value: Dealership;
    indexes: { 'by-status': string; 'by-updated': string };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: { 'by-dealership': string };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  researchTasks: {
    key: string;
    value: ResearchTask;
  };
  agentFindings: {
    key: string;
    value: AgentFinding;
    indexes: { 'by-dealership': string };
  };
  researchRuns: {
    key: string;
    value: ResearchRunLogEntry;
    indexes: { 'by-date': string };
  };
  duplicateFlags: {
    key: string;
    value: DuplicateFlag;
  };
}

let dbPromise: Promise<IDBPDatabase<SurveyDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SurveyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dealerships')) {
          const store = db.createObjectStore('dealerships', { keyPath: 'id' });
          store.createIndex('by-status', 'visitStatus');
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('photos')) {
          const store = db.createObjectStore('photos', { keyPath: 'id' });
          store.createIndex('by-dealership', 'dealershipId');
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('researchTasks')) {
          db.createObjectStore('researchTasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('agentFindings')) {
          const store = db.createObjectStore('agentFindings', { keyPath: 'id' });
          store.createIndex('by-dealership', 'dealershipId');
        }
        if (!db.objectStoreNames.contains('researchRuns')) {
          const store = db.createObjectStore('researchRuns', { keyPath: 'id' });
          store.createIndex('by-date', 'ranAt');
        }
        if (!db.objectStoreNames.contains('duplicateFlags')) {
          db.createObjectStore('duplicateFlags', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function ensureSeeded(): Promise<void> {
  const db = await getDB();
  const count = await db.count('dealerships');
  if (count === 0) {
    const tx = db.transaction('dealerships', 'readwrite');
    for (const d of [...buildSeedDealerships(), ...buildShifaDealerships()]) {
      await tx.store.put(d);
    }
    await tx.done;
    const s = await getSettings();
    await saveSettings({ ...s, shifaSeeded: true });
    return;
  }
  // Devices that already had the Al Qadisiyah roster get the Al Shifa sheet
  // added once. Never overwrites a record that already exists (e.g. one you
  // surveyed), and never re-adds pins you removed afterwards.
  const settings = await getSettings();
  if (!settings.shifaSeeded) {
    const tx = db.transaction('dealerships', 'readwrite');
    for (const d of buildShifaDealerships()) {
      if (!(await tx.store.get(d.id))) await tx.store.put(d);
    }
    await tx.done;
    await saveSettings({ ...settings, shifaSeeded: true });
  }
}

export async function getAllDealerships(): Promise<Dealership[]> {
  const db = await getDB();
  return db.getAll('dealerships');
}

export async function getDealership(id: string): Promise<Dealership | undefined> {
  const db = await getDB();
  return db.get('dealerships', id);
}

export async function saveDealership(d: Dealership): Promise<void> {
  const db = await getDB();
  const updated: Dealership = { ...d, updatedAt: new Date().toISOString(), dirty: true };
  await db.put('dealerships', updated);
  await queueSync('dealership', d.id);
}

export async function addDealership(d: Dealership): Promise<void> {
  const db = await getDB();
  await db.put('dealerships', d);
  await queueSync('dealership', d.id);
}

export async function deleteDealership(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('dealerships', id);
}

async function queueSync(entity: SyncQueueItem['entity'], entityId: string): Promise<void> {
  const db = await getDB();
  const settings = await getSettings();
  if (!settings.remoteEndpoint) return; // local-only mode: nothing to queue
  const item: SyncQueueItem = {
    id: `${entity}-${entityId}-${Date.now()}`,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
  };
  await db.put('syncQueue', item);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count('syncQueue');
}

export async function flushSyncQueue(): Promise<{ pushed: number; failed: number }> {
  const db = await getDB();
  const settings = await getSettings();
  if (!settings.remoteEndpoint || !navigator.onLine) return { pushed: 0, failed: 0 };

  const items = await db.getAll('syncQueue');
  let pushed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      if (item.entity === 'dealership') {
        const record = await db.get('dealerships', item.entityId);
        if (!record) {
          await db.delete('syncQueue', item.id);
          continue;
        }
        const res = await fetch(settings.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'dealership', record }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      await db.delete('syncQueue', item.id);
      pushed += 1;
    } catch {
      failed += 1;
    }
  }
  return { pushed, failed };
}

export async function savePhoto(photo: Photo): Promise<void> {
  const db = await getDB();
  await db.put('photos', photo);
}

export async function getPhotosForDealership(dealershipId: string): Promise<Photo[]> {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'by-dealership', dealershipId);
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('photos', id);
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'singleton',
  surveyorName: null,
  darkMode: false,
  remoteEndpoint: null,
  dailyResearchCap: 50,
  researchAccessToken: null,
  scheduledResearchPaused: false,
  activeMarket: 'qadisiyah',
  shifaSeeded: false,
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const s = await db.get('settings', 'singleton');
  // Merge with defaults so records saved before a settings field existed
  // (e.g. dailyResearchCap) don't come back with it missing.
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', s);
}

export async function resetAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('dealerships');
  await db.clear('photos');
  await db.clear('syncQueue');
  // Research tasks are configuration and survive a reset; everything they
  // produced refers to the wiped records, so it goes too.
  await db.clear('agentFindings');
  await db.clear('researchRuns');
  await db.clear('duplicateFlags');
  const s = await getSettings();
  await saveSettings({ ...s, shifaSeeded: false });
  await ensureSeeded();
}

// ---------- Phase 2: research tasks ----------

export async function getAllResearchTasks(): Promise<ResearchTask[]> {
  const db = await getDB();
  return db.getAll('researchTasks');
}

export async function saveResearchTask(task: ResearchTask): Promise<void> {
  const db = await getDB();
  await db.put('researchTasks', task);
}

export async function deleteResearchTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('researchTasks', id);
}

/** Stamp lastRunAt without overwriting any edits made to the task meanwhile. */
export async function touchResearchTask(id: string, ranAt: string): Promise<void> {
  const db = await getDB();
  const t = await db.get('researchTasks', id);
  if (!t) return;
  await db.put('researchTasks', { ...t, lastRunAt: ranAt });
}

// ---------- Phase 2: agent-sourced findings ----------

export async function saveFinding(finding: AgentFinding): Promise<void> {
  const db = await getDB();
  await db.put('agentFindings', finding);
}

export async function getFindingsForDealership(dealershipId: string): Promise<AgentFinding[]> {
  const db = await getDB();
  return db.getAllFromIndex('agentFindings', 'by-dealership', dealershipId);
}

export async function getAllFindings(): Promise<AgentFinding[]> {
  const db = await getDB();
  return db.getAll('agentFindings');
}

export async function updateFindingStatus(id: string, status: AgentFinding['status']): Promise<void> {
  const db = await getDB();
  const f = await db.get('agentFindings', id);
  if (!f) return;
  await db.put('agentFindings', { ...f, status });
}

export async function dismissFindingAlert(id: string): Promise<void> {
  const db = await getDB();
  const f = await db.get('agentFindings', id);
  if (!f) return;
  await db.put('agentFindings', { ...f, alertDismissed: true });
}

// ---------- Phase 2: run log / cost tracking ----------

export async function logResearchRun(entry: ResearchRunLogEntry): Promise<void> {
  const db = await getDB();
  await db.put('researchRuns', entry);
}

export async function getAllResearchRuns(): Promise<ResearchRunLogEntry[]> {
  const db = await getDB();
  return db.getAll('researchRuns');
}

export async function getRunsToday(): Promise<ResearchRunLogEntry[]> {
  const db = await getDB();
  const all = await db.getAll('researchRuns');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return all.filter((r) => new Date(r.ranAt) >= todayStart);
}

// ---------- Phase 2: suspected duplicates ----------

/**
 * Store a fresh scan. Flags are keyed by the dealership pair, so re-scanning
 * never creates copies and a pair you dismissed or merged stays that way.
 * Pending flags the new scan no longer finds (e.g. a record was renamed) are
 * removed.
 */
export async function saveDuplicateScan(flags: DuplicateFlag[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('duplicateFlags', 'readwrite');
  const existing = await tx.store.getAll();
  // Key by pair, not stored id: flags saved before pair ids existed had random ids.
  const byPair = new Map(existing.map((f) => [duplicatePairId(f.dealershipIdA, f.dealershipIdB), f]));
  const scanned = new Set(flags.map((f) => f.id));
  for (const f of flags) {
    const prev = byPair.get(f.id);
    if (!prev) {
      await tx.store.put(f);
    } else if (prev.id !== f.id) {
      // Migrate a legacy flag to its pair id, keeping its status.
      await tx.store.delete(prev.id);
      await tx.store.put({ ...f, status: prev.status, createdAt: prev.createdAt });
    } else if (prev.status === 'pending') {
      await tx.store.put({ ...f, createdAt: prev.createdAt });
    }
  }
  for (const prev of existing) {
    const pair = duplicatePairId(prev.dealershipIdA, prev.dealershipIdB);
    if (prev.status === 'pending' && !scanned.has(pair)) await tx.store.delete(prev.id);
  }
  await tx.done;
}

export async function getAllDuplicateFlags(): Promise<DuplicateFlag[]> {
  const db = await getDB();
  return db.getAll('duplicateFlags');
}

export async function updateDuplicateFlagStatus(
  id: string,
  status: DuplicateFlag['status']
): Promise<void> {
  const db = await getDB();
  const f = await db.get('duplicateFlags', id);
  if (!f) return;
  await db.put('duplicateFlags', { ...f, status });
}

/**
 * Merge `removeId` into `keepId`: the kept record's values win, the other
 * fills gaps; its photos, findings and run history move across; then it is
 * deleted. One transaction, so a failure leaves both records untouched.
 */
export async function mergeDealerships(keepId: string, removeId: string, flagId: string | null): Promise<Dealership> {
  if (keepId === removeId) throw new Error('Cannot merge a dealership into itself');
  const db = await getDB();
  const tx = db.transaction(
    ['dealerships', 'photos', 'agentFindings', 'researchRuns', 'duplicateFlags', 'syncQueue'],
    'readwrite'
  );
  const dealerships = tx.objectStore('dealerships');
  const keep = await dealerships.get(keepId);
  const other = await dealerships.get(removeId);
  if (!keep || !other) {
    tx.abort();
    throw new Error('One of the dealerships no longer exists');
  }

  const merged = mergeDealershipRecords(keep, other);
  await dealerships.put(merged);
  await dealerships.delete(removeId);

  const photos = tx.objectStore('photos');
  for (const p of await photos.index('by-dealership').getAll(removeId)) {
    await photos.put({ ...p, dealershipId: keepId });
  }
  const findings = tx.objectStore('agentFindings');
  for (const f of await findings.index('by-dealership').getAll(removeId)) {
    await findings.put({ ...f, dealershipId: keepId });
  }
  const runs = tx.objectStore('researchRuns');
  for (const r of await runs.getAll()) {
    if (r.dealershipId === removeId) await runs.put({ ...r, dealershipId: keepId });
  }
  const flags = tx.objectStore('duplicateFlags');
  for (const f of await flags.getAll()) {
    if (f.id === flagId) {
      await flags.put({ ...f, status: 'merged' });
    } else if (f.dealershipIdA === removeId || f.dealershipIdB === removeId) {
      // The removed record is gone; its other pairings are resolved by the merge.
      await flags.delete(f.id);
    }
  }
  const queue = tx.objectStore('syncQueue');
  for (const q of await queue.getAll()) {
    if (q.entityId === removeId) await queue.delete(q.id);
  }
  await tx.done;
  await queueSync('dealership', keepId);
  return merged;
}
