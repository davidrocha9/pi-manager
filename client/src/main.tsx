import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App"
import { ThemeProvider } from "./components/theme-provider"

const container = document.getElementById("root")
if (!container) {
  throw new Error("Root element #root was not found")
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
