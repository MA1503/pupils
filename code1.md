

<!DOCTYPE html>

<html class="dark" lang="de"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Schülerliste - The Rhythmic Atelier</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Be+Vietnam+Pro:wght@300;400;500;600&amp;display=swap" rel="stylesheet"/>
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
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background-color: #0e0e0e;
            color: #ffffff;
            font-family: 'Be Vietnam Pro', sans-serif;
        }
        .editorial-shadow {
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }
        .glass-header {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="flex justify-center min-h-screen">
<main class="w-full max-w-[640px] flex flex-col min-h-screen pb-32">
<!-- TopAppBar (JSON Mapping) -->
<header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md max-w-[640px]">
<div class="flex items-center justify-between px-6 h-16 w-full">
<span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">The Rhythmic Atelier</span>
<div class="flex gap-4">
<button class="material-symbols-outlined text-[#ececec] hover:bg-[#262626] transition-colors p-2 rounded-full">settings</button>
</div>
</div>
</header>
<!-- Search & Filter Section (Bento Inspired) -->
<section class="mt-20 px-6 space-y-6">
<!-- Search Bar -->
<div class="relative group">
<div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-outline">search</span>
</div>
<input class="w-full bg-surface-container-lowest border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline-variant font-body transition-all" placeholder="Schüler suchen..." type="text"/>
</div>
<!-- Sort Controls -->
<div class="flex gap-3">
<button class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 bg-gradient-to-br from-primary to-primary-container text-on-primary-container">
                    Name
                </button>
<button class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 bg-surface-container-highest text-on-surface-variant hover:text-on-surface">
                    Vertragsbeginn
                </button>
</div>
</section>
<!-- Student List (Editorial Cards) -->
<section class="mt-8 px-6 space-y-4">
<!-- Student Item 1 -->
<div class="bg-surface-container-highest p-6 rounded-xl flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-transform">
<div class="flex items-center gap-4">
<div class="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/10">
<img alt="Student Avatar" class="h-full w-full object-cover" data-alt="Close-up portrait of a thoughtful young woman with soft natural lighting and warm skin tones against a dark studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhE1P4X9j7koDf2nAXh0sEHQgOC_Zg-Jmfx_jdieRipl4M31ntTmGfAP8MqYg33EzwhVHOcRrnvBjYwyrrZkSo5XtTeHoMSA77-s-ejeqj1Khh917Ifr_uDyJD5XUuMAASsvzTtTIErxyXEK5GDj4JEhzwvMkItMwjvXZjPSRcGDO1gp_VcWAXVA7Qg3Rnf0_JZTpSsNX9Rh7sReT4fWO6hx0Yz5MhQqqbs7OkW6KjoD2JE34M3BQX6QpuK_Hhnf4wvjR-BxAI7Q"/>
</div>
<div>
<h3 class="font-headline text-lg font-bold text-on-surface tracking-tight">Agathe Bauer</h3>
<p class="font-body text-sm text-outline">Mi 18:00</p>
</div>
</div>
<div class="flex items-center gap-2">
<span class="text-primary text-xs font-bold font-headline uppercase tracking-widest">Aktiv</span>
<span class="material-symbols-outlined text-outline-variant">chevron_right</span>
</div>
</div>
<!-- Student Item 2 -->
<div class="bg-surface-container-highest p-6 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform">
<div class="flex items-center gap-4">
<div class="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/10">
<img alt="Student Avatar" class="h-full w-full object-cover" data-alt="Portrait of a young man with glasses and a friendly expression in a moody dark environment with soft rim lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKfJb2O4BLrd_ulGkfh-SZuSd6E4JBLucjVr9mLxykYuxt04J4S-EJOBhd8cCtKW3Fstr_gRAfzJrSntvu7Rg_grzsdpufVhI0cAJ-bbFyt2DJb51_bIVSp_61CsPl678Lc4U7lQNjdroM9wbyavLsx95ESdKlmkuFoamMoz3nYP8EVG3Uqc-91rNXOnljzrUSYJFRZDOtvBZat7sn02rhSH4w84X-_Ch7Oc4dQEXcJiF_NI0cn4CX_TyEEmehHjdTGo47m6mS4Q"/>
</div>
<div>
<h3 class="font-headline text-lg font-bold text-on-surface tracking-tight">Lukas Schmidt</h3>
<p class="font-body text-sm text-outline">Mo 15:30</p>
</div>
</div>
<span class="material-symbols-outlined text-outline-variant">chevron_right</span>
</div>
<!-- Student Item 3 -->
<div class="bg-surface-container-highest p-6 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform">
<div class="flex items-center gap-4">
<div class="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/10">
<img alt="Student Avatar" class="h-full w-full object-cover" data-alt="Young woman laughing with soft focus background and vibrant warm cinematic lighting tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7EfZfF1Como3awF9wYS-ZLRXA_rvF97C4rDUVZyRn9fRSuYBpyqkZihebVKi3_94HjzpZAG62I0FG9P6X-147vzOPyCLV-TdFcDA9nwmaamBHuV1MWoo1WkCDrTIHYXzGKpFarrydR5jn4ybLEUSJGlu3R5BD1cdt6ssW6JEkzjs-jY1dg54S92St6hlUJqT69yYeLtCPSSx_2WWD12qKWPqERzRylgSHgzQCt8peWfFSN3p_u6PZr2GCb5qFr6Ue9rN0uSEBqA"/>
</div>
<div>
<h3 class="font-headline text-lg font-bold text-on-surface tracking-tight">Elisa Weber</h3>
<p class="font-body text-sm text-outline">Do 17:00</p>
</div>
</div>
<span class="material-symbols-outlined text-outline-variant">chevron_right</span>
</div>
<!-- Student Item 4 -->
<div class="bg-surface-container-highest p-6 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform opacity-60">
<div class="flex items-center gap-4">
<div class="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/10">
<img alt="Student Avatar" class="h-full w-full object-cover" data-alt="Middle aged man with beard looking forward with a professional expression in low light setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtVSgRWYBKPpRIY8_HaHdVk4OaosqoYIat29zBFGJrIVpFvRcnUh5jwjJDgfr-sQquJTcw7l77-XUOyYMelPN5rVFqjqaDeyJlup5heG-8YWgl5NtSaelg_9YIFpn58Uwp38xrfNpMHX8kr8TXtVJFteJ2WKsiTd2y13sV6OY_9GF5YZ2RvZyWU9WJNtFTfzSmJ_uvv3TdrcrsKoF-kK25WnxLeAIzfdGoc0cf0cbqDxJYqZgJOmZNOsaqlK_u34O-kbTBKVKGew"/>
</div>
<div>
<h3 class="font-headline text-lg font-bold text-on-surface tracking-tight">Marc Fischer</h3>
<p class="font-body text-sm text-outline">Fr 14:00 (Pausiert)</p>
</div>
</div>
<span class="material-symbols-outlined text-outline-variant">chevron_right</span>
</div>
</section>
<!-- Floating Action Button (FAB) -->
<div class="fixed bottom-24 right-6 md:right-[calc(50%-300px)] z-50">
<button class="editorial-shadow bg-gradient-to-br from-primary to-primary-container text-on-primary-container h-14 pl-5 pr-6 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform duration-200">
<span class="material-symbols-outlined font-bold">add</span>
<span class="font-headline font-extrabold text-sm uppercase tracking-wider">+ Schüler</span>
</button>
</div>
<!-- BottomNavBar (JSON Mapping) -->
<nav class="fixed bottom-0 w-full z-50 rounded-t-3xl bg-[#131313]/80 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.4)] max-w-[640px]">
<div class="flex justify-around items-center px-4 h-20 w-full">
<!-- Schüler Tab (Active) -->
<div class="flex flex-col items-center justify-center text-[#ff8ba1] bg-[#262626] rounded-xl px-4 py-1 active:scale-90 transition-transform cursor-pointer">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">group</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
</div>
<!-- Heute Tab -->
<div class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform cursor-pointer">
<span class="material-symbols-outlined">event_note</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Heute</span>
</div>
<!-- Bibliothek Tab -->
<div class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform cursor-pointer">
<span class="material-symbols-outlined">library_music</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Bibliothek</span>
</div>
<!-- Profil Tab -->
<div class="flex flex-col items-center justify-center text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform cursor-pointer">
<span class="material-symbols-outlined">person</span>
<span class="font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-widest mt-1">Profil</span>
</div>
</div>
</nav>
</main>
</body></html>