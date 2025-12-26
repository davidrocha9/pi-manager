const path = require('path')

module.exports = async () => {
  const { svelte } = await import('@sveltejs/vite-plugin-svelte')
  return {
    plugins: [svelte()],
    server: {
      port: 2000,
      proxy: {
        '/api': 'http://127.0.0.1:2001'
      }
    },
    build: {
      outDir: path.resolve(__dirname, '../server/internal/api/web'),
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html')
      }
    }
  }
}
