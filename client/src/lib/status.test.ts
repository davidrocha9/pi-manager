import { describe, expect, it } from "vitest"

import { deriveDisplayStatus, isRunning, statusLabel, statusTone } from "./status"

describe("deriveDisplayStatus", () => {
  it("treats BOOTING at 100% as ACTIVE", () => {
    expect(deriveDisplayStatus({ status: "BOOTING", progress: 100 })).toBe("ACTIVE")
  })

  it("keeps BOOTING below 100%", () => {
    expect(deriveDisplayStatus({ status: "BOOTING", progress: 42 })).toBe("BOOTING")
  })

  it("maps FAILED to FAILED", () => {
    expect(deriveDisplayStatus({ status: "FAILED", progress: 0 })).toBe("FAILED")
  })

  it("maps a missing or IDLE status to IDLE", () => {
    expect(deriveDisplayStatus({ status: "", progress: 0 })).toBe("IDLE")
    expect(deriveDisplayStatus({ status: "IDLE", progress: 0 })).toBe("IDLE")
  })

  it("maps ACTIVE to ACTIVE", () => {
    expect(deriveDisplayStatus({ status: "ACTIVE", progress: 0 })).toBe("ACTIVE")
  })
})

describe("statusTone", () => {
  it("uses one token pair per status", () => {
    expect(statusTone("ACTIVE").dot).toBe("bg-success")
    expect(statusTone("BOOTING").dot).toBe("bg-warning")
    expect(statusTone("BOOTING").pulse).toBe(true)
    expect(statusTone("FAILED").dot).toBe("bg-danger")
    expect(statusTone("IDLE").surface).toBe("bg-muted")
  })
})

describe("statusLabel", () => {
  it("renders the canonical uppercase label", () => {
    expect(statusLabel("ACTIVE")).toBe("ACTIVE")
    expect(statusLabel("IDLE")).toBe("IDLE")
  })
})

describe("isRunning", () => {
  it("counts ACTIVE and BOOTING as running", () => {
    expect(isRunning("ACTIVE")).toBe(true)
    expect(isRunning("BOOTING")).toBe(true)
    expect(isRunning("FAILED")).toBe(false)
    expect(isRunning("IDLE")).toBe(false)
  })
})
