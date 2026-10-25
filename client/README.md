# Pi Manager - Client

The frontend interface for Pi Manager, built with **React 19**, **TypeScript**, **TailwindCSS v4**, and **shadcn/ui**, powered by **Vite**.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/) + TypeScript (strict)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) (CSS-first config) + [shadcn/ui](https://ui.shadcn.com/) primitives vendored under `src/components/ui/`
- **Data fetching**: [@tanstack/react-query](https://tanstack.com/query) (polling + optimistic mutations)
- **Charts**: [Recharts](https://recharts.github.io/) via the shadcn chart wrapper
- **Icons**: [Lucide React](https://lucide.dev/)
- **Tests**: [Vitest](https://vitest.dev/) + React Testing Library (`bun run test`)

## 📂 Structure

- `src/main.tsx`: Entry point (QueryClient + ThemeProvider).
- `src/App.tsx`: Two-tab shell (Dashboard / Pi Health), no router.
- `src/components/layout/`: App shell, sidebar navigation, header.
- `src/components/projects/`: Projects table/cards, status badge, create wizard, logs, delete confirmation.
- `src/components/files/`: Server file browser + dialog.
- `src/components/health/`: Pi health dashboard (metric cards + Recharts area chart).
- `src/hooks/`: `useProjects`, `useHealth`, `usePiHealth` polling query hooks.
- `src/lib/`: Typed API client (`api.ts`) plus pure derivations (`status.ts`, `health.ts`).

## 🚀 Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The dev server runs on `http://localhost:2000`. It expects the Go backend to be running on `127.0.0.1:2001` (configured via the `/api` proxy in `vite.config.ts`).

## 🏗 Building

To build the application for production:

```bash
bun run build
```

This type-checks (`tsc -b`) and emits the bundle to `../server/internal/api/web` (with `emptyOutDir: true`, so every file there is build output), where it is embedded by the Go server. Rebuilding the client therefore requires rebuilding the Go binary before the new UI is served.
