import Dexie, { type Table } from "dexie";
import type { Snapshot } from "./types";

export type QueueItem = {
  id: string;
  op:
    | "upsertDealership"
    | "upsertSurvey"
    | "addPhoto"
    | "deletePhoto"
    | "upsertFollowup"
    | "upsertTask"
    | "setFindingAccepted"
    | "markNotificationRead"
    | "setPipelineStage";
  payload: unknown;
  createdAt: number;
};

class FieldDB extends Dexie {
  snapshot!: Table<{ id: string; data: Snapshot; savedAt: number }, string>;
  queue!: Table<QueueItem, string>;

  constructor() {
    super("qadisiyah-field");
    this.version(1).stores({
      snapshot: "id",
      queue: "id, createdAt, op",
    });
  }
}

let instance: FieldDB | null = null;

function db(): FieldDB | null {
  if (typeof window === "undefined") return null;
  instance ??= new FieldDB();
  return instance;
}

export async function loadLocalSnapshot(): Promise<Snapshot | null> {
  const d = db();
  if (!d) return null;
  const row = await d.snapshot.get("main");
  return row?.data ?? null;
}

export async function saveLocalSnapshot(data: Snapshot): Promise<void> {
  const d = db();
  if (!d) return;
  await d.snapshot.put({ id: "main", data, savedAt: Date.now() });
}

export async function enqueue(item: Omit<QueueItem, "createdAt">): Promise<void> {
  const d = db();
  if (!d) return;
  await d.queue.put({ ...item, createdAt: Date.now() });
}

export async function listQueue(): Promise<QueueItem[]> {
  const d = db();
  if (!d) return [];
  return d.queue.orderBy("createdAt").toArray();
}

export async function removeQueue(id: string): Promise<void> {
  const d = db();
  if (!d) return;
  await d.queue.delete(id);
}

export async function queueCount(): Promise<number> {
  const d = db();
  if (!d) return 0;
  return d.queue.count();
}
