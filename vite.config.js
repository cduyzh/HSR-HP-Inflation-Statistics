import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs/promises'
import path from 'node:path'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'hsr-disk-cache',
      configureServer(server) {
        const root = server.config.root || process.cwd()
        const cacheRoot = path.join(root, '.hsr-cache')
        server.middlewares.use(async (req, res, next) => {
          try {
            const url = req.url || ''
            if (!url.startsWith('/__hsr_cache__/')) return next()

            const [pathname, query] = url.split('?')
            const rel = pathname.replace('/__hsr_cache__', '')
            const filePath = path.join(cacheRoot, rel.replace(/^\/+/, ''))
            const force = typeof query === 'string' && query.includes('force=1')
            const remoteUrl = `https://static.nanoka.cc${rel}`

            if (!force) {
              try {
                const buf = await fs.readFile(filePath)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(buf)
                return
              } catch {}
            }

            const remote = await fetch(remoteUrl)
            if (!remote.ok) {
              res.statusCode = remote.status
              res.end(await remote.text())
              return
            }

            const text = await remote.text()
            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, text)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(text)
          } catch (e) {
            res.statusCode = 500
            res.end(e?.message || String(e))
          }
        })
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts')) return 'echarts'
        },
      },
    },
  },
})
