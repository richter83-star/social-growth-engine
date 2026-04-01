import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getTeamMembersByOwner,
  getTeamMemberRecord,
  upsertTeamMember,
  updateTeamMember,
  deleteTeamMember,
  resolvePermissions,
  DEFAULT_PERMISSIONS,
} from "../db";
import { nanoid } from "nanoid";
import type { TeamPermissions } from "../../drizzle/schema";

const permissionsSchema = z.object({
  canEdit: z.boolean(),
  canApprove: z.boolean(),
  canReject: z.boolean(),
  canDiscover: z.boolean(),
  canManageCampaigns: z.boolean(),
});

const ROLE_PRESETS: Record<string, TeamPermissions> = DEFAULT_PERMISSIONS;

export const teamRouter = router({
  /** Return the current user's effective permissions */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    return resolvePermissions(ctx.user.id);
  }),

  /** List all team members for the current owner */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTeamMembersByOwner(ctx.user.id);
  }),

  /** Invite a new team member (creates a pending invite record) */
  invite: protectedProcedure
    .input(z.object({
      memberEmail: z.string().email(),
      memberName: z.string().optional(),
      teamRole: z.enum(["editor", "reviewer", "viewer"]),
      permissions: permissionsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if already invited
      const existing = await getTeamMembersByOwner(ctx.user.id);
      if (existing.some((m) => m.memberEmail === input.memberEmail)) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already a team member." });
      }
      const token = nanoid(32);
      const permissions: TeamPermissions = input.permissions ?? ROLE_PRESETS[input.teamRole] ?? ROLE_PRESETS.viewer;
      await upsertTeamMember({
        ownerId: ctx.user.id,
        memberId: 0, // placeholder until accepted
        memberEmail: input.memberEmail,
        memberName: input.memberName ?? input.memberEmail,
        teamRole: input.teamRole,
        permissions,
        inviteToken: token,
        inviteAccepted: false,
      });
      return { token, inviteUrl: `${ctx.req.headers.origin ?? ""}/invite?token=${token}` };
    }),

  /** Update a team member's role and/or permissions */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      teamRole: z.enum(["editor", "reviewer", "viewer"]).optional(),
      permissions: permissionsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, teamRole, permissions } = input;
      const updates: Record<string, unknown> = {};
      if (teamRole) {
        updates.teamRole = teamRole;
        // Auto-apply preset permissions when role changes, unless custom permissions also provided
        if (!permissions) updates.permissions = ROLE_PRESETS[teamRole];
      }
      if (permissions) updates.permissions = permissions;
      await updateTeamMember(id, ctx.user.id, updates);
      return { success: true };
    }),

  /** Remove a team member */
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTeamMember(input.id, ctx.user.id);
      return { success: true };
    }),

  /** Get role presets for the frontend to display */
  getRolePresets: protectedProcedure.query(() => {
    return Object.entries(ROLE_PRESETS).map(([role, perms]) => ({ role, permissions: perms }));
  }),
});
