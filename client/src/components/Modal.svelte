<script>
  import { X, Terminal } from 'lucide-svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  export let show = false;
  export let title = '';
  export let size = 'md'; // md, lg, xl

  const dispatch = createEventDispatcher();

  const handleClose = () => {
    show = false;
    dispatch('close');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClose();
  };

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  onMount(() => window.addEventListener('keydown', handleKeyDown));
  onDestroy(() => window.removeEventListener('keydown', handleKeyDown));
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    on:click|self={handleClose}
    on:keydown|self={(e) => (e.key === 'Enter' || e.key === ' ') && handleClose()}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl w-full {sizeClasses[size]} overflow-hidden animate-in fade-in zoom-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 id="modal-title" class="text-lg font-bold text-slate-900 flex items-center gap-2">
          {title}
        </h2>
        <button
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          on:click={handleClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </div>
      
      <div class="p-6">
        <slot />
      </div>
    </div>
  </div>
{/if}


