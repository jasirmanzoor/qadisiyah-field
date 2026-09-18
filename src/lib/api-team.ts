import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { joinWorkspace, loadTeam, rotateJoinCode as rotateWorkspaceCode } from "@/lib/workspace";
import { scoped } from "@/lib/api-shared";
import { ensureSeeded } from "@/lib/api-census";
import { loadSnapshot } from "@/lib/api-snapshot";

export const joinTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const result = await joinWorkspace(sql, context.userId, data.code);
    if (!result.ok) return result;
    await ensureSeeded(result.workspaceId);
    const snapshot = await loadSnapshot(result.workspaceId);
    snapshot.team = await loadTeam(sql, context.userId, result.workspaceId);
    return { ok: true as const, snapshot };
  });

export const rotateJoinCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    const result = await rotateWorkspaceCode(sql, userId, scope);
    if (!result.ok) return result;
    const snapshot = await loadSnapshot(scope);
    snapshot.team = await loadTeam(sql, userId, scope);
    return { ok: true as const, joinCode: result.joinCode, snapshot };
  });
