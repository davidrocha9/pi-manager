<script>
    import { createEventDispatcher } from "svelte";
    import { Plus, Play } from "lucide-svelte";

    const dispatch = createEventDispatcher();

    export let pipeline = [
        { name: "Install", cmd: "bun install" },
        { name: "Build", cmd: "bun run build" },
        { name: "Start", cmd: "bun run start" },
    ];
    export let busy = false;

    const addStep = () => {
        pipeline = [...pipeline, { name: "New Step", cmd: "" }];
    };

    const removeStep = (index) => {
        pipeline = pipeline.filter((_, i) => i !== index);
    };

    const handleSave = () => {
        dispatch("save", pipeline);
    };
</script>

<div class="space-y-5">
    <div class="flex items-center justify-between">
        <div>
            <h3 class="text-sm font-bold text-slate-700">Execution Steps</h3>
            <p class="text-xs text-slate-500">
                Define the sequence of commands to run your project.
            </p>
        </div>
        <button
            type="button"
            class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
            on:click={addStep}
        >
            <Plus size={14} /> Add Step
        </button>
    </div>

    <div class="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
        {#each pipeline as step, i}
            <div
                class="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group transition-all hover:border-slate-300"
            >
                <button
                    type="button"
                    class="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    on:click={() => removeStep(i)}
                    aria-label="Remove step"
                >
                    <Plus size={16} class="rotate-45" />
                </button>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div class="md:col-span-1">
                        <span
                            class="text-[10px] uppercase font-bold text-slate-400 mb-1 block"
                            >Name</span
                        >
                        <input
                            class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Build"
                            bind:value={step.name}
                        />
                    </div>
                    <div class="md:col-span-3">
                        <span
                            class="text-[10px] uppercase font-bold text-slate-400 mb-1 block"
                            >Command</span
                        >
                        <input
                            class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. bun run build"
                            bind:value={step.cmd}
                        />
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
        <button
            class="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            on:click={() => dispatch("back")}
            disabled={busy}
        >
            Back
        </button>
        <button
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
            on:click={handleSave}
            disabled={busy || pipeline.length === 0}
        >
            <Play size={18} />
            Create Project
        </button>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
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
