<script>
  import { Cpu, Zap, Clock, ShieldCheck, AlertCircle } from 'lucide-svelte';
  
  export let health = null;

  $: status = health?.error ? 'error' : (health ? 'healthy' : 'loading');
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div class="bg-white p-5 border border-slate-200 rounded-xl">
    <div class="flex items-center gap-4">
      <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
        <ShieldCheck size={24} />
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">System Status</p>
        <p class="text-lg font-bold text-slate-900">
          {#if status === 'healthy'}
            Online
          {:else}
            Offline
          {/if}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white p-5 border border-slate-200 rounded-xl">
    <div class="flex items-center gap-4">
      <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
        <Clock size={24} />
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Check</p>
        <p class="text-sm font-semibold text-slate-900">
          {health?.last_check ? new Date(health.last_check).toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white p-5 border border-slate-200 rounded-xl">
    <div class="flex items-center gap-4">
      <div class="p-3 bg-amber-50 text-amber-600 rounded-xl">
        <Zap size={24} />
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Uptime</p>
        <p class="text-lg font-bold text-slate-900">99.9%</p>
      </div>
    </div>
  </div>

  <div class="bg-white p-5 border border-slate-200 rounded-xl">
    <div class="flex items-center gap-4">
      <div class="p-3 bg-rose-50 text-rose-600 rounded-xl">
        <AlertCircle size={24} />
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Alerts</p>
        <p class="text-lg font-bold text-slate-900">{health?.error ? '1' : '0'}</p>
      </div>
    </div>
  </div>
</div>

