<!DOCTYPE html>

<html class="dark" lang="de"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&amp;family=Be+Vietnam+Pro:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
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
        .editorial-gradient-text {
            background: linear-gradient(135deg, #ff8ba1 0%, #ff7290 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-surface font-body antialiased min-h-screen selection:bg-primary-container selection:text-on-primary-container">
<!-- Transactional Header: TopAppBar (Simplified/Contextual) -->
<header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md">
<div class="flex items-center justify-between px-6 h-16 w-full max-w-[640px] mx-auto">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary" data-icon="music_note">music_note</span>
<h1 class="font-headline font-bold tracking-tight text-xl text-primary">Ersteinrichtung</h1>
</div>
<button class="text-on-surface-variant hover:text-on-surface transition-colors">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
</div>
</header>
<main class="pt-24 pb-12 px-6 flex flex-col items-center min-h-screen max-w-[640px] mx-auto">
<!-- Welcome Hero Section -->
<section class="w-full text-left mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
<div class="mb-6 overflow-hidden rounded-xl h-48 w-full bg-surface-container-highest relative">
<img alt="Atmospheric close-up of a dimly lit music studio with professional audio equipment and warm ambient pink lights" class="object-cover w-full h-full opacity-60 grayscale hover:grayscale-0 transition-all duration-1000" data-alt="Atmospheric close-up of a dimly lit music studio with professional audio equipment and warm ambient pink lights" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJEU51aQPyO0S-bfu_kh9tpKH7304OkfUwjGNdWyuvJksEHwf5rDk464ZLMFCe4qKZqIy42lTR8EY4mPvuSbrxN3Wnvb3S6RSc78EtyxfMEJxekBb3aFky4x52cvBNKgpC4p1Z9qf5tAgPzdYduA3rLe7Zrn5AKmSnnNH1pi6xAt62TGIaJmOSeYjkXPvLOubtqNrZ7LvzILU0QSvs3SWIne-UWC-xApbPu1s2G8Kvcgs4H9AgapcyTLy2Gwv-OdnVaDFwKHRXKQ"/>
<div class="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
</div>
<h2 class="font-headline font-extrabold text-4xl mb-3 tracking-tighter leading-none">
                Hallo! <span class="editorial-gradient-text">Lass uns deine Schüler-Daten synchronisieren.</span>
</h2>
<p class="text-on-surface-variant font-body text-base max-w-md">
                Verbinde dich mit deiner CouchDB-Instanz, um deinen Unterrichtsplan und deine Notizen geräteübergreifend aktuell zu halten.
            </p>
</section>
<!-- Setup Form Card -->
<section class="w-full bg-surface-container-highest rounded-xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
<form class="space-y-6">
<!-- Server URL Input -->
<div class="space-y-2">
<label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="server-url">Server-URL</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-outline text-lg" data-icon="dns">dns</span>
</div>
<input class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-4 py-4 transition-all focus:border-b-2 focus:border-primary" id="server-url" placeholder="https://couchdb.example.com" type="url"/>
</div>
</div>
<!-- Username Input -->
<div class="space-y-2">
<label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="username">Benutzername</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-outline text-lg" data-icon="person">person</span>
</div>
<input class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-4 py-4 transition-all focus:border-b-2 focus:border-primary" id="username" placeholder="Dein Nutzername" type="text"/>
</div>
</div>
<!-- Password Input -->
<div class="space-y-2">
<label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="password">Passwort</label>
<div class="relative">
<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-outline text-lg" data-icon="lock">lock</span>
</div>
<input class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-12 py-4 transition-all focus:border-b-2 focus:border-primary" id="password" placeholder="••••••••" type="password"/>
<button class="absolute inset-y-0 right-0 pr-4 flex items-center text-outline-variant hover:text-primary transition-colors" type="button">
<span class="material-symbols-outlined" data-icon="visibility">visibility</span>
</button>
</div>
</div>
<!-- Action Buttons -->
<div class="pt-6 space-y-4">
<button class="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold h-12 rounded-xl active:scale-95 transition-transform shadow-lg shadow-primary/20" type="submit">
                        Verbinden
                    </button>
<button class="w-full bg-transparent border border-outline-variant/30 text-on-surface font-headline font-bold h-12 rounded-xl hover:bg-surface-container-low transition-colors active:scale-95" type="button">
                        Vorerst überspringen
                    </button>
</div>
</form>
</section>
<!-- Secondary Info / Footer -->
<footer class="mt-12 text-center">
<div class="flex items-center justify-center gap-2 mb-4">
<span class="material-symbols-outlined text-outline-variant text-sm" data-icon="shield">shield</span>
<p class="text-on-surface-variant text-xs font-label">Deine Daten werden verschlüsselt übertragen und lokal gespeichert.</p>
</div>
<div class="flex items-center justify-center gap-6 opacity-30 grayscale contrast-125">
<div class="w-10 h-10 bg-on-surface-variant rounded-full flex items-center justify-center text-background font-bold italic">C</div>
<div class="w-10 h-10 bg-on-surface-variant rounded-full flex items-center justify-center text-background">
<span class="material-symbols-outlined" data-icon="sync">sync</span>
</div>
<div class="w-10 h-10 bg-on-surface-variant rounded-full flex items-center justify-center text-background font-black">RA</div>
</div>
</footer>
</main>
<!-- Visual Polish: Decorative Elements -->
<div class="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
<div class="fixed bottom-[5%] left-[-10%] w-[300px] h-[300px] bg-tertiary/5 rounded-full blur-[80px] -z-10"></div>
</body></html>