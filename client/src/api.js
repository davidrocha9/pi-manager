const BASE_URL = '/api/v1';

const callApi = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
  }

  // Handle cases where the response might be empty
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const getHealth = async () => callApi('/health');

export const getProjects = async () => callApi('/projects');

export const createProject = async (project) =>
  callApi('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  });

export const deleteProject = async (id) =>
  callApi(`/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const startProject = async (id) =>
  callApi(`/projects/${encodeURIComponent(id)}/start`, {
    method: 'POST',
  });

export const stopProject = async (id) =>
  callApi(`/projects/${encodeURIComponent(id)}/stop`, {
    method: 'POST',
  });

export const getFiles = async (path = '') => callApi(`/fs?path=${encodeURIComponent(path)}`);

export const getPiHealth = async () => callApi('/pi-health');
