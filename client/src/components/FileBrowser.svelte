<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { Folder, File, ChevronLeft, Home, Search } from "lucide-svelte";
    import { getFiles } from "../api";

    const dispatch = createEventDispatcher();

    export let initialPath = "";

    let currentPath = initialPath;
    $: if (initialPath !== undefined) {
        currentPath = initialPath;
    }
    let entries = [];
    let loading = false;
    let error = null;
    let searchTerm = "";

    const loadPath = async (path) => {
        loading = true;
        error = null;
        try {
            const data = await getFiles(path);
            currentPath = data.current_path;
            entries = data.entries.sort((a, b) => {
                if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
                return a.is_dir ? -1 : 1;
            });
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    };

    const handleEntryClick = (entry) => {
        if (entry.is_dir) {
            loadPath(entry.path);
        }
    };

    const goUp = () => {
        const parts = currentPath.split("/").filter(Boolean);
        if (parts.length === 0) return;
        parts.pop();
        const parentPath = "/" + parts.join("/");
        loadPath(parentPath);
    };

    const handleSelect = () => {
        dispatch("select", currentPath);
    };

    onMount(() => {
        loadPath(initialPath);
    });

    $: filteredEntries = entries.filter((e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
</script>

<div
    class="flex flex-col h-[400px] border border-slate-200 rounded-xl overflow-hidden bg-white"
>
    <!-- Header -->
    <div class="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
        <div class="flex items-center gap-2">
            <button
                class="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-all disabled:opacity-30"
                on:click={goUp}
                disabled={currentPath === "/" || currentPath === ""}
                title="Go Up"
            >
                <ChevronLeft size={20} />
            </button>
            <div
                class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono truncate text-slate-500"
            >
                {currentPath || "/"}
            </div>
            <button
                class="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-all"
                on:click={() => loadPath("")}
                title="Home"
            >
                <Home size={18} />
            </button>
        </div>

        <div class="relative">
            <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
            >
                <Search size={14} />
            </div>
            <input
                type="text"
                placeholder="Filter folders..."
                bind:value={searchTerm}
                class="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-1 custom-scrollbar">
        {#if loading}
            <div
                class="flex items-center justify-center h-full text-slate-400 text-sm"
            >
                <div class="animate-spin mr-2">⏳</div>
                Loading...
            </div>
        {:else if error}
            <div
                class="p-4 text-red-500 text-sm flex flex-col items-center justify-center h-full italic"
            >
                <p>Error: {error}</p>
                <button
                    class="mt-2 text-indigo-600 font-bold hover:underline"
                    on:click={() => loadPath(currentPath)}>Retry</button
                >
            </div>
        {:else}
            <div class="grid grid-cols-1 divide-y divide-slate-50">
                {#each filteredEntries as entry}
                    <button
                        class="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50/50 text-left transition-all group"
                        on:click={() => handleEntryClick(entry)}
                    >
                        <div
                            class={entry.is_dir
                                ? "text-indigo-500 group-hover:scale-110 transition-transform"
                                : "text-slate-400"}
                        >
                            {#if entry.is_dir}
                                <Folder
                                    size={18}
                                    fill="currentColor"
                                    fill-opacity="0.1"
                                />
                            {:else}
                                <File size={18} />
                            {/if}
                        </div>
                        <span
                            class="text-xs font-medium text-slate-700 truncate"
                            >{entry.name}</span
                        >
                    </button>
                {/each}

                {#if filteredEntries.length === 0}
                    <div class="p-8 text-center text-slate-400 text-xs italic">
                        No items found
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Footer -->
    <div
        class="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center"
    >
        <div class="text-[10px] text-slate-500 font-medium">
            Selected: <span class="text-slate-900 font-mono">{currentPath}</span
            >
        </div>
        <button
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
            on:click={handleSelect}
        >
            Choose Folder
        </button>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
