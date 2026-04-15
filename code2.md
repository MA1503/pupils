<!DOCTYPE html>

<html class="dark" lang="de"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Be_Vietnam_Pro:wght@300;400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "on-primary-fixed-variant": "#5f0022",
                    "surface-variant": "#262626",
                    "on-secondary-fixed-variant": "#8d2b5d",
                    "on-secondary-fixed": "#670840",
                    "on-secondary": "#580034",
                    "surface-dim": "#0e0e0e",
                    "on-tertiary-fixed-variant": "#3e228e",
                    "on-primary": "#630024",
                    "inverse-primary": "#be004c",
                    "on-primary-container": "#4d001a",
                    "surface-container-lowest": "#000000",
                    "surface-container": "#191a1a",
                    "surface-tint": "#ff8ba1",
                    "secondary": "#f882b8",
                    "on-tertiary": "#331283",
                    "tertiary": "#b5a0ff",
                    "primary-container": "#ff7290",
                    "surface": "#0e0e0e",
                    "on-error": "#490006",
                    "error-dim": "#d7383b",
                    "surface-bright": "#2c2c2c",
                    "tertiary-fixed-dim": "#aa93ff",
                    "inverse-on-surface": "#565555",
                    "background": "#0e0e0e",
                    "outline": "#767575",
                    "on-error-container": "#ffa8a3",
                    "tertiary-fixed": "#b7a3ff",
                    "surface-container-high": "#1f2020",
                    "on-tertiary-container": "#270072",
                    "on-tertiary-fixed": "#1b0056",
                    "error-container": "#9f0519",
                    "primary": "#ff8ba1",
                    "tertiary-dim": "#a58dfb",
                    "inverse-surface": "#fcf9f8",
                    "on-surface": "#ffffff",
                    "surface-container-low": "#131313",
                    "secondary-container": "#802053",
                    "outline-variant": "#484848",
                    "error": "#ff716c",
                    "secondary-fixed-dim": "#ffabcd",
                    "surface-container-highest": "#262626",
                    "secondary-dim": "#eb78ad",
                    "on-secondary-container": "#ffbed7",
                    "secondary-fixed": "#ffc0d8",
                    "primary-fixed-dim": "#ff5580",
                    "on-surface-variant": "#adaaaa",
                    "on-primary-fixed": "#000000",
                    "primary-dim": "#e2165f",
                    "primary-fixed": "#ff7290",
                    "tertiary-container": "#a890fe",
                    "on-background": "#ffffff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "fontFamily": {
                    "headline": ["Plus Jakarta Sans"],
                    "body": ["Be Vietnam Pro"],
                    "label": ["Be Vietnam Pro"]
            }
          },
        },
      }
    </script>
<style>
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-surface font-body selection:bg-primary/30">
<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md flex items-center justify-between px-6 h-16 w-full">
<div class="flex items-center gap-4">
<button class="text-[#ff8ba1] hover:bg-[#262626] transition-colors active:scale-95 duration-200 p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-[#ff8ba1] text-xl">The Rhythmic Atelier</h1>
</div>
<button class="text-[#ff8ba1] hover:bg-[#262626] transition-colors active:scale-95 duration-200 p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</header>
<main class="max-w-[640px] mx-auto pt-24 pb-32 px-6">
<!-- Profile Header Area -->
<section class="mb-10">
<div class="flex items-center justify-between group">
<h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Agathe Bauer</h2>
<button class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors active:scale-95">
<span class="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
</button>
</div>
<div class="mt-4 grid grid-cols-3 gap-3">
<div class="bg-surface-container-low p-3 rounded-xl">
<p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Termin</p>
<p class="text-sm font-semibold text-on-surface-variant">Mi 18:00</p>
</div>
<div class="bg-surface-container-low p-3 rounded-xl">
<p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Tarif</p>
<p class="text-sm font-semibold text-on-surface-variant">4er Karte</p>
</div>
<div class="bg-surface-container-low p-3 rounded-xl">
<p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Seit</p>
<p class="text-sm font-semibold text-on-surface-variant">2026-04-14</p>
</div>
</div>
</section>
<!-- Song Tabs -->
<section class="mb-12">
<h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold mb-4 ml-1">Repertoire</h3>
<div class="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
<button class="flex-shrink-0 px-5 py-2.5 bg-primary text-on-primary-container rounded-full font-headline font-bold text-sm shadow-lg shadow-primary/20">
                    I got the Power
                </button>
<button class="flex-shrink-0 px-5 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-full font-headline font-semibold text-sm hover:bg-surface-variant transition-colors">
                    xxxx
                </button>
<button class="flex-shrink-0 px-5 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-full font-headline font-semibold text-sm hover:bg-surface-variant transition-colors">
                    lalelu
                </button>
<button class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-surface-container-low border border-outline-variant/20 text-primary rounded-full hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined" data-icon="add">add</span>
</button>
</div>
</section>
<!-- Notiz-Liste (Notes Timeline) -->
<section>
<div class="flex items-center justify-between mb-6">
<h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold ml-1">Stundenprotokoll</h3>
<div class="h-[1px] flex-grow ml-4 bg-outline-variant/20"></div>
</div>
<!-- Grouped by Date -->
<div class="space-y-10 relative">
<!-- Vertical Timeline Line -->
<div class="absolute left-3 top-2 bottom-0 w-[1px] bg-gradient-to-b from-primary/40 to-transparent"></div>
<!-- Date Group -->
<div class="relative pl-10">
<!-- Progress Pip -->
<div class="absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
</div>
<span class="block text-sm font-headline font-bold text-on-surface-variant mb-4">14. April 2026</span>
<div class="bg-surface-container-highest p-6 rounded-2xl shadow-xl shadow-black/20">
<p class="text-on-surface leading-relaxed italic">
                            "sie glaubt immer noch, der song handle von ihr"
                        </p>
<div class="mt-4 pt-4 border-t border-outline-variant/10 flex gap-2">
<span class="px-2 py-0.5 bg-surface-container-low text-[10px] text-primary rounded uppercase tracking-tighter font-bold">Vocal Focus</span>
<span class="px-2 py-0.5 bg-surface-container-low text-[10px] text-on-surface-variant rounded uppercase tracking-tighter font-bold">Dynamics</span>
</div>
</div>
</div>
<!-- Another Date Group -->
<div class="relative pl-10 opacity-60">
<div class="absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 border-outline-variant bg-background"></div>
<span class="block text-sm font-headline font-bold text-on-surface-variant mb-4">07. April 2026</span>
<div class="bg-surface-container-low p-6 rounded-2xl">
<p class="text-on-surface-variant leading-relaxed">
                            Rhythmus-Übungen Takt 12-16. Fokus auf die Triolen im Refrain. Hausaufgabe: Metronom auf 95 BPM.
                        </p>
</div>
</div>
</div>
</section>
</main>
<!-- FAB: Floating Action Button -->
<div class="fixed bottom-28 right-6 md:right-[calc(50%-300px)] z-50">
<button class="flex items-center gap-2 px-6 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold rounded-2xl shadow-[0_12px_32px_rgba(255,139,161,0.3)] active:scale-90 transition-transform">
<span class="material-symbols-outlined font-bold" data-icon="add" style="font-variation-settings: 'FILL' 0, 'wght' 700;">add</span>
<span>HEUTE</span>
</button>
</div>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 w-full z-50 rounded-t-3xl bg-[#131313]/80 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.4)] flex justify-around items-center px-4 h-20 w-full">
<a class="flex flex-col items-center justify-center text-[#ff8ba1] bg-[#262626] rounded-xl px-4 py-1 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined" data-icon="group" style="font-variation-settings: 'FILL' 1;">group</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
</a>
<a class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined" data-icon="event_note">event_note</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Heute</span>
</a>
<a class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined" data-icon="library_music">library_music</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Bibliothek</span>
</a>
<a class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined" data-icon="person">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Profil</span>
</a>
</nav>
</body></html>