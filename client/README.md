# Pi Manager - Client

The frontend interface for Pi Manager, built with **Svelte** and **TailwindCSS**, powered by **Vite**.

## 🛠 Tech Stack

- **Framework**: [Svelte 4](https://svelte.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: [Lucide Svelte](https://lucide.dev/)

## 📂 Structure

- `src/main.js`: Entry point.
- `src/App.svelte`: Main application layout and routing logic.
- `src/components/`: Reusable UI components.
    - `Sidebar.svelte`: Navigation sidebar.
    - `PiHealth.svelte`: System health dashboard with charts and real-time metrics.
    - `ProjectList.svelte` / `ProjectForm.svelte`: Project management interfaces.

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:5173`. It expects the Go backend to be running on port `8080` (configured via `vite.config.js` proxy).

## 🏗 Building

to build the application for production:

```bash
npm run build
```

This ensures assets are compiled to `../../server/internal/api/web/assets` (or the configured output directory) to be embedded by the Go server.
