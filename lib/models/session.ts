import { model, models, Schema } from "mongoose"

const sessionSchema = new Schema(
  {
    // SHA-256 of the cookie token; the raw token only lives in the browser.
    tokenHash: { type: String, required: true, unique: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: () => new Date() },
    device: { type: String, default: "Unknown device" },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// MongoDB removes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

function createModel() {
  return model("Session", sessionSchema)
}

type SessionModel = ReturnType<typeof createModel>

export const Session: SessionModel =
  (models.Session as SessionModel | undefined) ?? createModel()
