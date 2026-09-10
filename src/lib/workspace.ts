import type { Sql } from "@/lib/db";
import type { TeamInfo, TeamRole } from "@/lib/types";
import { normalizeJoinCode, uid } from "@/lib/utils";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeJoinCode(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

export async function ensureWorkspace(sql: Sql, userId: string): Promise<string> {
  const existing = await sql<{ workspace_id: string }>`
    select workspace_id from workspace_members where user_id = ${userId}
  `;
  if (existing[0]?.workspace_id) return existing[0].workspace_id;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeJoinCode();
    try {
      await sql`
        insert into workspaces (id, name, join_code, created_by)
        values (${userId}, ${"Qadisiyah Field"}, ${code}, ${userId})
      `;
      await sql`
        insert into workspace_members (workspace_id, user_id, role)
        values (${userId}, ${userId}, ${"owner"})
      `;
      return userId;
    } catch {
      const raced = await sql<{ workspace_id: string }>`
        select workspace_id from workspace_members where user_id = ${userId}
      `;
      if (raced[0]?.workspace_id) return raced[0].workspace_id;
    }
  }
  throw new Error("Could not create a team workspace.");
}

export async function loadTeam(sql: Sql, userId: string, workspaceId: string): Promise<TeamInfo> {
  const ws = await sql<{ join_code: string }>`
    select join_code from workspaces where id = ${workspaceId}
  `;
  const members = await sql<{ user_id: string; role: string }>`
    select user_id, role from workspace_members
    where workspace_id = ${workspaceId}
    order by created_at
  `;
  const names = new Map<string, string>();
  for (const m of members) {
    const row = await sql<{ name: string; email: string }>`
      select "name", "email" from "user" where "id" = ${m.user_id}
    `;
    names.set(m.user_id, row[0]?.name || row[0]?.email || "Field user");
  }
  const you = members.find((m) => m.user_id === userId);
  return {
    joinCode: ws[0]?.join_code ?? "",
    role: you?.role === "owner" ? "owner" : "member",
    members: members.map((m) => ({
      userId: m.user_id,
      name: names.get(m.user_id) || "Field user",
      role: m.role === "owner" ? "owner" : "member",
      you: m.user_id === userId,
    })),
  };
}

export async function joinWorkspace(
  sql: Sql,
  userId: string,
  rawCode: string,
): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const code = normalizeJoinCode(rawCode);
  if (code.length < 6) return { ok: false, error: "Enter the 6-character team code." };
  const ws = await sql<{ id: string }>`
    select id from workspaces where join_code = ${code}
  `;
  if (!ws[0]) return { ok: false, error: "That team code is not valid." };
  const workspaceId = ws[0].id;
  const current = await sql<{ workspace_id: string }>`
    select workspace_id from workspace_members where user_id = ${userId}
  `;
  if (current[0]?.workspace_id === workspaceId) return { ok: true, workspaceId };

  await sql`delete from workspace_members where user_id = ${userId}`;
  await sql`
    insert into workspace_members (workspace_id, user_id, role)
    values (${workspaceId}, ${userId}, ${"member"})
    on conflict (workspace_id, user_id) do nothing
  `;

  const who = await sql<{ name: string }>`
    select "name" from "user" where "id" = ${userId}
  `;
  const label = who[0]?.name?.trim() || "A teammate";
  await sql`
    insert into notifications (id, user_id, kind, title, body, dealership_id, read)
    values (
      ${uid()}, ${workspaceId}, ${"info"},
      ${"Team join"},
      ${`${label} joined the shared roster. Surveys, pipeline and photos are now shared.`},
      ${null}, false
    )
  `;
  return { ok: true, workspaceId };
}

export async function rotateJoinCode(
  sql: Sql,
  userId: string,
  workspaceId: string,
): Promise<{ ok: true; joinCode: string } | { ok: false; error: string }> {
  const role = await sql<{ role: string }>`
    select role from workspace_members
    where workspace_id = ${workspaceId} and user_id = ${userId}
  `;
  if (role[0]?.role !== "owner") return { ok: false, error: "Only the team owner can rotate the code." };
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeJoinCode();
    try {
      await sql`update workspaces set join_code = ${code} where id = ${workspaceId}`;
      return { ok: true, joinCode: code };
    } catch {
      /* unique collision — retry */
    }
  }
  return { ok: false, error: "Could not rotate the code." };
}
