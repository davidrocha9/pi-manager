<script>
  import { createEventDispatcher } from "svelte";
  import { Terminal, Info, FolderSearch, ArrowRight } from "lucide-svelte";

  const dispatch = createEventDispatcher();

  export let busy = false;
  export let path = "";

  let id = "";
  let description = "";
  let portsStr = "";

  const handleSubmit = () => {
    if (!id) return;
    const ports = portsStr
      ? portsStr
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p !== "")
      : [];
    dispatch("next", { id, description, path, ports });
    // Note: We don't reset yet as we might need to go back or reference this
  };

  export const reset = () => {
    id = "";
    description = "";
    path = "";
    portsStr = "";
  };
</script>

<form class="space-y-5" on:submit|preventDefault={handleSubmit}>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4">
      <div class="space-y-1.5">
        <label for="id" class="text-sm font-bold text-slate-700"
          >Project ID</label
        >
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
          >
            <Terminal size={16} />
          </div>
          <input
            id="id"
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            placeholder="e.g. my-awesome-app"
            bind:value={id}
            required
            aria-required="true"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="description" class="text-sm font-bold text-slate-700"
          >Description</label
        >
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
          >
            <Info size={16} />
          </div>
          <input
            id="description"
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            placeholder="What does this project do?"
            bind:value={description}
          />
        </div>
      </div>
      <div class="space-y-1.5">
        <label for="ports" class="text-sm font-bold text-slate-700"
          >Ports (Optional, comma-separated)</label
        >
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
          >
            <Terminal size={14} />
          </div>
          <input
            id="ports"
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            placeholder="e.g. 3000, 3001"
            bind:value={portsStr}
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <div class="space-y-1.5">
        <label for="path" class="text-sm font-bold text-slate-700"
          >Path to App</label
        >
        <div class="relative flex flex-col gap-2">
          <div class="flex gap-2">
            <input
              id="path"
              class="flex-1 pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="e.g. /home/pi/Projects/app"
              bind:value={path}
            />
            <button
              type="button"
              class="h-10 px-4 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-200 transition-all font-bold"
              on:click={() => dispatch("browse")}
            >
              <FolderSearch size={16} />
              Browse
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="pt-4 border-t border-slate-100 flex justify-end">
    <button
      class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
      type="submit"
      disabled={busy || !id}
    >
      Next: Configure Pipeline
      <ArrowRight size={18} />
    </button>
  </div>
</form>
