import { model, models, Schema } from "mongoose"

import { ACTIVITY_ACTIONS } from "@/lib/activity-types"

const activityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    // Names and counts only. Secret values must never be written here.
    metadata: {
      projectName: String,
      key: String,
      previousKey: String,
      count: Number,
      created: Number,
      updated: Number,
      skipped: Number,
      purpose: String,
      device: String,
      targetDevice: String,
    },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

activityLogSchema.index({ userId: 1, createdAt: -1 })
activityLogSchema.index({ userId: 1, action: 1, createdAt: -1 })

function createModel() {
  return model("ActivityLog", activityLogSchema)
}

type ActivityLogModel = ReturnType<typeof createModel>

export const ActivityLog: ActivityLogModel =
  (models.ActivityLog as ActivityLogModel | undefined) ?? createModel()
