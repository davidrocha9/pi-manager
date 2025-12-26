<script>
    import { onMount, onDestroy } from "svelte";
    import {
        Cpu,
        MemoryStick,
        Thermometer,
        HardDrive,
        Activity,
        Clock,
        Server,
        Gauge,
        Calendar,
    } from "lucide-svelte";
    import { getPiHealth } from "../api";

    let piHealth = null;
    let loading = true;
    let error = null;
    let polling = null;

    // Selected metric for graph
    let selectedMetric = "cpu";
    let selectedTimeframe = "hour"; // hour, day, month, all

    // History from API
    let apiHistory = [];

    const refresh = async () => {
        try {
            const data = await getPiHealth();
            piHealth = data;
            apiHistory = data.history || [];
            error = null;
        } catch (e) {
            console.error("Failed to fetch Pi health:", e);
            error = e.message;
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        refresh();
        polling = setInterval(refresh, 5000);
    });

    onDestroy(() => {
        if (polling) clearInterval(polling);
    });

    // Temperature color based on value
    $: tempColor =
        piHealth?.temperature >= 70
            ? "text-red-600"
            : piHealth?.temperature >= 50
              ? "text-orange-500"
              : "text-emerald-600";

    $: tempBgColor =
        piHealth?.temperature >= 70
            ? "bg-red-500"
            : piHealth?.temperature >= 50
              ? "bg-orange-500"
              : "bg-emerald-500";

    // Graph configuration
    const metricConfig = {
        cpu: {
            label: "CPU Usage",
            key: "cpu_usage",
            color: "#6366f1",
            unit: "%",
            max: 100,
        },
        memory: {
            label: "Memory",
            key: "memory_percent",
            color: "#a855f7",
            unit: "%",
            max: 100,
        },
        temperature: {
            label: "Temperature",
            key: "temperature",
            color: "#f59e0b",
            unit: "°C",
            max: 85,
        },
        disk: {
            label: "Disk Usage",
            key: "disk_percent",
            color: "#f97316",
            unit: "%",
            max: 100,
        },
    };

    $: config = metricConfig[selectedMetric];

    // Timeframe settings
    const timeframeConfig = {
        hour: { label: "Last Hour", duration: 60 * 60 * 1000, points: 120 },
        day: { label: "Last Day", duration: 24 * 60 * 60 * 1000, points: 288 },
        month: {
            label: "Last Month",
            duration: 30 * 24 * 60 * 60 * 1000,
            points: 500,
        },
        all: { label: "All Time", duration: Infinity, points: 1000 },
    };

    // Filter and Downsample data
    $: filteredData = (() => {
        if (!apiHistory.length) return [];
        const now = Date.now();
        const duration = timeframeConfig[selectedTimeframe].duration;
        const startTime = duration === Infinity ? 0 : now - duration;

        let data = apiHistory.filter(
            (h) => new Date(h.time).getTime() >= startTime,
        );

        // Downsample to keep graph responsive
        const targetPoints = 300;
        if (data.length > targetPoints) {
            const step = Math.floor(data.length / targetPoints);
            data = data.filter((_, i) => i % step === 0);
        }

        return data.map((h) => ({
            time: new Date(h.time),
            value: h[config.key] || 0,
        }));
    })();

    function generatePath(data, width, height, maxValue) {
        if (data.length < 2) return "";
        const paddingX = 45;
        const paddingY = 20;
        const graphWidth = width - paddingX - 20;
        const graphHeight = height - paddingY - 30;

        return data
            .map((point, i) => {
                const x = paddingX + (i / (data.length - 1)) * graphWidth;
                const y =
                    paddingY +
                    graphHeight -
                    (Math.min(point.value, maxValue) / maxValue) * graphHeight;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");
    }

    function generateAreaPath(data, width, height, maxValue) {
        if (data.length < 2) return "";
        const paddingX = 45;
        const paddingY = 20;
        const graphWidth = width - paddingX - 20;
        const graphHeight = height - paddingY - 30;

        const linePath = data
            .map((point, i) => {
                const x = paddingX + (i / (data.length - 1)) * graphWidth;
                const y =
                    paddingY +
                    graphHeight -
                    (Math.min(point.value, maxValue) / maxValue) * graphHeight;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

        const lastX = paddingX + graphWidth;
        const firstX = paddingX;
        const bottomY = paddingY + graphHeight;

        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    function formatXLabel(date, timeframe) {
        const options = { hour: "2-digit", minute: "2-digit" };
        if (timeframe === "hour" || timeframe === "day") {
            return date.toLocaleTimeString([], options);
        } else if (timeframe === "month") {
            return date.toLocaleDateString([], {
                month: "short",
                day: "numeric",
            });
        } else {
            return date.toLocaleDateString([], {
                month: "short",
                day: "numeric",
            });
        }
    }

    // Smart label selection based on timeframe rules
    $: visibleLabels = (() => {
        if (filteredData.length < 2) return [];
        const labels = [];

        let lastMinutePushed = -1;
        let lastHourPushed = -1;
        let lastDayPushed = -1;
        let lastWeekPushed = -1;

        filteredData.forEach((point, i) => {
            const d = point.time;
            const m = d.getMinutes();
            const h = d.getHours();
            const date = d.getDate();
            const dayOfWeek = d.getDay(); // 0 for Sunday

            let shouldPush = false;

            if (selectedTimeframe === "hour") {
                // Every 5 mins
                if (m % 5 === 0 && m !== lastMinutePushed) {
                    shouldPush = true;
                    lastMinutePushed = m;
                }
            } else if (selectedTimeframe === "day") {
                // Every hour on the dot
                if (m === 0 && h !== lastHourPushed) {
                    shouldPush = true;
                    lastHourPushed = h;
                }
            } else if (selectedTimeframe === "month") {
                // Every day at midnight
                if (h === 0 && m === 0 && date !== lastDayPushed) {
                    shouldPush = true;
                    lastDayPushed = date;
                }
            } else if (selectedTimeframe === "all") {
                // Every beginning of week (Monday = 1)
                const weekNum = Math.floor(
                    d.getTime() / (7 * 24 * 60 * 60 * 1000),
                );
                if (
                    dayOfWeek === 1 &&
                    h === 0 &&
                    m === 0 &&
                    weekNum !== lastWeekPushed
                ) {
                    shouldPush = true;
                    lastWeekPushed = weekNum;
                }
            }

            if (shouldPush) {
                labels.push({ index: i, point });
            }
        });

        // Safety check to ensure we don't have TOO many or TOO few labels
        if (labels.length < 2 && filteredData.length >= 2) {
            // Fallback to start and end
            return [
                { index: 0, point: filteredData[0] },
                {
                    index: filteredData.length - 1,
                    point: filteredData[filteredData.length - 1],
                },
            ];
        }

        return labels;
    })();
</script>

<div class="h-[calc(100vh-14rem)] flex flex-col gap-6">
    {#if loading && !piHealth}
        <!-- Skeleton Loading -->
        <div class="flex-1 flex flex-col gap-4">
            <div class="grid grid-cols-3 gap-4 h-24">
                {#each Array(3) as _}
                    <div
                        class="bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
                    >
                        <div class="h-4 w-20 bg-slate-200 rounded mb-2"></div>
                        <div class="h-6 w-24 bg-slate-200 rounded"></div>
                    </div>
                {/each}
            </div>
            <div class="flex-1 flex gap-4 min-h-0">
                <div class="w-48 flex flex-col gap-3">
                    {#each Array(4) as _}
                        <div
                            class="bg-white border border-slate-200 rounded-xl p-4 animate-pulse flex-1"
                        >
                            <div
                                class="h-4 w-16 bg-slate-200 rounded mb-2"
                            ></div>
                            <div class="h-6 w-20 bg-slate-200 rounded"></div>
                        </div>
                    {/each}
                </div>
                <div
                    class="flex-1 bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
                >
                    <div class="h-full bg-slate-100 rounded"></div>
                </div>
            </div>
        </div>
    {:else if error && !piHealth}
        <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p class="text-red-600 font-medium">
                Failed to load Pi health data
            </p>
            <p class="text-red-500 text-sm mt-1">{error}</p>
            <button
                class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                on:click={refresh}>Retry</button
            >
        </div>
    {:else if piHealth}
        <!-- System Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div
                class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Server size={16} class="opacity-80" />
                    <span
                        class="text-[10px] font-medium opacity-80 uppercase tracking-wide"
                        >Hostname</span
                    >
                </div>
                <div class="text-xl font-bold truncate">
                    {piHealth.hostname || "N/A"}
                </div>
            </div>
            <div
                class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Clock size={16} class="opacity-80" />
                    <span
                        class="text-[10px] font-medium opacity-80 uppercase tracking-wide"
                        >Uptime</span
                    >
                </div>
                <div class="text-xl font-bold">{piHealth.uptime || "N/A"}</div>
            </div>
            <div
                class="bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl p-4 text-white shadow-lg"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Gauge size={16} class="opacity-80" />
                    <span
                        class="text-[10px] font-medium opacity-80 uppercase tracking-wide"
                        >Load Average</span
                    >
                </div>
                <div class="text-xl font-bold">
                    {piHealth.load_avg_1?.toFixed(2) || 0}, {piHealth.load_avg_5?.toFixed(
                        2,
                    ) || 0}, {piHealth.load_avg_15?.toFixed(2) || 0}
                </div>
            </div>
        </div>

        <div class="flex gap-4 flex-1 min-h-0">
            <!-- Metric Cards Column -->
            <div
                class="w-56 flex-shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar"
            >
                {#each Object.entries(metricConfig) as [key, m]}
                    <button
                        class="w-full text-left bg-white border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex-1 min-h-[110px] {selectedMetric ===
                        key
                            ? 'border-indigo-500 ring-2 ring-indigo-100'
                            : 'border-slate-100'}"
                        on:click={() => (selectedMetric = key)}
                    >
                        <div
                            class="flex items-center gap-2 text-slate-400 mb-1"
                        >
                            {#if key === "cpu"}<Cpu size={14} />{/if}
                            {#if key === "memory"}<MemoryStick size={14} />{/if}
                            {#if key === "temperature"}<Thermometer
                                    size={14}
                                />{/if}
                            {#if key === "disk"}<HardDrive size={14} />{/if}
                            <span
                                class="text-[10px] font-bold uppercase tracking-wider"
                                >{m.label.split(" ")[0]}</span
                            >
                        </div>
                        <div
                            class="text-2xl font-black {key === 'temperature'
                                ? tempColor
                                : 'text-slate-800'}"
                        >
                            {#if key === "cpu"}{piHealth.cpu_usage?.toFixed(
                                    1,
                                ) || 0}
                            {:else if key === "memory"}{piHealth.memory_percent?.toFixed(
                                    1,
                                ) || 0}
                            {:else if key === "temperature"}{piHealth.temperature?.toFixed(
                                    1,
                                ) || 0}
                            {:else}{piHealth.disk_percent?.toFixed(1) ||
                                    0}{/if}{m.unit}
                        </div>
                        <div
                            class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2"
                        >
                            <div
                                class="h-full rounded-full transition-all duration-500"
                                style="width: {Math.min(
                                    key === 'temperature'
                                        ? (piHealth.temperature / 85) * 100
                                        : piHealth[m.key] || 0,
                                    100,
                                )}%; background-color: {key === 'temperature'
                                    ? piHealth.temperature >= 70
                                        ? '#ef4444'
                                        : piHealth.temperature >= 50
                                          ? '#f59e0b'
                                          : '#10b981'
                                    : m.color}"
                            ></div>
                        </div>
                    </button>
                {/each}
            </div>

            <!-- Graph Area -->
            <div
                class="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col overflow-hidden"
            >
                <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 gap-4"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-4 h-4 rounded-full shadow-inner"
                            style="background-color: {config.color}"
                        ></div>
                        <h4 class="text-lg font-black text-slate-800">
                            {config.label}
                        </h4>
                    </div>

                    <!-- Timeframe Filter -->
                    <div
                        class="flex bg-slate-100 p-1 rounded-lg border border-slate-200"
                    >
                        {#each Object.entries(timeframeConfig) as [key, t]}
                            <button
                                class="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all {selectedTimeframe ===
                                key
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'}"
                                on:click={() => (selectedTimeframe = key)}
                            >
                                {t.label.split(" ")[1] || t.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <div
                    class="flex-1 relative w-full min-h-0 bg-slate-50/50 rounded-lg p-4 border border-slate-50"
                >
                    <svg
                        class="w-full h-full overflow-visible"
                        viewBox="0 0 500 200"
                        preserveAspectRatio="none"
                    >
                        <!-- Grid lines -->
                        <g stroke="#e2e8f0" stroke-width="0.5">
                            {#each [0, 1, 2, 3, 4] as i}
                                {@const y = 20 + i * 37.5}
                                <line
                                    x1="45"
                                    y1={y}
                                    x2="480"
                                    y2={y}
                                    stroke-dasharray="4"
                                />
                                <text
                                    x="40"
                                    y={y + 3}
                                    fill="#94a3b8"
                                    font-size="8"
                                    text-anchor="end"
                                    stroke="none"
                                    font-weight="bold"
                                >
                                    {Math.round(
                                        config.max * (1 - i / 4),
                                    )}{config.unit}
                                </text>
                            {/each}
                            <line
                                x1="45"
                                y1="20"
                                x2="45"
                                y2="170"
                                stroke-width="1"
                            />
                            <line
                                x1="45"
                                y1="170"
                                x2="480"
                                y2="170"
                                stroke-width="1"
                            />
                        </g>

                        {#if filteredData.length > 0}
                            <!-- X-axis labels (Smart logic) -->
                            <g>
                                {#each visibleLabels as { index, point }}
                                    {@const x =
                                        45 +
                                        (index / (filteredData.length - 1)) *
                                            435}
                                    <text
                                        {x}
                                        y="182"
                                        fill="#94a3b8"
                                        font-size="7"
                                        text-anchor="start"
                                        font-weight="bold"
                                        transform="rotate(45, {x}, 182)"
                                    >
                                        {formatXLabel(
                                            point.time,
                                            selectedTimeframe,
                                        )}
                                    </text>
                                    <line
                                        x1={x}
                                        y1="170"
                                        x2={x}
                                        y2="175"
                                        stroke="#e2e8f0"
                                        stroke-width="1"
                                    />
                                {/each}
                            </g>

                            {#if filteredData.length >= 2}
                                <path
                                    d={generateAreaPath(
                                        filteredData,
                                        500,
                                        200,
                                        config.max,
                                    )}
                                    fill={config.color}
                                    fill-opacity="0.1"
                                    class="transition-all duration-1000"
                                />
                                <path
                                    d={generatePath(
                                        filteredData,
                                        500,
                                        200,
                                        config.max,
                                    )}
                                    fill="none"
                                    stroke={config.color}
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="transition-all duration-1000"
                                />
                            {/if}

                            <!-- Pulse -->
                            {@const lastPoint =
                                filteredData[filteredData.length - 1]}
                            {@const x = 45 + 435}
                            {@const y =
                                20 +
                                150 -
                                (Math.min(lastPoint.value, config.max) /
                                    config.max) *
                                    150}
                            <circle
                                cx={x}
                                cy={y}
                                r="4"
                                fill={config.color}
                                stroke="white"
                                stroke-width="2"
                            />
                            <circle
                                cx={x}
                                cy={y}
                                r="8"
                                fill={config.color}
                                fill-opacity="0.2"
                            >
                                <animate
                                    attributeName="r"
                                    values="6;10;6"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        {:else}
                            <foreignObject
                                x="45"
                                y="20"
                                width="435"
                                height="150"
                            >
                                <div
                                    class="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"
                                >
                                    <Activity class="animate-pulse" size={24} />
                                    <p
                                        class="text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        No data for this timeframe
                                    </p>
                                </div>
                            </foreignObject>
                        {/if}
                    </svg>
                </div>
            </div>
        </div>
    {/if}
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
