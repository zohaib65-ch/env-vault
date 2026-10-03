import { model, models, Schema } from "mongoose"

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    image: { type: String, default: null },
  },
  { timestamps: true }
)

function createModel() {
  return model("User", userSchema)
}

type UserModel = ReturnType<typeof createModel>

export const User: UserModel = (models.User as UserModel | undefined) ?? createModel()
