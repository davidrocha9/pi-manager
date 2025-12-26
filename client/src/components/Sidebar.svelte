<script>
  import { Activity, PlusCircle, Github, Terminal } from "lucide-svelte";

  export let activeTab = "projects";
  export let onTabChange = (tab) => {};
  export let onNewProject = () => {};

  const tabs = [
    { id: "projects", name: "Dashboard", icon: Terminal },
    { id: "system", name: "Pi Health", icon: Activity },
  ];

  const handleTabClick = (id) => {
    onTabChange(id);
  };
</script>

<aside
  class="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0"
>
  <div class="p-6">
    <div class="flex items-center gap-3 text-white mb-8">
      <div class="bg-indigo-600 p-2 rounded-lg">
        <Terminal size={20} />
      </div>
      <h1 class="text-xl font-bold tracking-tight text-white">Pi Manager</h1>
    </div>

    <nav class="space-y-1">
      {#each tabs as tab}
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium {activeTab ===
          tab.id
            ? 'bg-slate-800 text-white'
            : 'hover:bg-slate-800 hover:text-white'}"
          on:click={() => handleTabClick(tab.id)}
          aria-label={tab.name}
        >
          <svelte:component this={tab.icon} size={18} />
          {tab.name}
        </button>
      {/each}
    </nav>
  </div>

  <div class="mt-auto p-6 space-y-4">
    <button
      class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
      on:click={onNewProject}
      aria-label="Add New Project"
    >
      <PlusCircle size={18} />
      Add Project
    </button>

    <div class="pt-6 border-t border-slate-800">
      <a
        href="https://github.com/davidrocha9/pi-manager"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-white transition-colors"
      >
        <Github size={18} />
        GitHub Repo
      </a>
    </div>
  </div>
</aside>
