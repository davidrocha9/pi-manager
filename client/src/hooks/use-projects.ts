import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createProject,
  deleteProject,
  getProjects,
  startProject,
  stopProject,
  type CreateProjectInput,
  type Project,
} from "@/lib/api"

export const projectsQueryKey = ["projects"] as const

export function useProjects() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: getProjects,
    refetchInterval: 2_000,
    // The old setInterval kept polling in hidden tabs; preserve that.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

function useProjectStatusMutation(
  mutationFn: (id: string) => Promise<unknown>,
  optimisticStatus: Project["status"],
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey })
      const previous = queryClient.getQueryData<Project[]>(projectsQueryKey)

      queryClient.setQueryData<Project[]>(projectsQueryKey, (current) =>
        current?.map((project) =>
          project.id === id ? { ...project, status: optimisticStatus } : project,
        ),
      )

      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectsQueryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}

export function useStartProject() {
  return useProjectStatusMutation(startProject, "BOOTING")
}

export function useStopProject() {
  return useProjectStatusMutation(stopProject, "IDLE")
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}
