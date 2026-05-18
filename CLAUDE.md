# CLAUDE.md

Fichier lu automatiquement par Claude Code à chaque session. Contexte du projet, stack, conventions, règles de comportement.

---

## 🚨 À LIRE EN PRIORITÉ EN DÉBUT DE SESSION

**Avant toute optimisation de performance ou d'animation :**

Demander à Thomas s'il a installé un release build EAS récent (`--profile preview` ou `production`). Sinon, suggérer fortement de le faire et de tester l'app en release **avant** de passer du temps à optimiser le code.

**Pourquoi :** le dev build inclut Reanimated en mode dev (validations + warnings), React DevTools, le bridge JS instrumenté, sourcemaps, et le pont Metro. Tout ça ralentit 2-3× le ressenti d'animation et de fluidité. Une app qui semble laggy en dev tourne souvent fluide en release.

Lors de la session du 2026-05-18, ~15 itérations d'optim sur les animations day screen sans converger vers le ressenti voulu. Hypothèse forte : dev build est le bottleneck. Refuser d'optimiser à l'aveugle avant test release.

**Commande à lui rappeler :** `eas build --profile preview --platform android` (10 min), installer l'APK, retester.

Si Thomas confirme avoir déjà fait le release build → ne pas insister, retirer ce bloc de CLAUDE.md.

---

## 🎯 OBJECTIFS LONG TERME — NE JAMAIS PERDRE DE VUE

**Vision :** Jarvis = agent personnel quotidien, pas un todo de plus. Cap à terme : un assistant qui voit l'agenda de Thomas, comprend ses objectifs, et le pousse à les tenir.

**Phases (détail en §3) :**
- **Phase 1** — MVP local complet, mode avion fonctionnel, zéro réseau. ✅ Done + extensions UX.
- **Phase 2** — Sync local-first via PowerSync + Supabase, auth magic link. Pas commencé.
- **Phase 3** — Agent IA : Claude API + Vercel AI SDK + MCP Google Calendar. Pas avant phase 2 stable.

**Invariants — ne JAMAIS transiger :**

1. **Local-first toujours.** Phase 2 ajoute la sync, elle ne supprime pas le mode hors-ligne. L'app doit marcher en mode avion à toutes les phases.
2. **YAGNI strict par phase.** Pas de code qui ne sert qu'à la phase suivante. Pas d'abstraction « pour plus tard ». Trois lignes répétées valent mieux qu'une abstraction prématurée.
3. **Architecture clean (cf. §11) — verrou dur.** Le data layer `src/data/` est l'unique seam pour le cache + l'invalidation. **JAMAIS** :
   - Réintroduire un cache `let cachedX = …` au niveau module dans un screen.
   - Lire `src/db/*` directement depuis un screen pour des données dérivées (utiliser `view.useView()`).
   - Écrire dans la DB sans passer par `src/data/mutations.ts`.
   - Ajouter des callbacks `onXChanged` entre screens (l'invalidation est globale via `data/`).
   - Laisser un fichier dépasser ~700 lignes sans réfléchir au split.
   - Mêler dans un fichier le pager + la list + les modals + les animations. Un fichier = une responsabilité.
4. **`src/data/` est le point d'attache pour la sync (phase 2).** Toute logique de cache qui contourne ce seam casse cette propriété et fera mal à brancher PowerSync plus tard.
5. **Si un changement structurel est tentant** (« je vais juste ajouter un useState pour cacher ça vite fait »), s'arrêter : c'est exactement ce qu'on a passé une session à démanteler. Ouvrir `src/data/views.ts` à la place.
6. **Règles métier `Objective`** : la création d'un objectif exige *titre + description + deadline* (passe par `ObjectiveCreateModal` — bouton désactivé tant que les 3 sont vides). Pas de raccourci « j'ajoute juste un titre vite fait ». La DB accepte techniquement `description NULL` / `deadline NULL` (pour les objectifs créés avant la règle), mais aucun nouveau code ne doit créer un objectif incomplet.

---

## 1. Projet

**Nom technique :** `jarvis-app` (slug EAS : `@throbert/jarvis-app`)
**Nom produit :** à définir.

**Objectif :** application mobile cross-platform de suivi d'objectifs, organisation et planification.
- Phase 1 : calendrier + tâches du jour (création, check, consultation historique). **✅ DONE + extensions UX**.
- Phase 2 : sync cloud local-first.
- Phase 3 : agent IA connecté à l'agenda via MCP.

**Utilisateur unique pour l'instant :** moi (Thomas). Pas d'auth multi-user. Distribution par APK direct (pas de store).

**État réel du repo (à vérifier avec `git status` / `ls` avant toute action) :**
- App complète phase 1 sur branche `feat/phase1-mvp` (ou `main` après merge).
- Entrypoint `expo-router/entry` (pas `App.js`). `App.js` est obsolète, peut être supprimé.
- `app.json` + `eas.json` configurés, plugins `expo-dev-client` + `expo-router` + `expo-sqlite`.
- `assets/` avec `icon.png`, `adaptive-icon.png`, `splash-icon.png`.
- Dev build EAS Android fonctionnel, installé sur le tel.

---

## 2. Stack — état actuel

| Couche            | Techno                             | Notes                                         |
|-------------------|------------------------------------|-----------------------------------------------|
| App               | React Native + Expo SDK 54         | New Architecture, dev-client                  |
| Entrypoint        | `expo-router/entry`                | file-based routing dans `app/`                |
| Langage           | TypeScript ~5.9 strict             | `@/*` → `src/*` via module-resolver           |
| Navigation        | Expo Router v6                     | Stack header, `gestureEnabled`, transparent modal |
| Local DB          | `expo-sqlite` ~16                  | Migrations versionnées (table `_migrations`)  |
| Animations        | `react-native-reanimated` 4        | Shared values, `LinearTransition`, worklets   |
| Gestures          | `react-native-gesture-handler` v2  | `Gesture.Pan`, `GestureDetector`, `Swipeable` |
| Safe area         | `react-native-safe-area-context`   | `SafeAreaProvider` au root, edges par écran   |
| Icônes            | `@expo/vector-icons` (Feather)     | Utilise `expo-font`                           |
| Dates             | `date-fns` + locale `fr`           | `toDayKey` centralisé dans `src/lib/date.ts`  |
| Build             | EAS Build, profil `development`    | APK Android                                   |
| Dev loop          | `npx expo start --dev-client --tunnel` | Tunnel sur réseau 42, LAN possible ailleurs |

**Deps installées spécifiquement (dépendances directes) :**
- `expo` ~54.0, `expo-dev-client` ~6.0, `expo-status-bar` ~3.0
- `expo-router` ~6.0, `expo-linking` ~8.0, `expo-constants` ~18.0
- `expo-sqlite` ~16.0
- `react-native-safe-area-context` ~5.6, `react-native-screens` ~4.16
- `react-native-gesture-handler` ~2.28, `react-native-reanimated` ~4.1, `react-native-worklets` 0.5.1
- `@expo/vector-icons` ~15
- `date-fns`
- devDeps : `typescript` ~5.9, `@types/react` ~19.1, `babel-preset-expo`, `babel-plugin-module-resolver`

**`.npmrc` obligatoire** : contient `legacy-peer-deps=true`. Sinon `npm ci` échoue sur un conflit `radix-ui` ↔ `react` via `expo-router`.

### À venir (à ne pas anticiper)

| Couche            | Techno                             | Phase |
|-------------------|------------------------------------|-------|
| Sync cloud        | PowerSync + Supabase (Postgres)    | 2     |
| Auth              | Supabase magic link                | 2     |
| IA                | Claude API (Sonnet récent)         | 3     |
| IA SDK            | Vercel AI SDK (`ai` package)       | 3     |
| Intégrations      | MCP server → Google Calendar       | 3     |

**iOS :** pas supporté pour l'instant (pas de Mac, pas de compte Apple dev). Code cross-platform OK mais on build/teste **Android uniquement**. Pour toute question EAS "iOS / Apple ID ?", répondre **non** et utiliser `--platform android` explicite.

---

## 3. Phases — discipline stricte

La règle la plus importante de ce fichier. Claude Code ne doit **pas** anticiper les phases suivantes.

### Phase 1 — MVP local ✅ Complète (+ extensions UX)

- Migration JS → TypeScript strict ✅
- Expo Router (`app/`) ✅
- Calendrier vue mois + vue semaine (toggle via menu hamburger) ✅
- Navigation mois/semaine par flèches + swipe horizontal (FlatList paginate) ✅
- Bouton "today" (pastille numéro du jour) retour au mois courant ✅
- CRUD tâches attachées à un jour ✅
- Checkbox done avec `done_at` persisté ✅
- Animations fluides entre sections À faire / Faits (reanimated `LinearTransition`) ✅
- SQLite local via `expo-sqlite` + migrations versionnées ✅

**Extensions UX (phase 1.5) livrées aussi :**
- Couleurs et description par tâche (auto-save on blur)
- Soft delete + corbeille par jour (écran dédié `/trash/[date]`)
- Recherche globale (`/search`) + recherche du jour (header icône)
- Multi-select par long-press + bulk delete / bulk restore
- Swipe gauche sur tâche → action (delete rouge / restore ambre)
- Drag handle sur la barre d'ajout, 3 paliers : BASE / MID / fullscreen
- Swipe 4 directions sur écran d'édition pour fermer (avec animation directionnelle + révélation de l'écran jour en dessous via `presentation: 'transparentModal'`)

**Tout doit fonctionner en mode avion.** Zéro dépendance réseau.

### Phase 2 — Sync cloud (pas démarré)
- PowerSync + Supabase Postgres.
- Auth minimale.
- Résolution de conflits : last-write-wins au début.

### Phase 3 — Agent IA (pas avant phase 2 stable)
- Claude API + Vercel AI SDK.
- MCP server Google Calendar (lecture créneaux, écriture événements).
- Fonctions agent : détection blocages, décomposition d'objectifs, check-ins, planification adaptative.

**Règle absolue :** si le ticket est phase 1, pas de code qui ne sert qu'à la phase 2 ou 3. Pas d'abstraction "pour plus tard". YAGNI.

---

## 4. Modèle de données

SQLite local. Table unique `tasks`. Schéma actuel (après migrations #1, #2, #3) :

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,          -- uuid v4
  day          TEXT NOT NULL,             -- 'YYYY-MM-DD' en timezone locale
  title        TEXT NOT NULL,
  description  TEXT,
  color        TEXT,                       -- hex #RRGGBB ou NULL
  done         INTEGER NOT NULL DEFAULT 0,
  done_at      TEXT,                       -- ISO timestamp
  deleted_at   TEXT,                       -- ISO timestamp, NULL si non supprimé
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day);

CREATE TABLE IF NOT EXISTS _migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

**Migrations actuelles** (dans `src/db/migrations.ts`) :
1. `CREATE TABLE tasks` + index
2. `ADD COLUMN color` (vérifie via `PRAGMA table_info` pour idempotence)
3. `ADD COLUMN deleted_at` (idem)

**Règles :**
- `day` en **timezone locale du téléphone**, format `YYYY-MM-DD`. Jamais UTC.
- `toDayKey(d: Date)` dans `src/lib/date.ts`. Ne jamais recalculer la clé à la main ailleurs.
- Pas de table `days`. Un jour existe implicitement s'il a des tâches.
- Toutes les lectures filtrent `deleted_at IS NULL` (sauf fonctions explicites pour la corbeille).
- Pas de tags, pas de projets, pas de récurrence, pas de schedule horaire en phase 1.

---

## 5. Structure du repo

```
jarvis-app/
├── CLAUDE.md
├── Readme
├── app.config.js / app.json / eas.json / babel.config.js / tsconfig.json
├── package.json
├── .npmrc                                      ← legacy-peer-deps=true (obligatoire)
├── expo-env.d.ts                               ← /// <reference types="expo-router/types" />
│
├── app/                                        ← Expo Router (file-based routing)
│   ├── _layout.tsx                             ← GestureHandlerRootView + SafeAreaProvider + LayoutAnimation enable Android
│   ├── index.tsx                               ← Hub : month / day / routines toujours montés, crossfade 80 ms
│   ├── search.tsx                              ← Recherche globale (debounced, tabs actives/supprimées)
│   ├── calendar/
│   │   ├── index.tsx                           ← CalendarScreen : mois/semaine, today btn, multi-select
│   │   └── [date].tsx                          ← DayScreen : PagerView ±30j + far-jump overlay
│   ├── routines/
│   │   ├── index.tsx                           ← RoutinesScreen : pager horizontal de groupes, stats par routine
│   │   └── [id].tsx                            ← RoutineEditScreen : titre, icône, groupe, archive
│   ├── objectives/
│   │   ├── index.tsx                           ← ObjectivesScreen : overview READ-ONLY (year view + 3 summary cards tappables)
│   │   ├── long.tsx / medium.tsx / short.tsx   ← Routes statiques per-horizon (wrappers <HorizonScreen />)
│   │   └── [id].tsx                            ← ObjectiveEditScreen : titre, horizon, deadline picker, description, delete
│   ├── task/
│   │   └── [id].tsx                            ← TaskEditScreen : title, couleur, icône, description, 4-way swipe back
│   ├── trash/
│   │   └── [date].tsx                          ← TrashScreen : corbeille du jour, multi-select + bulk restore
│   └── settings/
│       ├── index.tsx                           ← Réglages généraux
│       └── mantras.tsx                         ← Édition mantras quotidiens
│
├── src/
│   ├── data/                                   ← ★ Couche store + invalidation (cf. §11)
│   │   ├── subscribable.ts                     ← createKeyedView<K,V> : cache + load + subscribe + invalidate
│   │   ├── views.ts                            ← Views concrets (tasksByDay, completionsByDay, …) + EMPTY_* + invalidateXxx helpers
│   │   └── mutations.ts                        ← Wrappers DB-write : optimistic setLocal + invalidation scoped
│   │
│   ├── db/                                     ← SQL repo. Ne pas appeler directement depuis les screens.
│   │   ├── index.ts                            ← getDatabase mémoïsé + runMigrations au 1er accès
│   │   ├── schema.ts                           ← DDL + ALTER statements
│   │   ├── migrations.ts                       ← Array versionnée + idempotente (PRAGMA check)
│   │   ├── tasks.ts                            ← CRUD tasks + searchTasks + getTaskCountsInRange + soft delete
│   │   ├── routines.ts                         ← CRUD groups/routines/completions + stats + counts in range
│   │   ├── objectives.ts                       ← CRUD objectifs (long/med/short) + soft delete
│   │   └── settings.ts                         ← key-value SQLite (active group, mantras enabled, …)
│   │
│   ├── components/
│   │   ├── day/                                ← Écran jour
│   │   │   ├── DayContent.tsx                  ← Memo'd contenu d'un jour (list + handlers + mantra)
│   │   │   ├── DayHeader.tsx                   ← Top bar (action row OU select mode)
│   │   │   ├── DayBottomBar.tsx                ← Chevrons + DragHandle calendrier
│   │   │   ├── DayProgressCard.tsx             ← « Progrès du jour » + all-done-pop animation
│   │   │   ├── DayRoutinesSection.tsx          ← Pager de groupes + collapse animation
│   │   │   └── FarJumpOverlay.tsx              ← Slide-in panel pendant un re-anchor lointain
│   │   ├── routines/                           ← Écran routines
│   │   │   ├── RoutineStatsCard.tsx            ← Card per-routine (souscrit à ses propres stats + completions)
│   │   │   ├── RoutineGroupChip.tsx            ← Chip avec couleur interpolée pendant le swipe
│   │   │   ├── RoutineRow.tsx                  ← Row tickable avec burst-on-done
│   │   │   ├── RoutinesModalSheet.tsx          ← Bottom sheet create-group / rename-group / create-routine
│   │   │   ├── RoutineMonthHeatmap.tsx         ← Grille mensuelle 7×N
│   │   │   └── RoutineWeekStrip.tsx            ← Bande Mon→Sun
│   │   ├── objectives/                         ← Écran objectifs
│   │   │   ├── ObjectiveRow.tsx                ← Row tickable + deadline smart label (overdue rouge)
│   │   │   ├── ObjectiveHorizonSection.tsx     ← Section colorée + bouton "Ajouter" (ouvre ObjectiveCreateModal)
│   │   │   ├── HorizonScreen.tsx               ← Écran shared per-horizon (full CRUD), monté par long/medium/short.tsx
│   │   │   ├── HorizonSummaryCard.tsx          ← Carte tappable read-only (overview) : counter + prochaine deadline + teaser
│   │   │   ├── ObjectivesYearView.tsx          ← 12 mini-mois 3×4, today = point blanc, deadlines = cellules teintées
│   │   │   ├── ObjectivesTimelineArrow.tsx     ← Flèche chronologique horizontale, ticks 5 ans, dots rouges (long uniquement)
│   │   │   ├── ObjectivesYearPickerModal.tsx   ← Modal scrollable pour piocher n'importe quelle année (range ±50 ans)
│   │   │   ├── ObjectiveCreateModal.tsx        ← Formulaire create — titre+description+deadline OBLIGATOIRES
│   │   │   └── DeadlinePickerModal.tsx         ← Modal calendrier mensuel + nav < mois >, selection + clear
│   │   ├── calendar/                           ← Vue calendrier
│   │   │   ├── CalendarMonth.tsx               ← Grille 6×7
│   │   │   ├── CalendarWeek.tsx                ← Liste verticale 7 jours
│   │   │   ├── CalendarDayCell.tsx             ← Cellule + pill counter
│   │   │   ├── TodayButton.tsx                 ← Mini page calendrier
│   │   │   └── ViewMenu.tsx                    ← Modal Mois/Semaine
│   │   └── shared/                             ← Réutilisés
│   │       ├── TaskItem.tsx                    ← Row checkbox + swipe actions
│   │       ├── AddTaskInput.tsx                ← Bar mini → 3 paliers via drag
│   │       ├── DragHandle.tsx                  ← Encoche cliquable + swipe
│   │       ├── IconPicker.tsx                  ← Picker d'icône Feather
│   │       └── AutoSizeMantra.tsx              ← Texte auto-fit
│   │
│   ├── hooks/
│   │   └── useActiveGroupId.ts                 ← Active group state machine (load setting + fallback + persist)
│   │
│   └── lib/
│       ├── date.ts                             ← toDayKey, todayKey, parseDayKey, enumerateDays
│       ├── uuid.ts                             ← UUID v4 Math.random
│       ├── theme.ts + themeContext.tsx         ← Palette centralisée (inspirée Notion)
│       ├── colors.ts                           ← TASK_COLORS[] + softColorBg
│       ├── icons.ts                            ← FeatherName type + curated list
│       └── mantras.ts                          ← Mantras quotidiens (lecture, pick déterministe par jour)
│
├── assets/                                     ← icon.png, adaptive-icon.png, splash-icon.png
└── docs/                                       ← Journal projet (historic.md, POLISH.md, ETAPES_FAITES/)
```

**Interdit tant qu'on n'y est pas :** `src/ai/`, `src/sync/`, `src/mcp/`, `src/powersync/`.

---

## 6. Conventions de code

**TypeScript :**
- `"strict": true`. Pas de `any` sans commentaire `// any: <raison>`.
- `camelCase` variables/fonctions, `PascalCase` composants/types.
- Alias imports : `@/` → `src/`. Configuré dans `tsconfig.json` + `babel.config.js` (plugin `babel-plugin-module-resolver`).
- Pas de `baseUrl` (déprécié en TS 6, on est en TS 5.9 par compat SDK 54 — ne pas upgrader TS sans raison).

**React / React Native :**
- Composants fonctionnels. Pas de classes. Pas de `React.FC`.
- Un composant par fichier, nom du fichier = nom du composant.
- Props typées explicitement.
- `StyleSheet.create` de RN. Pas de NativeWind/Tailwind.
- Palette via `src/lib/theme.ts`. Couleurs de tâches via `src/lib/colors.ts`.

**Icônes :**
- `@expo/vector-icons` → `Feather`. Éviter les emoji Unicode dans l'UI (ils se croppent selon les fonts).

**Dates :**
- `date-fns` + `locale/fr`. Pas `moment`, pas `dayjs`.
- Clé jour via `toDayKey` uniquement.

**DB :**
- Tout SQL passe par un repo dans `src/db/`. Jamais de SQL inline dans un composant.
- Migrations versionnées **et idempotentes** (vérif `PRAGMA table_info` avant `ALTER`). Appliquées au boot par `runMigrations`.
- Toutes les lectures de tâches "actives" filtrent `deleted_at IS NULL`. Exceptions explicites pour la corbeille.
- Nouveau changement de schéma = **nouvelle migration**. Jamais `DROP` ni modif de migration existante.

**Data layer (cf. §11) :**
- Les screens **ne lisent jamais directement** `src/db/*` pour des données dérivées (listes, comptages, stats). Ils passent par `src/data/views.ts` (`view.useView(key, EMPTY_DEFAULT)`).
- Toute écriture passe par `src/data/mutations.ts` (jamais d'appel direct à `dbToggleTaskDone`, `dbCreateTask`, etc.). Les mutations font DB write + invalidation scoped.
- Exception lecture : objets uniques par id (e.g. `getTaskById` dans `/task/[id]`, `getRoutineById` dans `/routines/[id]`) — c'est OK d'appeler directement.

**Animations :**
- Reanimated 3 pour tout ce qui bouge (shared values, worklets, `useAnimatedStyle`).
- `Animated.FlatList` + `itemLayoutAnimation={LinearTransition}` pour les listes qui re-sortent / changent de position.
- `LayoutAnimation` est OK pour des petits changements rapides mais **inadapté pour les items FlatList qui changent de section** (préférer reanimated).

**Gestures :**
- `react-native-gesture-handler` v2 Gesture API (`Gesture.Pan()`, `Gesture.Race`, etc.).
- `GestureHandlerRootView` au root (`app/_layout.tsx`) — déjà là.
- Threshold : `minDistance(N)` ou `activeOffsetX/Y`. Pour que les taps inner (TouchableOpacity, TextInput) passent, utiliser un threshold > 0 (5-15px selon le cas).

**Commits :**
- Conventional commits : `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Un commit = un changement logique.
- Inclure `Co-Authored-By: Claude ...` sur les commits assistés.

---

## 7. Comportement attendu de Claude Code

**Avant d'écrire du code :**
- Lire ce `CLAUDE.md`.
- `git status` + `ls` pour vérifier l'état réel. Ne rien supposer.
- Si ambigu ou choix structurel non couvert ici → **poser la question**. Pas d'invention.

**Pendant le code :**
- Respect strict des phases.
- Pas de dépendance non listée §2 sans justifier (1 phrase : pourquoi la stdlib / l'existant ne suffit pas).
- Simplicité directe. Pas de patterns (Singleton, Factory, Observer) sans cas d'usage réel.
- Changement de schéma DB → **nouvelle migration idempotente**, jamais modifier une migration existante, jamais `DROP`.

**Avant de finir :**
- `npx tsc --noEmit` propre.
- Résumé en puces de ce qui a été touché. Pas de paragraphes creux.
- Si UI/UX touchée : rappeler que je dois **reload avec `-c` sur le tel** pour voir le nouveau bundle.

**Commits réguliers (je push moi-même) :**
- Faire un commit dès qu'un changement logique est complet et `tsc --noEmit` est propre — n'attendre la fin d'une longue session.
- Un commit = un changement logique cohérent. Branche `feat/xxx`, `fix/xxx`, `chore/xxx`, `refactor/xxx`, `perf/xxx`, `docs/xxx` selon le cas. Jamais direct sur `main`.
- Conventional commits en sujet (`feat(scope): …`, `fix(scope): …`, etc.). Corps optionnel pour le *pourquoi* si non-évident.
- **Toujours** terminer par `Co-Authored-By: Claude …`.
- **Ne jamais `git push`** — Thomas pousse lui-même en son nom.
- Avant le commit : `git status` pour vérifier qu'aucun fichier non voulu n'est inclus (pas de `.env`, pas de `node_modules`, etc.). Stager fichier par fichier, jamais `git add -A` ni `git add .` aveuglément.
- Si plusieurs changements logiques se sont empilés sans commit : proposer un découpage en plusieurs commits avant de committer.

**À ne PAS faire seul :**
- `git push`
- Commits directs sur `main` (brancher en `feat/xxx`, `fix/xxx`, `chore/xxx`)
- Ajouter une lib native (>500 kB ou nécessitant un prebuild) sans demander
- Modifier `app.json`, `eas.json`, `babel.config.js` sans demander (exception : `npx expo install` en ajoute automatiquement, acceptable)
- Toucher aux secrets / `.env`
- **Rebuild EAS sans demander** (coûte ~10 min, seulement si ajout lib native)
- Supprimer des données en DB côté utilisateur (soft delete uniquement, sauf `permanentlyDeleteTask` explicite)

---

## 8. Commandes utiles

```bash
# Dev quotidien — hot reload sur le tel via dev build
npx expo start --dev-client --tunnel
# --tunnel : obligatoire réseau 42 / réseaux restreints.
# --dev-client : obligatoire (dev build, pas Expo Go).
# Ajouter -c pour vider le cache Metro quand changements bundler/babel/tsconfig
#   ou UI qui ne se met pas à jour.

# Si ngrok est down : LAN (PC et tel sur même WiFi)
npx expo start --dev-client

# Type check
npx tsc --noEmit

# Fix des versions de deps Expo (aligne avec SDK)
npx expo install --fix

# Diagnostic projet
npx expo-doctor

# Rebuild du dev build APK (SEULEMENT si ajout d'une lib native)
eas build --profile development --platform android
# ⚠️ Attention au typo '--platform android.' avec un point → cassé

# Liste des builds / URL APK
eas build:list --platform android --limit 5

# Connexion EAS (déjà fait, compte = throbert via Google SSO)
eas login --sso
```

**Installation APK sur téléphone Android :**
1. Désinstaller l'ancienne "Jarvis App" (les versionCode sont tous 1, Android ne détecte pas la mise à jour).
2. Ouvrir le lien EAS du build depuis le browser du tel (ou scanner le QR).
3. Télécharger l'APK, autoriser "sources inconnues" une fois.
4. Installer, ouvrir → app demande le dev server → scanner le QR de `npx expo start --dev-client --tunnel`.

---

## 9. Pièges connus (déjà rencontrés, ne PAS refaire)

Documentation explicite des merdes traversées pour que Claude Code ne les redéclenche pas.

### Setup / build

1. **Expo Go ne fonctionne pas avec SDK 54+.** Expo Go plafonne au SDK 52. → **Dev build EAS obligatoire**. Ne jamais proposer `npx expo start` sans `--dev-client`, ni suggérer Expo Go.

2. **EAS Build upload le contenu git-tracké, pas le dossier local.** Un fichier non commité = absent du build. Avant tout `eas build`, `git status` pour vérifier.

3. **`node_modules` peut être commité par accident** (c'était le cas au début). Vérifier `git ls-files node_modules | head`. Si tracké : `git rm -r --cached node_modules`.

4. **`.npmrc` avec `legacy-peer-deps=true` OBLIGATOIRE** pour le build EAS. `expo-router` tire `@radix-ui/react-*` + `vaul` qui exigent `react@^19.2.5` alors que SDK 54 pin `react@19.1.0`. Sans le flag, `npm ci` échoue.

5. **`react-native-reanimated` v4 exige le peer `react-native-worklets`** + le plugin babel `react-native-worklets/plugin` en **dernière position** dans `babel.config.js`.

6. **TypeScript 6 déprécie `baseUrl`** et a des conflits avec `@expo/require-utils`. Rester en `typescript: ~5.9` pour SDK 54.

7. **Réseau 42 / restreint :** LAN échoue. Utiliser `--tunnel`. Si ngrok est down : attendre ou tenter LAN selon le réseau.

8. **Émulateur Android absent :** répondre "non" aux questions EAS de type "Install and run on an emulator?". Tester sur le tel physique.

9. **Pas de Mac :** ne rien proposer qui nécessite iOS/Xcode. Pour `eas build`, toujours `--platform android`.

10. **Node via nvm :** `~/.zshrc` doit charger nvm. Si `npm: command not found`, c'est ça.

11. **`eas build --platform android.` (avec un point)** = erreur `Expected --platform=android.` — le point à la fin casse le flag.

### UI / layout / gestures (les plus fréquents)

12. **Android TextInput capture les touches** pour le curseur et le menu copier/coller système. Impossible de pan/drag dessus de façon fiable. Solutions :
    - Zones de swipe absolute positioned sur les bords (`zIndex` élevé) qui interceptent avant le TextInput
    - `Gesture.Simultaneous(pan, Gesture.Native())` laisse les deux actifs
    - Sur les TextInput multiline, toujours `disableFullscreenUI` pour éviter le popup natif Android en landscape

13. **`KeyboardAvoidingView behavior="padding"` + `softwareKeyboardLayoutMode: "resize"` (défaut Android) = double-shift.** L'OS shrink la fenêtre ET le KAV ajoute padding → layout chaotique. Toujours platform-specific :
    ```tsx
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    ```

14. **Couleurs semi-transparentes (hex+alpha) cassent `Swipeable`** : le row `backgroundColor: '#e03e3e38'` laisse voir l'action derrière pendant le swipe → effet "pop". Utiliser un **blend opaque avec le blanc** (cf. `softColorBg` dans `src/lib/colors.ts`).

15. **`ScrollView` à l'intérieur d'un `GestureDetector` bloque les pan verticaux** (il capte les touches pour son scroll). Soit retirer le ScrollView, soit composer `Gesture.Simultaneous(pan, Gesture.Native())`.

16. **`FlatList` sans `style={{flex:1}}` explicite** prend la hauteur de son contenu → mauvais comportement dans un flex container avec frères fixes. Toujours ajouter `style={{flex:1}}` dans ce cas.

17. **`LayoutAnimation` marche mal sur Android** pour les items qui changent de section dans une FlatList — effet pop au lieu de glide. Préférer :
    ```tsx
    import Animated, { LinearTransition } from 'react-native-reanimated';
    <Animated.FlatList itemLayoutAnimation={LinearTransition.duration(300)} ... />
    ```

18. **TextInput multiline + `flex: 1` sans `overflow: 'hidden'` sur parent** → le TextInput essaie de grandir avec le contenu et peut pousser les éléments frères hors écran. Ajouter `overflow: 'hidden'` sur le container flex.

19. **Footer "collé en bas" dans un flex layout dynamique** : utiliser `position: 'absolute'` + `paddingBottom` sur le container pour réserver la place, sinon le footer bouge quand les enfants changent.

20. **`useHeaderHeight` (`@react-navigation/elements`)** doit être utilisé pour `keyboardVerticalOffset` sur iOS quand un Stack header est visible. Sans, le KAV calcule mal l'intersection.

21. **`LayoutAnimation` sur Android nécessite** `UIManager.setLayoutAnimationEnabledExperimental(true)` au boot (fait dans `app/_layout.tsx`).

22. **Stack `gestureEnabled: true` + `fullScreenGestureEnabled: true` est iOS-only** en natif. Pour un swipe-back Android, implémenter avec `Gesture.Pan()` + `runOnJS(router.back)()`.

23. **`presentation: 'transparentModal'`** sur un Stack.Screen garde l'écran précédent rendu dessous → utile pour un effet "swipe reveal". Le fond de l'écran doit être opaque (sinon on voit tout en permanence).

24. **Titre multiline + `returnKeyType="done"`** sur Android : incompatible (la key devient newline). Pour un titre multiline, ne pas tenter de capturer un "submit key" — utiliser un bouton UI explicite (`+`) ou auto-save on blur.

25. **`app/task/new.tsx` vs `app/task/[id].tsx`** : en expo-router, les routes statiques gagnent sur les dynamiques. Tu peux faire `/task/new` sans conflit, mais on a préféré garder tout dans `[id].tsx` avec auto-save on blur.

26. **`origin/main` git** : remote peut avoir disparu (cas vu). État non critique, à nettoyer plus tard (`git branch --unset-upstream`).

---

## 10. Notes pour toi, Claude Code

- Mon background : C, C++, NASM, kernel (KFS 42), systèmes bas niveau. Le JS/TS est nouveau mais la logique de programmation ne l'est pas. Pas besoin de m'expliquer ce qu'est une fonction ou une closure. Explique ce qui est spécifique à React Native / Expo / l'écosystème JS.
- Réponses directes, concises, rigoureuses. Pas de "great question", pas de remplissage, pas de flatterie.
- Si une de mes propositions est bancale, dis-le franchement et propose mieux.
- Je préfère comprendre **pourquoi** une lib / un pattern avant de l'adopter. Propose, ne décide pas seul sur les choix structurants.
- Français par défaut. Anglais acceptable pour les termes techniques (pas besoin de traduire "hook", "bundler", etc.).

### Spécifiquement pour l'UX / les gestures

- **Tu ne peux pas tester l'app.** Pour les itérations UX rapides (placements, animations, gestures), prévois dès le début plusieurs allers-retours. Ne pas surpromettre "c'est fixed" sans certitude.
- **Toujours me rappeler de reload avec `-c`** après un changement bundler (babel, metro config) ou layout profond. Le cache Metro masque souvent les changements.
- **Pour les bugs Android de gesture + TextInput** : la réponse correcte est rarement "change ce paramètre", c'est plutôt "ajoute une zone dédiée (absolute + zIndex) qui bypass le TextInput". Pense à ça avant d'empiler des workarounds.
- **Pour les bugs de layout Android (footer qui bouge, KAV chaotique)** : presque toujours `behavior` platform-specific + `position: 'absolute'` pour les éléments ancrés. Pense-y avant d'empiler des `flex` magiques.

### Rappels sur l'organisation

- Un commit = un changement logique. Pas de commits "WIP fix" successifs, refactorer/squash si possible.
- Branch `feat/xxx`, `fix/xxx`, `chore/xxx`. Pas direct sur main.
- Si rebuild EAS nécessaire (ajout lib native), **le signaler explicitement** avant de commiter. Je déclencherai le build moi-même.
- Si une action est destructive (suppression DB, `git rm`, force push), **demander confirmation** d'abord.

---

## 11. Couche data (`src/data/`)

Architecture mise en place pour éviter que chaque screen invente son propre cache + protocole d'invalidation. À comprendre **avant** de toucher un screen qui lit ou écrit des données.

### Composants

**`subscribable.ts`** — primitive générique `createKeyedView<TKey, TValue>(loader, keyToString?)`. Retourne :
- `useView(key, defaultValue)` — hook React (basé sur `useSyncExternalStore`). S'abonne à la clé, déclenche un load au premier render si pas en cache, re-render à chaque notify.
- `load(key)` — fetch + cache + notify. Dédupliqué via une map `inflight`.
- `get(key)` / `setLocal(key, value)` / `clear(key)` — accès synchrone (utilisé par les mutations pour les optimistic updates).
- `invalidate(filter?)` — re-fetch les clés souscrites qui matchent le filtre, évince les clés non souscrites.

**`views.ts`** — déclare 8 views concrets :

| View | Clé | Valeur |
|---|---|---|
| `tasksByDayView` | `dayKey: string` | `Task[]` |
| `deletedTasksByDayView` | `dayKey: string` | `Task[]` |
| `taskCountsInRangeView` | `{ start, end }` | `Record<dayKey, DayCounts>` |
| `routineStructureView` | `'_'` (singleton) | `{ groups, routinesByGroup }` |
| `completionsByDayView` | `dayKey: string` | `Set<routineId>` |
| `routineStatsView` | `{ routineId, today }` | `RoutineStats` |
| `routineCompletionsInRangeView` | `{ routineId, start, end }` | `Set<dayKey>` |
| `routineCountsInRangeView` | `{ start, end }` | `Record<dayKey, RoutineDayCounts>` |
| `objectivesView` | `'_'` (singleton) | `{ short, medium, long: Objective[] }` |

+ constantes `EMPTY_TASKS`, `EMPTY_COUNTS`, `EMPTY_COMPLETIONS`, `EMPTY_STATS`, `EMPTY_STRUCTURE`, `EMPTY_OBJECTIVES` — **toujours utiliser ces constantes** comme `defaultValue` pour `useView`, jamais des littéraux inline (sinon render loop avec `useSyncExternalStore`).

+ helpers d'invalidation coarse-grained :
- `invalidateTasksOnDay(day)` — pour create/update/toggle/softDelete/restore d'une task
- `invalidateAllTasks()` — pour les bulk operations multi-jours
- `invalidateRoutineStructure()` — pour group/routine create/rename/archive/delete
- `invalidateRoutineCompletionsOnDay(day)` — pour toggle completion (re-invalide stats + ranges aussi)
- `invalidateObjectives()` — pour create/update/toggle/softDelete d'un objectif (scope singleton)

**`mutations.ts`** — wrappers de toutes les DB writes. Chaque wrapper fait :
1. (Optionnel) Optimistic `setLocal` via la view concernée — pour les actions qui doivent feel instant (toggle task, toggle completion, soft delete).
2. `await dbXxx(...)` — l'écriture SQL réelle.
3. `invalidateXxx(...)` — re-fetch des views souscrites.

Exports : `createTask`, `toggleTaskDone`, `updateTask`, `softDeleteTask`, `restoreTask`, `permanentlyDeleteTask`, `softDeleteTasksBulk`, `restoreTasksBulk`, `createGroup`, `updateGroup`, `deleteGroup`, `createRoutine`, `updateRoutine`, `archiveRoutine`, `setCompletion`, `createObjective`, `toggleObjectiveDone`, `updateObjective`, `softDeleteObjective`.

### Règles à respecter

1. **Lire = `view.useView(key, EMPTY_DEFAULT)`** dans le component. Jamais `useState + useFocusEffect + reload` pour des données dérivées.
2. **Écrire = appeler un wrapper de `@/data/mutations`**. Jamais `dbCreateTask` direct depuis un screen.
3. **`EMPTY_X` doit être une référence stable** (constante module-level dans `views.ts`). Ne JAMAIS muter (`.push`, `.add`, etc.) — c'est typé mutable mais conceptuellement readonly.
4. **Ajouter un nouveau view** : `createKeyedView(loader, keyToString)`. Si singleton, key = `'_'` avec `keyToString = () => '_'`.
5. **Ajouter une nouvelle mutation** : wrapper dans `mutations.ts` qui fait DB write + `invalidateXxx(scope)`. Si l'action a un feel-instant requirement, ajouter `setLocal(optimistic)` avant l'await.
6. **N'invente pas un cache module-level** dans un screen (`let cachedX = …`). La couche `data/` est l'unique seam.
7. **Pas de callbacks `onTasksChanged` / `onRoutinesChanged`** entre screens. L'invalidation est globale via la couche `data/` ; les screens se mettent à jour automatiquement via leur subscription.

### Quand re-déduire au lieu de mémoiser

Pour des données par-item (e.g. stats par routine), un seul screen ne peut pas appeler `useView` dans une boucle (rules of hooks). **Extraire un sous-composant** qui souscrit à ses propres views (cf. `RoutineStatsCard.tsx`).
