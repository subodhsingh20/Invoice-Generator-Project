import { createRequire } from 'node:module'
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: new URL('../.env', import.meta.url), override: true, quiet: true })

function getB2Config() {
  const applicationKeyId = process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID
  const bucket = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET
  const missing = [
    !process.env.B2_ENDPOINT && 'B2_ENDPOINT',
    !process.env.B2_REGION && 'B2_REGION',
    !applicationKeyId && 'B2_APPLICATION_KEY_ID',
    !process.env.B2_APPLICATION_KEY && 'B2_APPLICATION_KEY',
    !bucket && 'B2_BUCKET_NAME',
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new Error(`Missing Backblaze B2 configuration: ${missing.join(', ')}`)
  }

  return {
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: {
      accessKeyId: applicationKeyId,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    bucket,
  }
}

const config = getB2Config()

export const b2Bucket = config.bucket
export const s3Client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: config.credentials,
  forcePathStyle: true,
})

export function getObjectKey(file) {
  return file.key
}

export async function getPresignedObjectUrl(key, expiresIn = 3600) {
  if (!key) return ''
  const objectKey = normalizeObjectKey(key)
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: b2Bucket, Key: objectKey }),
    { expiresIn },
  )
}

function normalizeObjectKey(value) {
  const stringValue = String(value)
  if (!/^https?:\/\//i.test(stringValue)) return stringValue
  const pathname = new URL(stringValue).pathname.replace(/^\//, '')
  const bucketPrefix = `${b2Bucket}/`
  return pathname.startsWith(bucketPrefix) ? pathname.slice(bucketPrefix.length) : pathname
}

export async function deleteB2Object(key) {
  if (!key) return
  await s3Client.send(new DeleteObjectCommand({ Bucket: b2Bucket, Key: key }))
}
