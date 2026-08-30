import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'node:fs'
import { resolve, extname } from 'node:path'
import { promisify } from 'node:util'
import { brotliCompress as brotliCompressCallback, constants as zlibConstants, gzip as gzipCallback } from 'node:zlib'

const gzip = promisify(gzipCallback)
const brotliCompress = promisify(brotliCompressCallback)
const compressibleExtensions = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg'])
const compressionThreshold = 10 * 1024

function compressionPlugin() {
  let outDir = ''

  async function compressFile(filePath) {
    const source = await fs.readFile(filePath)
    if (source.length < compressionThreshold) {
      return
    }

    const [gzipped, brotlied] = await Promise.all([
      gzip(source, { level: 9 }),
      brotliCompress(source, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        },
      }),
    ])

    await Promise.all([
      fs.writeFile(`${filePath}.gz`, gzipped),
      fs.writeFile(`${filePath}.br`, brotlied),
    ])
  }

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = resolve(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
          return
        }

        if (!entry.isFile()) {
          return
        }

        if (fullPath.endsWith('.gz') || fullPath.endsWith('.br')) {
          return
        }

        if (compressibleExtensions.has(extname(fullPath))) {
          await compressFile(fullPath)
        }
      }),
    )
  }

  return {
    name: 'local-compression-assets',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir || 'dist')
    },
    async closeBundle() {
      if (!outDir) {
        return
      }

      await walk(outDir)
    },
  }
}

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return
  }

  if (id.includes('@emotion') || id.includes('@mui')) {
    return 'mui'
  }

  if (
    id.includes('react-dom') ||
    id.includes('react/jsx-runtime') ||
    id.includes('scheduler')
  ) {
    return 'react-vendor'
  }

  if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
    return 'charts'
  }

  if (id.includes('html2canvas') || id.includes('jspdf')) {
    return 'export'
  }

  return 'vendor'
}

// Production build tuned for a smaller initial payload and better caching.
export default defineConfig({
  root: 'frontend',
  plugins: [react(), compressionPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    target: 'es2018',
    minify: 'oxc',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
