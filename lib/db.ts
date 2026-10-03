import "server-only"

import mongoose from "mongoose"

import { getEnv } from "@/lib/env"

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Reuse the connection across hot reloads in development and across
// invocations of a warm serverless function in production.
const globalForMongoose = globalThis as typeof globalThis & {
  __envVaultMongoose?: MongooseCache
}

const cache: MongooseCache = globalForMongoose.__envVaultMongoose ?? {
  conn: null,
  promise: null,
}
globalForMongoose.__envVaultMongoose = cache

export async function connectToDatabase() {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    mongoose.set("strictQuery", true)
    cache.promise = mongoose.connect(getEnv().MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    })
  }

  try {
    cache.conn = await cache.promise
  } catch (error) {
    cache.promise = null
    throw error
  }

  return cache.conn
}
