import { model, models, Schema } from "mongoose"

const securitySettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // scrypt hash — the passcode itself is never stored.
    passcodeHash: { type: String, required: true, select: false },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    // How many lockouts happened since the last successful unlock; each one
    // doubles the next lockout duration.
    lockoutCount: { type: Number, default: 0 },
    passcodeUpdatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

function createModel() {
  return model("SecuritySettings", securitySettingsSchema)
}

type SecuritySettingsModel = ReturnType<typeof createModel>

export const SecuritySettings: SecuritySettingsModel =
  (models.SecuritySettings as SecuritySettingsModel | undefined) ??
  createModel()
