import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getProjects, startProject, type Project } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { projectsQueryKey, useProjects, useStartProject } from "./use-projects"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    getProjects: vi.fn(),
    startProject: vi.fn(),
    stopProject: vi.fn(),
  }
})

const project: Project = {
  id: "demo",
  description: "Demo",
  check_cmd: "",
  pipeline: [],
  path: "/home/pi/demo",
  status: "ACTIVE",
  last_log: "",
  current_step: "",
  progress: 0,
  ports: ["3000"],
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("useProjects", () => {
  it("polls at two seconds and stops when the consumer unmounts", async () => {
    vi.useFakeTimers()
    vi.mocked(getProjects).mockResolvedValue([project])
    const client = createTestQueryClient()

    const { unmount } = renderHook(() => useProjects(), {
      wrapper: queryWrapper(client),
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getProjects).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100)
    })
    expect(getProjects).toHaveBeenCalledTimes(2)

    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000)
    })
    expect(getProjects).toHaveBeenCalledTimes(2)
  })
})

describe("useStartProject", () => {
  it("applies BOOTING immediately and restores the previous status on failure", async () => {
    const client = createTestQueryClient()
    client.setQueryData<Project[]>(projectsQueryKey, [project])
    vi.mocked(getProjects).mockResolvedValue([project])

    let rejectStart: (reason?: unknown) => void = () => {}
    vi.mocked(startProject).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectStart = reject
        }),
    )

    const { result } = renderHook(() => useStartProject(), {
      wrapper: queryWrapper(client),
    })

    act(() => {
      result.current.mutate("demo")
    })

    await waitFor(() => {
      expect(client.getQueryData<Project[]>(projectsQueryKey)?.[0]?.status).toBe("BOOTING")
    })

    rejectStart(new Error("start failed"))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(client.getQueryData<Project[]>(projectsQueryKey)?.[0]?.status).toBe("ACTIVE")
  })
})
