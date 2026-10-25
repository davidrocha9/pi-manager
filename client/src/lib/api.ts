const BASE_URL = "/api/v1"

export type PipelineStep = {
  name: string
  cmd: string
}

export type ProjectStatus = "IDLE" | "BOOTING" | "ACTIVE" | "FAILED" | string

export type Project = {
  id: string
  description: string
  check_cmd: string
  pipeline: PipelineStep[]
  path?: string
  status: ProjectStatus
  last_log: string
  current_step: string
  progress: number
  ports: string[]
  port?: string
}

export type CreateProjectInput = {
  id: string
  description: string
  path: string
  ports: string[]
  pipeline: PipelineStep[]
}

export type HealthResponse = {
  ok: boolean
  last_check: string
  tailscale_name: string
}

export type PiHistoryPoint = {
  time: string
  cpu_usage: number
  memory_percent: number
  temperature: number
  disk_percent: number
}

export type PiHealth = {
  hostname?: string
  tailscale_name?: string
  cpu_usage: number
  memory_total: number
  memory_used: number
  memory_percent: number
  temperature: number
  disk_total: number
  disk_used: number
  disk_percent: number
  load_avg_1: number
  load_avg_5: number
  load_avg_15: number
  uptime: string
  history: PiHistoryPoint[]
}

export type FsEntry = {
  name: string
  path: string
  abs_path: string
  is_dir: boolean
}

export type FsListing = {
  current_path: string
  entries: FsEntry[]
}

async function callApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status} ${response.statusText} - ${errorText}`)
  }

  // Some endpoints answer with plain text rather than JSON.
  const contentType = response.headers.get("content-type")
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T
  }
  return (await response.text()) as T
}

export const getHealth = () => callApi<HealthResponse>("/health")

export const getProjects = () => callApi<Project[]>("/projects")

export const createProject = (project: CreateProjectInput) =>
  callApi<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  })

export const deleteProject = (id: string) =>
  callApi<string>(`/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })

export const startProject = (id: string) =>
  callApi<{ status: string }>(`/projects/${encodeURIComponent(id)}/start`, {
    method: "POST",
  })

export const stopProject = (id: string) =>
  callApi<{ status: string }>(`/projects/${encodeURIComponent(id)}/stop`, {
    method: "POST",
  })

export const getFiles = (path = "") => callApi<FsListing>(`/fs?path=${encodeURIComponent(path)}`)

export const getPiHealth = () => callApi<PiHealth>("/pi-health")
