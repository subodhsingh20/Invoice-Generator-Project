import fs from 'node:fs'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { b2Bucket, s3Client } from './utils/b2.js'

try {
  const result = await s3Client.send(new PutObjectCommand({ Bucket: b2Bucket, Key: 'debug/qr-test.png', Body: fs.createReadStream('./frontend/src/assets/hero.png'), ContentType: 'image/png' }))
  console.log('upload ok', result.ETag || 'no-etag')
} catch (error) {
  console.error('upload failed', error.name, error.Code || error.code, error.message)
  process.exitCode = 1
}
