<script>
  import {
    Play,
    Square,
    Trash2,
    ExternalLink,
    Activity,
    Command,
    Terminal,
    Info,
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";

  export let project;
  export let busy = false;

  const dispatch = createEventDispatcher();

  const handleStart = () => dispatch("start", project.id);
  const handleStop = () => dispatch("stop", project.id);
  const handleViewLog = () => dispatch("view-log", project.id);
  const handleDelete = () => dispatch("delete", project.id);
</script>

<article
  class="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
>
  <div class="p-5">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-slate-50 rounded-lg text-slate-600">
          <Command size={20} />
        </div>
        <div>
          <h3 class="font-bold text-slate-900 leading-tight">{project.id}</h3>
          <p
            class="text-xs text-slate-500 font-medium uppercase tracking-wider"
          >
            Project
          </p>
        </div>
      </div>
      <div
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm transition-all"
        class:bg-emerald-200={project.status === "ACTIVE"}
        class:text-emerald-900={project.status === "ACTIVE"}
        class:border-emerald-300={project.status === "ACTIVE"}
        class:bg-orange-200={project.status === "BOOTING"}
        class:text-orange-900={project.status === "BOOTING"}
        class:border-orange-300={project.status === "BOOTING"}
        class:bg-red-200={project.status === "FAILED"}
        class:text-red-900={project.status === "FAILED"}
        class:border-red-300={project.status === "FAILED"}
        class:bg-yellow-200={!project.status || project.status === "IDLE"}
        class:text-yellow-900={!project.status || project.status === "IDLE"}
        class:border-yellow-300={!project.status || project.status === "IDLE"}
      >
        <div
          class="w-1.5 h-1.5 rounded-full shadow-sm"
          class:bg-emerald-500={project.status === "ACTIVE"}
          class:bg-orange-500={project.status === "BOOTING"}
          class:animate-pulse={project.status === "BOOTING"}
          class:bg-red-500={project.status === "FAILED"}
          class:bg-yellow-500={!project.status || project.status === "IDLE"}
        ></div>
        <div class="flex flex-col">
          <span>{project.status || "IDLE"}</span>
          {#if project.status === "BOOTING" && project.current_step}
            <span
              class="text-[8px] opacity-70 normal-case font-bold text-orange-600"
            >
              {project.current_step}
              {project.progress}%
            </span>
          {/if}
        </div>
      </div>
    </div>

    <p class="text-sm text-slate-600 line-clamp-2 mb-6 min-h-[2.5rem]">
      {project.description || "No description provided for this project."}
    </p>

    <div class="space-y-3 mb-6">
      <div class="flex items-center justify-between text-xs">
        <span
          class="text-slate-400 flex items-center gap-1.5 font-bold uppercase tracking-tighter"
        >
          <Activity size={12} />
          Check
        </span>
        <code
          class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono truncate max-w-[150px]"
        >
          {project.check_cmd || "none"}
        </code>
      </div>
      <div class="flex items-start justify-between text-xs">
        <span
          class="text-slate-400 flex items-center gap-1.5 pt-0.5 font-bold uppercase tracking-tighter"
        >
          <Play size={12} />
          Path
        </span>
        <span
          class="text-slate-600 font-mono truncate max-w-[180px] bg-slate-50 px-1 rounded"
        >
          {project.path || "-"}
        </span>
      </div>
      <div class="flex items-center justify-between text-xs">
        <span
          class="text-slate-400 flex items-center gap-1.5 pt-0.5 font-bold uppercase tracking-tighter"
        >
          <ExternalLink size={12} />
          Port
        </span>
        <span
          class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold"
        >
          {project.port || "None"}
        </span>
      </div>

      <div class="flex items-center gap-2 pt-4 border-t border-slate-100">
        {#if project.status === "ACTIVE" || project.status === "BOOTING"}
          <button
            class="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
            on:click={handleStop}
            disabled={busy}
            aria-label="Kill Project"
          >
            <Square size={14} fill="currentColor" />
            KILL
          </button>
        {:else}
          <button
            class="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
            on:click={handleStart}
            disabled={busy}
            aria-label="Start Project"
          >
            <Play size={14} fill="currentColor" />
            START
          </button>
        {/if}

        <button
          class="flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm group"
          on:click={handleViewLog}
          aria-label="View Logs"
          title="LOGS"
        >
          <Terminal
            size={18}
            class="group-hover:scale-110 transition-transform"
          />
        </button>

        <button
          class="flex items-center justify-center p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleDelete}
          disabled={busy}
          aria-label="Delete Project"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  </div>
</article>
