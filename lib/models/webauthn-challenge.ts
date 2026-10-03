import { model, models, Schema } from "mongoose"

// One-time WebAuthn challenges, bound to the session that requested them.
const webAuthnChallengeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
  purpose: { type: String, enum: ["register", "authenticate"], required: true },
  challenge: { type: String, required: true },
  expiresAt: { type: Date, required: true },
})

webAuthnChallengeSchema.index({ sessionId: 1, purpose: 1, challenge: 1 })
webAuthnChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

function createModel() {
  return model("WebAuthnChallenge", webAuthnChallengeSchema)
}

type WebAuthnChallengeModel = ReturnType<typeof createModel>

export const WebAuthnChallenge: WebAuthnChallengeModel =
  (models.WebAuthnChallenge as WebAuthnChallengeModel | undefined) ??
  createModel()
