# historic.md

Journal des grosses décisions et changements de techno/feature sur l'app
(Phase 1 → futur). Ordre chronologique. Pas la liste des bugs fix — uniquement
les choses qui changent la forme de l'app ou la stack.

À chaque entrée :
- **Quoi** : le changement en une ligne
- **Pourquoi** : ce qui a poussé à le faire (problème rencontré, contrainte,
  ou nouvelle intention produit)
- **Trade-offs** : ce qu'on a perdu / ce qu'on a gagné (s'il y a lieu)

---

## 2026 — Phase 1 (MVP local)

### Stack initiale : React Native + Expo SDK 54 + SQLite local
- **Quoi** : Choix Expo (managed workflow, dev client) + `expo-router` v6 pour la nav + `expo-sqlite` v16 pour le stockage local + TypeScript strict.
- **Pourquoi** : pas de Mac → iOS hors scope, mais cross-platform préservé. Expo Dev Client = un APK Android suffit, plus besoin d'attacher tel/Mac à Xcode/Android Studio. SQLite local = mode avion total en phase 1, pas de back-end à monter.
- **Trade-offs** : pas Expo Go (cap à SDK 52) donc rebuild EAS obligatoire à chaque ajout de lib native. Acceptable.

### `legacy-peer-deps=true` dans `.npmrc`
- **Quoi** : flag global pour npm.
- **Pourquoi** : `expo-router` tire des `@radix-ui/react-*` qui exigent `react@^19.2.5` alors que SDK 54 pin `react@19.1.0`. Sans le flag, `npm ci` échoue côté EAS.
- **Trade-offs** : on accepte des conflits de peer deps. À surveiller à la prochaine majeure d'Expo.

### Migrations DB versionnées + idempotentes
- **Quoi** : table `_migrations`, array de migrations dans `src/db/migrations.ts`, chacune vérifie `PRAGMA table_info` avant `ALTER`.
- **Pourquoi** : utilisateur unique mais l'app évolue. Schéma DB doit pouvoir grandir sans casser l'install existante. Jamais de `DROP`, jamais de modif rétroactive d'une migration.
- **Trade-offs** : un peu plus de cérémonie au début, mais zéro régression de schéma ensuite.

### `softColorBg` opaque (pas d'alpha)
- **Quoi** : helper qui blend la couleur d'une tâche avec la couleur de surface pour produire un pastel **opaque** (pas un `#XXXXXX38` à 22 %).
- **Pourquoi** : `Swipeable` (gesture-handler) laissait voir l'action de fond rouge/orange à travers le pastel transparent dès le moindre frémissement → effet "pop" sur les rows même sans swipe volontaire.
- **Trade-offs** : impossible d'empiler des tints sur fond animé, mais on n'en a pas besoin.

---

## 2026 — Phase 1.5 (extensions UX)

### Soft-delete + corbeille par jour
- **Quoi** : colonne `deleted_at` sur `tasks`, écran `/trash/[date]`, swipe gauche = delete, restore depuis la corbeille (swipe ambre).
- **Pourquoi** : éviter la perte définitive sur tap accidentel. Pattern Google Keep / Notion.
- **Trade-offs** : les requêtes "actives" doivent toujours filtrer `deleted_at IS NULL` — facile à oublier. Convention : tout passe par les helpers de `src/db/tasks.ts`, jamais de SQL inline.

### Multi-select par long-press
- **Quoi** : long-press sur une `TaskItem` ouvre le mode select, tap rouge dans la bottom bar pour bulk delete.
- **Pourquoi** : itérer sur plusieurs tâches sans swiper une par une.
- **Trade-offs** : multi-select state est par-jour (et par-corbeille). On ne sélectionne pas en travers de plusieurs jours.

---

## 2026-05 — Phase 1.6 (routines + theme + tracker)

### Système de thème centralisé (`ThemeProvider`)
- **Quoi** : `src/lib/themeContext.tsx` expose `useTheme()`, persiste le mode (system / clair / sombre) dans la table `settings`.
- **Pourquoi** : avant, chaque écran référençait `theme` statique. Impossible de switch sombre/clair sans relancer. La prefs utilisateur devait survivre aux reboots.
- **Trade-offs** : chaque composant doit `useTheme()` au lieu d'import statique. Effort de propagation ponctuel.

### Soft delete des _routines_ (`archived_at`) au lieu de hard delete
- **Quoi** : archiver une routine la cache, mais conserve l'historique de complétions pour le tracker.
- **Pourquoi** : ne pas casser les streaks/heatmaps quand une routine n'a plus de sens. L'utilisateur peut "ranger" sans perdre les stats.
- **Trade-offs** : queries doivent filtrer `archived_at IS NULL` côté listing. Idem qu'au-dessus, tout passe par `src/db/routines.ts`.

### Couleur des routines = couleur du groupe (pas individuelle)
- **Quoi** : la routine n'a plus de champ `color` dans l'UI ; sa couleur d'accent dérive de son groupe.
- **Pourquoi** : essai initial avec couleur par routine → trop de pollution visuelle, on avait 8 nuances dans une même section. Couleur de groupe = unification visuelle, fait sens sémantique.
- **Trade-offs** : la colonne `color` sur `routines` reste en DB (CLAUDE.md interdit `DROP`) mais ignorée à l'affichage.

### Tracker des routines : viz pure, pas de check ici
- **Quoi** : `/routines` montre stats + heatmap + édition (titre / icône / groupe / archive) mais **pas** de toggle de complétion. Pour cocher un jour manqué, retour sur la page du jour concerné.
- **Pourquoi** : intégrité des stats. Si on pouvait re-cocher rétroactivement depuis le tracker, les streaks deviendraient une fiction. Discipline UX = la donnée reflète la réalité.
- **Trade-offs** : friction supplémentaire pour réparer un oubli (navigation supplémentaire). Compromis assumé.

### Icon picker à base de Feather (pas d'images custom)
- **Quoi** : `IconPicker` propose une grille curated d'icônes Feather catégorisées (Santé, Routine, Travail, Code, etc.). Pas de upload photo.
- **Pourquoi** : éviter `expo-image-picker` (lib native → rebuild EAS) + gestion fichier + miniatures. Feather est déjà dans le bundle. Sémantique > photographique.
- **Trade-offs** : choix limité (~70 icônes). Si on a besoin de plus, on étend la liste ou on rebuild un jour pour ajouter le picker photo.

### Settings : split index + sous-écrans
- **Quoi** : `/settings` devient un index minimal, sous-pages `/settings/mantras` (et plus tard `/settings/routines`, `/settings/sync`).
- **Pourquoi** : un seul écran qui grandit = scroll qui n'en finit pas. Pattern iOS Settings.app.
- **Trade-offs** : un tap de plus pour atteindre les mantras. Acceptable vu la fréquence.

### Animation collapse : LayoutAnimation natif (pas Reanimated height)
- **Quoi** : sections collapsibles (routines, À faire, Faits) utilisent `LayoutAnimation.configureNext` au tap du header, plus de mount conditionnel.
- **Pourquoi** : essai initial avec Reanimated `height: progress * contentHeight` mesuré via `onLayout` → laggy parce qu'à chaque frame le moteur de layout RN doit reflow toute la liste de tâches en dessous. LayoutAnimation est natif, l'OS interpole en un seul pass.
- **Trade-offs** : moins de contrôle fin de la courbe, mais beaucoup plus fluide sur Android.

### Day pager : custom Reanimated → `react-native-pager-view`
- **Quoi** : la page jour `/calendar/[date]` permet de swiper horizontalement entre jours.
- **Itérations** :
  1. **v1 — Gesture.Pan + setParams instantané** : trop sec, pas visuel.
  2. **v2 — `FlatList horizontal pagingEnabled`** : visuel mais bouffait les taps sur `AddTaskInput` et écrasait le pager interne des groupes de routines (FlatList horizontal greedy sur Android).
  3. **v3 — `Gesture.Pan` + `Animated.View translateX` + 3 pages côte-à-côte** : visuel, les taps passent (threshold `activeOffsetX([-25, 25])`), inner pager des groupes garde sa priorité. Mais : 1-frame flash post-commit (le tree React mute pendant que le worklet n'a pas encore reset `tx`).
  4. **v4 — Idem mais 5 pages (`PAGE_HALF = 2`)** : flash réduit (les voisins étaient chargés) + `renderToHardwareTextureAndroid` + `React.memo` sur DayContent. Toujours du clignotement résiduel sur Android.
  5. **v5 — `react-native-pager-view` (lib native)** : on bascule sur le pager Android natif. Snap, prélecture et synchronisation Java↔JS gérés au niveau natif, plus de gap entre thread UI et thread JS.
- **Pourquoi v5** : tout l'écosystème (Tinder, Spotify, etc.) utilise un pager natif pour ce type de UX. Recoder par-dessus le bridge JS reste un best-effort sur Android, surtout quand on a déjà 5 DayContents lourds en parallèle.
- **Trade-offs** : nouvelle lib native = **rebuild EAS obligatoire** (~10 min, dépense des crédits build). Premier ajout de lib native depuis le MVP. Note : la dépendance reste compatible cross-plateforme si on fait iOS un jour.

---

## Futur — Phase 2 (sync cloud, prévue)

### PowerSync + Supabase Postgres
- **Quoi** : sync local-first entre tel et serveur, conflit-free (LWW au début).
- **Pourquoi** : permettre multi-device (PC ↔ tel) et backup. Reste local-first donc fonctionnement avion garanti.
- **Trade-offs** : auth minimale (magic link), schéma DB doit rester migratable côté serveur aussi. À revoir avant d'attaquer.

## Futur — Phase 3 (agent IA, après phase 2 stable)

### Claude API + Vercel AI SDK + MCP server Google Calendar
- **Quoi** : assistant connecté à l'agenda, décomposition d'objectifs, check-ins, replanification.
- **Pourquoi** : la valeur ajoutée vs Notion/Apple Reminders. Le hub des objectifs, pas juste une todo list.
- **Trade-offs** : coûte des appels API, demande une UX dédiée pour les conversations dans l'app.
