import { model, models, Schema } from "mongoose"

const environmentVariableSchema = new Schema(
  {
    // Denormalised owner so every query can be scoped to the signed-in user.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    key: { type: String, required: true, trim: true, maxlength: 128 },
    // AES-256-GCM ciphertext. Excluded from queries unless explicitly selected.
    encryptedValue: { type: String, required: true, select: false },
  },
  { timestamps: true }
)

environmentVariableSchema.index({ projectId: 1, key: 1 }, { unique: true })
environmentVariableSchema.index({ userId: 1, key: 1 })

function createModel() {
  return model("EnvironmentVariable", environmentVariableSchema)
}

type EnvironmentVariableModel = ReturnType<typeof createModel>

export const EnvironmentVariable: EnvironmentVariableModel =
  (models.EnvironmentVariable as EnvironmentVariableModel | undefined) ??
  createModel()
