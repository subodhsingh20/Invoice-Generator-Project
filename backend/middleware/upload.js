import multer from 'multer'
import multerS3 from 'multer-s3'
import { randomUUID } from 'node:crypto'
import { b2Bucket, s3Client } from '../utils/b2.js'

const maxFileSize = 2 * 1024 * 1024
const imageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/svg+xml'])
const qrMimeTypes = new Set(['image/png', 'image/jpeg'])

function createImageUpload({ folder, allowedMimeTypes }) {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: b2Bucket,
      acl: (request, file, callback) => callback(null, null),
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (request, file, callback) => {
        callback(null, {
          fieldName: file.fieldname,
          driverId: String(request.user.driverId),
        })
      },
      key: (request, file, callback) => {
        const extension = mimeExtension(file.mimetype)
        callback(null, `${folder}/${String(request.user.driverId)}/${randomUUID()}${extension}`)
      },
    }),
    limits: { fileSize: maxFileSize, files: 1 },
    fileFilter: (request, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
      }
      return callback(null, true)
    },
  })
}

export const uploadLogo = createImageUpload({
  folder: 'logos',
  allowedMimeTypes: imageMimeTypes,
})

export const uploadQr = createImageUpload({
  folder: 'qr-codes',
  allowedMimeTypes: qrMimeTypes,
})

function mimeExtension(mimeType) {
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/svg+xml') return '.svg'
  return '.png'
}
