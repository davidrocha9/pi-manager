<script>
  import { onMount, onDestroy } from "svelte";
  import Sidebar from "./components/Sidebar.svelte";

  import ProjectForm from "./components/ProjectForm.svelte";
  import PipelineEditor from "./components/PipelineEditor.svelte";
  import Modal from "./components/Modal.svelte";
  import FileBrowser from "./components/FileBrowser.svelte";
  import PiHealth from "./components/PiHealth.svelte";
  import { Search, Bell, User, Terminal, List, Trash2 } from "lucide-svelte";
  import {
    getHealth,
    getProjects,
    createProject,
    deleteProject,
    startProject,
    stopProject,
  } from "./api";

  let loading = true;
  let health = null;
  let projects = [];
  let polling = null;
  let busy = false;
  let activeTab = "projects";
  let searchQuery = "";

  // friendly page title for display (tab id -> human title)
  $: pageTitle =
    activeTab === "projects"
      ? "Dashboard"
      : activeTab === "system"
        ? "Pi Health"
        : typeof activeTab === "string"
          ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
          : "";

  // Modal states
  let showCreateModal = false;
  let showPipelineModal = false;
  let showLogModal = false;
  let showBrowserModal = false;
  let projectPath = "";
  let logTitle = "";
  let logContent = "";

  // Keep log content updated if modal is open
  $: if (showLogModal && projects.length > 0) {
    const id = logTitle.replace("Execution Log: ", "");
    const p = projects.find((proj) => proj.id === id);
    if (p) logContent = p.last_log || "No logs available yet.";
  }

  let tempProjectData = null;
  let projectFormRef;

  // Filter projects based on search query
  $: filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.id?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.path?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
    );
  });
  const handlePathSelect = (e) => {
    projectPath = e.detail;
    showBrowserModal = false;
  };

  const refresh = async () => {
    try {
      const [healthData, projectsData] = await Promise.all([
        getHealth(),
        getProjects(),
      ]);
      health = healthData;
      projects = projectsData;
    } catch (e) {
      console.error("Refresh failed:", e);
      health = { error: e.message };
    } finally {
      loading = false;
    }
  };

  const handleNextProject = (e) => {
    tempProjectData = e.detail;
    showCreateModal = false;
    showPipelineModal = true;
  };

  const handleCreate = async (e) => {
    busy = true;
    try {
      const finalProject = { ...tempProjectData, pipeline: e.detail };
      await createProject(finalProject);
      showPipelineModal = false;
      tempProjectData = null;
      if (projectFormRef) projectFormRef.reset();
      projectPath = "";
      await refresh();
    } catch (err) {
      alert(`Error creating project: ${err.message}`);
    } finally {
      busy = false;
    }
  };

  const handleBackToProject = () => {
    showPipelineModal = false;
    showCreateModal = true;
  };

  const handleStart = async (id) => {
    busy = true;
    // Optimistic update
    projects = projects.map((p) =>
      p.id === id ? { ...p, status: "BOOTING" } : p,
    );
    try {
      await startProject(id);
      await refresh();
    } catch (err) {
      alert(`Error starting project: ${err.message}`);
      await refresh(); // Revert on error
    } finally {
      busy = false;
    }
  };

  const handleStop = async (id) => {
    busy = true;
    // Optimistic update
    projects = projects.map((p) =>
      p.id === id ? { ...p, status: "IDLE" } : p,
    );
    try {
      await stopProject(id);
      await refresh();
    } catch (err) {
      alert(`Error stopping project: ${err.message}`);
      await refresh();
    } finally {
      busy = false;
    }
  };

  const viewLog = (project) => {
    logTitle = `Execution Log: ${project.id}`;
    logContent = project.last_log || "No logs available yet.";
    showLogModal = true;
  };

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to delete project "${id}"?`)) return;
    busy = true;
    try {
      await deleteProject(id);
      await refresh();
    } catch (err) {
      alert(`Error deleting project: ${err.message}`);
    } finally {
      busy = false;
    }
  };

  onMount(() => {
    refresh();
    polling = setInterval(refresh, 2000); // Poll every 2 seconds for status
  });

  onDestroy(() => {
    if (polling) clearInterval(polling);
  });
</script>

<div
  class="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900"
>
  <Sidebar
    {activeTab}
    onTabChange={(tab) => (activeTab = tab)}
    onNewProject={() => (showCreateModal = true)}
  />

  <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <!-- Top Bar -->
    <header
      class="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30"
    >
      <div class="flex items-center gap-4 flex-1">
        {#if activeTab === "projects"}
          <div class="relative w-full max-w-md hidden md:block">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
            >
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search projects by name, description, path..."
              bind:value={searchQuery}
              class="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg text-sm transition-all outline-none"
            />
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-4">
        <button
          class="flex items-center gap-3 pl-2 pr-1 py-1 hover:bg-slate-50 rounded-lg transition-all"
        >
          <div class="text-right hidden sm:block">
            <p class="text-xs font-bold text-slate-900 leading-none">
              Admin User
            </p>
            <p class="text-[10px] text-slate-500 font-medium">System Manager</p>
          </div>
          <div
            class="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm"
          >
            AD
          </div>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-8">
      <div class="max-w-7xl mx-auto space-y-8">
        <!-- Page Header -->
        <div
          class="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h2
              class="text-3xl font-extrabold text-slate-900 tracking-tight capitalize"
            >
              {pageTitle}
            </h2>
            <p class="text-slate-500 mt-1 font-medium">
              Manage and monitor your Pi projects and system health.
            </p>
          </div>
        </div>

        {#if activeTab === "projects"}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3
                class="text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <Terminal size={20} class="text-indigo-600" />
                All Projects
                <span
                  class="ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-full font-bold"
                >
                  {projects.length}
                </span>
              </h3>
            </div>

            {#if loading}
              <div
                class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div class="w-full overflow-auto">
                  <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-slate-500">
                      <tr>
                        <th class="text-left px-4 py-3">Name</th>
                        <th class="text-left px-4 py-3">Description</th>
                        <th class="text-left px-4 py-3">Directory</th>
                        <th class="text-center px-4 py-3">Status</th>
                        <th class="text-left px-4 py-3">Port</th>
                        <th class="text-right px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody class="bg-white">
                      {#each Array(3) as _}
                        <tr class="border-t animate-pulse">
                          <td class="px-4 py-3">
                            <div class="h-4 w-24 bg-slate-200 rounded"></div>
                          </td>
                          <td class="px-4 py-3">
                            <div class="h-4 w-48 bg-slate-200 rounded"></div>
                          </td>
                          <td class="px-4 py-3">
                            <div class="h-4 w-32 bg-slate-200 rounded"></div>
                          </td>
                          <td class="px-4 py-3">
                            <div
                              class="h-6 w-20 bg-slate-200 rounded-full mx-auto"
                            ></div>
                          </td>
                          <td class="px-4 py-3">
                            <div class="h-4 w-12 bg-slate-200 rounded"></div>
                          </td>
                          <td class="px-4 py-3 text-right">
                            <div
                              class="h-8 w-24 bg-slate-200 rounded ml-auto"
                            ></div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {:else if projects.length === 0}
              <div
                class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"
              >
                <div
                  class="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Terminal size={32} />
                </div>
                <h4 class="text-lg font-bold text-slate-900 mb-1">
                  No projects found
                </h4>
                <p class="text-slate-500 mb-6 max-w-xs mx-auto">
                  Click "New Project" to get started.
                </p>
                <button
                  class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
                  on:click={() => (showCreateModal = true)}
                >
                  Create Your First Project
                </button>
              </div>
            {:else if filteredProjects.length === 0}
              <div
                class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"
              >
                <div
                  class="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Search size={32} />
                </div>
                <h4 class="text-lg font-bold text-slate-900 mb-1">
                  No matching projects
                </h4>
                <p class="text-slate-500 mb-6 max-w-xs mx-auto">
                  No projects match "{searchQuery}". Try a different search
                  term.
                </p>
                <button
                  class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                  on:click={() => (searchQuery = "")}
                >
                  Clear Search
                </button>
              </div>
            {:else}
              <div
                class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div class="w-full overflow-auto">
                  <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-slate-500">
                      <tr>
                        <th class="text-left px-4 py-3">Name</th>
                        <th class="text-left px-4 py-3">Description</th>
                        <th class="text-left px-4 py-3">Directory</th>
                        <th class="text-center px-4 py-3">Status</th>
                        <th class="text-left px-4 py-3">Port</th>
                        <th class="text-right px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody class="bg-white">
                      {#each filteredProjects as project}
                        <tr
                          class="border-t hover:bg-slate-50 transition-colors"
                        >
                          <td class="px-4 py-3 font-bold text-slate-900"
                            >{project.id}</td
                          >
                          <td class="px-4 py-3 text-slate-500 max-w-xs truncate"
                            >{project.description || "-"}</td
                          >
                          <td class="px-4 py-3 text-slate-600 text-xs font-mono"
                            >{project.path || "-"}</td
                          >
                          <td class="px-4 py-3 text-center">
                            <div class="flex flex-col items-center gap-1">
                              <span
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm transition-all"
                                class:text-emerald-900={project.status ===
                                  "ACTIVE" ||
                                  (project.status === "BOOTING" &&
                                    project.progress === 100)}
                                class:bg-emerald-200={project.status ===
                                  "ACTIVE" ||
                                  (project.status === "BOOTING" &&
                                    project.progress === 100)}
                                class:border-emerald-300={project.status ===
                                  "ACTIVE" ||
                                  (project.status === "BOOTING" &&
                                    project.progress === 100)}
                                class:text-orange-900={project.status ===
                                  "BOOTING" && project.progress !== 100}
                                class:bg-orange-200={project.status ===
                                  "BOOTING" && project.progress !== 100}
                                class:border-orange-300={project.status ===
                                  "BOOTING" && project.progress !== 100}
                                class:text-red-900={project.status === "FAILED"}
                                class:bg-red-200={project.status === "FAILED"}
                                class:border-red-300={project.status ===
                                  "FAILED"}
                                class:text-yellow-900={!project.status ||
                                  project.status === "IDLE"}
                                class:bg-yellow-200={!project.status ||
                                  project.status === "IDLE"}
                                class:border-yellow-300={!project.status ||
                                  project.status === "IDLE"}
                              >
                                <div
                                  class="w-1.5 h-1.5 rounded-full shadow-sm"
                                  class:bg-emerald-500={project.status ===
                                    "ACTIVE" ||
                                    (project.status === "BOOTING" &&
                                      project.progress === 100)}
                                  class:bg-orange-500={project.status ===
                                    "BOOTING" && project.progress !== 100}
                                  class:animate-pulse={project.status ===
                                    "BOOTING" && project.progress !== 100}
                                  class:bg-red-500={project.status === "FAILED"}
                                  class:bg-yellow-500={!project.status ||
                                    project.status === "IDLE"}
                                ></div>
                                {project.status === "BOOTING" &&
                                project.progress === 100
                                  ? "ACTIVE"
                                  : project.status || "IDLE"}
                              </span>
                            </div>
                          </td>
                          <td class="px-4 py-3 text-slate-700 font-medium">
                            {#if project.port}
                              <a
                                href="http://{health?.tailscale_name ||
                                  'localhost'}:{project.port}"
                                target="_blank"
                                class="text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                {project.port}
                              </a>
                            {:else}
                              -
                            {/if}
                          </td>
                          <td class="px-4 py-3 text-right">
                            <div class="inline-flex items-center gap-2">
                              {#if project.status === "ACTIVE" || project.status === "BOOTING"}
                                <button
                                  class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200 flex items-center gap-1"
                                  on:click={() => handleStop(project.id)}
                                  disabled={busy}
                                >
                                  KILL
                                </button>
                              {:else}
                                <button
                                  class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-200 flex items-center gap-1"
                                  on:click={() => handleStart(project.id)}
                                  disabled={busy}
                                >
                                  START
                                </button>
                              {/if}

                              <button
                                class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-1"
                                on:click={() => viewLog(project)}
                              >
                                LOGS
                              </button>

                              <button
                                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1"
                                on:click={() => handleDelete(project.id)}
                                disabled={busy}
                                title="Delete Project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        {#if activeTab === "system"}
          <PiHealth />
        {/if}
      </div>
    </div>
  </main>

  <!-- Modals -->
  <Modal bind:show={showCreateModal} title="Add New Project" size="lg">
    <ProjectForm
      bind:this={projectFormRef}
      on:next={handleNextProject}
      on:browse={() => (showBrowserModal = true)}
      {busy}
      bind:path={projectPath}
    />
  </Modal>

  <Modal
    bind:show={showPipelineModal}
    title="Configure Project Pipeline"
    size="lg"
  >
    <PipelineEditor
      on:save={handleCreate}
      on:back={handleBackToProject}
      {busy}
    />
  </Modal>

  <Modal
    bind:show={showBrowserModal}
    title="Select Project Directory"
    size="lg"
  >
    <FileBrowser initialPath={projectPath} on:select={handlePathSelect} />
  </Modal>

  <Modal bind:show={showLogModal} title={logTitle} size="xl">
    <div
      class="bg-slate-950 rounded-xl p-6 font-mono text-sm text-emerald-400 overflow-auto max-h-[60vh] shadow-inner border border-slate-800"
    >
      <div
        class="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2 text-slate-500 text-xs uppercase tracking-widest font-bold"
      >
        <Terminal size={14} />
        Output Console
      </div>
      <pre class="whitespace-pre-wrap">{logContent ||
          "No output received from the command."}</pre>
    </div>
  </Modal>
</div>
