import { afterEach, describe, expect, it, vi } from "vitest"

import { createProject, deleteProject, getHealth, getProjects } from "./api"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("api client", () => {
  it("resolves parsed JSON for a 200 JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        last_check: "2026-10-25T10:00:00Z",
        tailscale_name: "pi.tailnet.ts.net",
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const health = await getHealth()

    expect(health.tailscale_name).toBe("pi.tailnet.ts.net")
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/health", expect.any(Object))
  })

  it("throws an error carrying status, status text, and body for a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("state store unavailable", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "text/plain" },
        }),
      ),
    )

    await expect(getProjects()).rejects.toThrow(
      "500 Internal Server Error - state store unavailable",
    )
  })

  it("returns raw text for a 200 plain-text response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("plain text body", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      ),
    )

    await expect(getProjects()).resolves.toBe("plain text body")
  })

  it("percent-encodes ids with slashes and spaces", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(""))
    vi.stubGlobal("fetch", fetchMock)

    await deleteProject("a/b c")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/projects/a%2Fb%20c",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("sends the project and pipeline in a single POST body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "demo" }))
    vi.stubGlobal("fetch", fetchMock)

    await createProject({
      id: "demo",
      description: "Demo app",
      path: "/home/pi/demo",
      ports: ["3000"],
      pipeline: [{ name: "Start", cmd: "bun run start" }],
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/projects")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      id: "demo",
      description: "Demo app",
      path: "/home/pi/demo",
      ports: ["3000"],
      pipeline: [{ name: "Start", cmd: "bun run start" }],
    })
  })
})
