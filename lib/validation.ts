import { z } from "zod"

export const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
export const MAX_VALUE_LENGTH = 64 * 1024
export const MAX_IMPORT_BYTES = 256 * 1024
export const PASSCODE_LENGTH = 4

export const envKeySchema = z
  .string()
  .trim()
  .min(1, "Variable name is required")
  .max(128, "Variable name must be 128 characters or fewer")
  .regex(
    ENV_KEY_PATTERN,
    "Use letters, numbers and underscores only, and don't start with a number"
  )

export const envValueSchema = z
  .string()
  .max(MAX_VALUE_LENGTH, "Value must be 64 KB or smaller")

export const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/, "Invalid identifier")

export const projectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(64, "Project name must be 64 characters or fewer")
    .regex(/^[^\r\n]*$/, "Project name must be a single line"),
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer")
    .default(""),
})

export const passcodeSchema = z
  .string()
  .regex(
    new RegExp(`^\\d{${PASSCODE_LENGTH}}$`),
    `Passcode must be exactly ${PASSCODE_LENGTH} digits`
  )

// Used when *checking* a passcode: length rules are enforced at creation.
export const passcodeAttemptSchema = z
  .string()
  .min(1, "Enter your passcode")
  .max(128, "Passcode is too long")

export const newPasscodeSchema = z
  .object({
    passcode: passcodeSchema,
    confirm: z.string(),
  })
  .refine((data) => data.passcode === data.confirm, {
    message: "Passcodes don't match",
    path: ["confirm"],
  })

export const createVariableSchema = z.object({
  projectId: objectIdSchema,
  key: envKeySchema,
  value: envValueSchema,
})

export const updateVariableSchema = z.object({
  variableId: objectIdSchema,
  key: envKeySchema,
  // null keeps the current encrypted value untouched.
  value: envValueSchema.nullable(),
})

// Shape check only; the signature itself is verified with SimpleWebAuthn.
const passkeyAssertionSchema = z.object({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: z.string().min(1).max(8192),
    authenticatorData: z.string().min(1).max(8192),
    signature: z.string().min(1).max(4096),
    userHandle: z.string().max(1024).optional(),
  }),
  clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
})

export const unlockSchema = z.union([
  z.object({ passcode: passcodeAttemptSchema }),
  z.object({ passkey: passkeyAssertionSchema }),
])

export const secretAccessSchema = z.object({
  variableId: objectIdSchema,
  purpose: z.enum(["reveal", "copy", "edit"]),
})

export function fieldErrorsOf(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[]>
}
