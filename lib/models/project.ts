import { model, models, Schema } from "mongoose"

const projectSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, default: "", trim: true, maxlength: 280 },
  },
  { timestamps: true }
)

projectSchema.index({ userId: 1, updatedAt: -1 })
// One project name per user, compared case-insensitively.
projectSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
)

function createModel() {
  return model("Project", projectSchema)
}

type ProjectModel = ReturnType<typeof createModel>

export const Project: ProjectModel =
  (models.Project as ProjectModel | undefined) ?? createModel()
