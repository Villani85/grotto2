import { z } from "zod"

// Event type enum
export const neuroCreditEventTypeSchema = z.enum([
  "POST_CREATED",
  "COMMENT_CREATED",
  "COMMENT_DELETED",
  "LIKE_RECEIVED",
  "UNLIKE_RECEIVED",
  "VIDEO_COMPLETED",
  "DAILY_ACTIVE",
  "ADMIN_ADJUST",
])

// Rule schema
export const neuroCreditRuleSchema = z.object({
  points: z.number().int(),
  enabled: z.boolean(),
  dailyCap: z.number().int().min(0).nullable(),
  description: z.string().optional(),
})

// Level schema
export const neuroCreditLevelSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  minPoints: z.number().int().min(0),
  color: z.string().optional(),
  icon: z.string().optional(),
})

// Objective schema
export const neuroCreditObjectiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: z.enum(["neuroCredits", "videosCompleted", "activeDays", "streak"]),
  target: z.number().int().min(1),
  windowDays: z.number().int().min(1).max(365),
  rewardPoints: z.number().int().min(0),
  enabled: z.boolean(),
})

// Reward schema
export const neuroCreditRewardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  cost: z.number().int().min(1),
  enabled: z.boolean(),
  stock: z.number().int().min(0).nullable(),
  minLevel: z.number().int().min(1).nullable(),
  expiresAt: z.string().datetime().nullable(),
})

// Config version schema
export const neuroCreditConfigVersionSchema = z.object({
  versionId: z.string().min(1),
  status: z.enum(["draft", "published"]),
  createdAt: z.string().datetime(),
  createdByUid: z.string().min(1),
  notes: z.string().optional(),
  rules: z.record(neuroCreditEventTypeSchema, neuroCreditRuleSchema),
  levels: z.array(neuroCreditLevelSchema),
  objectives: z.array(neuroCreditObjectiveSchema),
  rewards: z.array(neuroCreditRewardSchema),
})

// Draft update schema
export const neuroCreditDraftUpdateSchema = z.object({
  rules: z.record(neuroCreditEventTypeSchema, neuroCreditRuleSchema).optional(),
  levels: z.array(neuroCreditLevelSchema).optional(),
  objectives: z.array(neuroCreditObjectiveSchema).optional(),
  rewards: z.array(neuroCreditRewardSchema).optional(),
  notes: z.string().optional(),
})

// Admin adjust schema
export const adminAdjustSchema = z.object({
  deltaNeuroCredits: z.number().int(),
  reason: z.string().min(1).max(500),
})
