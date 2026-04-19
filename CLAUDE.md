# CLAUDE.md

Fichier lu automatiquement par Claude Code à chaque session. Contexte du projet, stack, conventions, règles de comportement.

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
├── README.md (Readme en réalité)
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── .npmrc                             ← legacy-peer-deps=true (obligatoire)
├── expo-env.d.ts                      ← /// <reference types="expo-router/types" />
├── app/                               ← Expo Router
│   ├── _layout.tsx                    ← GestureHandlerRootView + SafeAreaProvider + LayoutAnimation enable Android
│   ├── index.tsx                      ← Redirect → /calendar
│   ├── search.tsx                     ← Recherche globale (actives / supprimées, debounced)
│   ├── calendar/
│   │   ├── index.tsx                  ← Mois / semaine (menu hamburger), today btn, recherche du jour, multi-select
│   │   └── [date].tsx                 ← Écran jour : sections À faire / Faits, add task inline, swipe delete, long-press multi
│   ├── task/
│   │   └── [id].tsx                   ← Édition (title, couleur, description), FAB-style ✕ dans header, 4-way swipe-back animé, transparent modal
│   └── trash/
│       └── [date].tsx                 ← Corbeille du jour (swipe ambre = restore, multi-select + bulk restore)
├── src/
│   ├── db/
│   │   ├── index.ts                   ← getDatabase mémoïsé + runMigrations au 1er accès
│   │   ├── schema.ts                  ← DDL + ALTER statements
│   │   ├── migrations.ts              ← Array versionnée + idempotente (PRAGMA check)
│   │   └── tasks.ts                   ← CRUD + searchTasks + getTaskCountsInRange + soft delete
│   ├── components/
│   │   ├── CalendarMonth.tsx          ← Grille 6×7, highlight semaine courante
│   │   ├── CalendarWeek.tsx           ← Liste verticale 7 jours (swipe semaine)
│   │   ├── CalendarDayCell.tsx        ← Cellule jour + pill counter X/Y
│   │   ├── TodayButton.tsx            ← Mini page calendrier cliquable
│   │   ├── ViewMenu.tsx               ← Modal Mois/Semaine
│   │   ├── TaskItem.tsx               ← Row avec checkbox/tick, swipe actions, select mode
│   │   └── AddTaskInput.tsx           ← Bar mini (52px) → expanded (drag 3-snap) avec couleur + description
│   ├── hooks/                         ← vide pour l'instant
│   ├── lib/
│   │   ├── date.ts                    ← toDayKey
│   │   ├── uuid.ts                    ← UUID v4 Math.random (phase 1 suffit)
│   │   ├── theme.ts                   ← palette centralisée (inspirée Notion)
│   │   └── colors.ts                  ← TASK_COLORS[] + softColorBg (opaque via blend blanc)
│   └── types/                         ← vide (types inline dans tasks.ts)
└── assets/
    ├── icon.png
    ├── adaptive-icon.png
    └── splash-icon.png
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
