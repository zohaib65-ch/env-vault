import { model, models, Schema } from "mongoose"

// A Touch ID (WebAuthn) credential registered on one device. Only the public
// key is stored; the private key never leaves the device's secure hardware.
const passkeySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    credentialId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String, default: "singleDevice" },
    backedUp: { type: Boolean, default: false },
    name: { type: String, default: "This device" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

function createModel() {
  return model("Passkey", passkeySchema)
}

type PasskeyModel = ReturnType<typeof createModel>

export const Passkey: PasskeyModel =
  (models.Passkey as PasskeyModel | undefined) ?? createModel()
