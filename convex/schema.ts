import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    availability: v.optional(v.string()),
    profileVisibility: v.union(
      v.literal("public"),
      v.literal("connections"),
      v.literal("private")
    ),
    reputationScore: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    preferredLanguage: v.string(),
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("premium")
    ),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"]),

  skills: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    category: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_category", ["category"]),

  userSkills: defineTable({
    userId: v.id("users"),
    skillId: v.id("skills"),
    type: v.union(
      v.literal("teach"),
      v.literal("learn")
    ),
    proficiency: v.string(),
    description: v.string(),
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Empty array is allowed i.e. user may choose not to mention ANY outcomes
    learningOutcomes: v.array(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_skillId", ["skillId"])
    .index("by_userId_and_type", ["userId", "type"])
    .index("by_skillId_and_type", ["skillId", "type"]),

  proofs: defineTable({
    userId: v.id("users"),
    userSkillId: v.id("userSkills"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    fileId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    adminComment: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userSkillId", ["userSkillId"])
    .index("by_status", ["status"]),

  matches: defineTable({
    userAId: v.id("users"),
    userBId: v.id("users"),
    score: v.number(),
    matchingSkills: v.array(
        v.object({
            skillId: v.id("skills"),
            teacherId: v.id("users"),
            learnerId: v.id("users"),
        })
    ),
    status: v.union(
      v.literal("suggested"),
      v.literal("viewed"),
      v.literal("connected"),
      v.literal("dismissed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userAId", ["userAId"])
    .index("by_userBId", ["userBId"]),
  connections: defineTable({
    requesterId: v.id("users"),
    receiverId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("blocked")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requesterId", ["requesterId"])
    .index("by_receiverId", ["receiverId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    connectionId: v.id("connections"),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_connectionId", ["connectionId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.literal("text"),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_senderId", ["senderId"]),

  sessions: defineTable({
    teacherId: v.id("users"),
    learnerId: v.id("users"),
    connectionId: v.id("connections"),
    title: v.string(),
    description: v.string(),
    scheduledDate: v.string(),
    startTime: v.string(),
    duration: v.number(),
    meetingPlatform: v.union(
      v.literal("google_meet"),
      v.literal("zoom"),
      v.literal("other")
    ),
    meetingLink: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    teacherConfirmed: v.boolean(),
    learnerConfirmed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teacherId", ["teacherId"])
    .index("by_learnerId", ["learnerId"])
    .index("by_connectionId", ["connectionId"]),

  reviews: defineTable({
    sessionId: v.id("sessions"),
    reviewerId: v.id("users"),
    revieweeId: v.id("users"),
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_revieweeId", ["revieweeId"])
    .index("by_reviewerId", ["reviewerId"]),

  //not used currently for the kiet prototype
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("connection_request"),
      v.literal("connection_accepted"),
      v.literal("new_message"),
      v.literal("session_scheduled"),
      v.literal("session_cancelled"),
      v.literal("proof_verified"),
      v.literal("proof_rejected"),
      v.literal("review_received")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  creditTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(
      v.literal("starter_bonus"),
      v.literal("session_learning"),
      v.literal("session_teaching"),
      v.literal("admin_adjustment")
    ),
    sessionId: v.optional(v.id("sessions")),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_userId_and_type", ["userId", "type"]),
});