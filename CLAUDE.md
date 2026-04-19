# CLAUDE.md

Fichier lu automatiquement par Claude Code à chaque session. Contexte du projet, stack, conventions, règles de comportement.

---

## 1. Projet

**Nom technique :** `jarvis-app` (slug EAS : `@throbert/jarvis-app`)
**Nom produit :** à définir.

**Objectif :** application mobile cross-platform de suivi d'objectifs, organisation et planification.
- Phase 1 : calendrier + tâches du jour (création, check, consultation historique).
- Phase 2 : sync cloud local-first.
- Phase 3 : agent IA connecté à l'agenda via MCP.

**Utilisateur unique pour l'instant :** moi (Thomas). Pas d'auth multi-user. Distribution par APK direct (pas de store).

**État réel du repo (à vérifier avec `git status` / `ls` avant toute action) :**
- `App.js` présent à la racine (entrypoint Expo classique, pas encore Expo Router)
- `app.json` + `eas.json` configurés
- `assets/` contient `icon.png`, `adaptive-icon.png`, `splash-icon.png`
- `node_modules/` installé
- Dev build EAS Android fonctionnel, installé sur mon téléphone

---

## 2. Stack — état actuel vs cible

### Actuel (ce qui tourne)
| Couche           | Techno                        | Notes                         |
|------------------|-------------------------------|-------------------------------|
| App              | React Native + Expo SDK 54    | New Architecture par défaut   |
| Entrypoint       | `App.js` (pas Expo Router)    | À migrer vers Expo Router     |
| Langage          | JavaScript                    | À migrer en TypeScript        |
| Build            | EAS Build, profil `development`| APK Android installé sur tel |
| Dev loop         | `npx expo start --dev-client --tunnel` | Tunnel obligatoire réseau 42 |

### Cible (à faire progressivement)
| Couche            | Techno                             | Phase |
|-------------------|------------------------------------|-------|
| Langage           | TypeScript strict                  | 1     |
| Navigation        | Expo Router (file-based)           | 1     |
| Local DB          | `expo-sqlite`                      | 1     |
| Sync cloud        | PowerSync + Supabase (Postgres)    | 2     |
| Auth              | Supabase magic link                | 2     |
| IA                | Claude API (Sonnet récent)         | 3     |
| IA SDK            | Vercel AI SDK (`ai` package)       | 3     |
| Intégrations      | MCP server → Google Calendar       | 3     |

**iOS :** pas supporté pour l'instant (pas de Mac, pas de compte Apple dev payant). Code cross-platform OK mais on build et teste **Android uniquement**.

---

## 3. Phases — discipline stricte

La règle la plus importante de ce fichier. Claude Code ne doit **pas** anticiper les phases suivantes.

### Phase 1 — MVP local (en cours)
- Migration JS → TypeScript strict.
- Migration `App.js` → Expo Router (`app/` directory).
- Calendrier avec vue mois + vue jour.
- CRUD tâches attachées à un jour (`date` = clé de rattachement).
- Checkbox done avec `done_at` persisté.
- Persistance : SQLite local via `expo-sqlite`.
- **Tout doit fonctionner en mode avion.** Zéro dépendance réseau.

### Phase 2 — Sync cloud (pas avant que la phase 1 soit solide)
- PowerSync + Supabase Postgres.
- Auth minimale.
- Résolution de conflits : last-write-wins au début.

### Phase 3 — Agent IA (pas avant phase 2 stable)
- Claude API + Vercel AI SDK.
- MCP server Google Calendar (lecture créneaux, écriture événements).
- Fonctions agent : détection blocages, décomposition d'objectifs, check-ins, planification adaptative.

**Règle absolue :** si le ticket est phase 1, pas de code qui ne sert qu'à la phase 2 ou 3. Pas d'abstraction "pour plus tard". YAGNI.

---

## 4. Modèle de données — phase 1

SQLite local. Une seule table pour commencer.

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,          -- uuid v4
  day          TEXT NOT NULL,             -- 'YYYY-MM-DD' en timezone locale
  title        TEXT NOT NULL,
  description  TEXT,
  done         INTEGER NOT NULL DEFAULT 0,
  done_at      TEXT,                       -- ISO timestamp, NULL si pas fait
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day);
```

**Règles :**
- `day` en **timezone locale du téléphone**, format `YYYY-MM-DD`. Jamais UTC (on veut que "aujourd'hui" veuille dire "aujourd'hui" pour l'utilisateur).
- Une seule fonction utilitaire `toDayKey(d: Date): string` dans `src/lib/date.ts`. Ne jamais recalculer la clé à la main ailleurs.
- Pas de table `days`. Un jour existe implicitement s'il a des tâches.
- Pas de tags, pas de projets, pas de récurrence en phase 1.

---

## 5. Structure du repo (cible phase 1)

```
jarvis-app/
├── CLAUDE.md
├── README.md
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── app/                    ← Expo Router
│   ├── _layout.tsx
│   ├── index.tsx           ← redirige vers /calendar
│   ├── calendar/
│   │   ├── index.tsx       ← vue mois
│   │   └── [date].tsx      ← vue d'un jour (liste des tâches)
│   └── task/
│       └── [id].tsx        ← détail / édition tâche
├── src/
│   ├── db/
│   │   ├── index.ts        ← ouverture DB + migrations au boot
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── tasks.ts        ← repo tâches (toutes les queries)
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── date.ts
│   │   └── theme.ts
│   └── types/
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
- Alias imports : `@/` → `src/`. Configurer dans `tsconfig.json` + `babel.config.js` (plugin `babel-plugin-module-resolver`).

**React :**
- Composants fonctionnels. Pas de classes.
- Un composant par fichier, nom du fichier = nom du composant.
- Props typées explicitement, pas de `React.FC`.

**Style :**
- `StyleSheet` de React Native. Pas de NativeWind/Tailwind tant que non demandé.
- Palette centralisée dans `src/lib/theme.ts`.

**Dates :**
- `date-fns`. Pas `moment`, pas `dayjs` sans raison.
- `toDayKey` centralisé (cf §4).

**DB :**
- Tout SQL passe par un repo dans `src/db/`. Jamais de SQL inline dans un composant.
- Migrations versionnées et idempotentes, appliquées au boot.

**Commits :**
- Conventional commits : `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Un commit = un changement logique.

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
- Changement de schéma DB → migration versionnée, jamais `DROP`.

**Avant de finir :**
- `npx tsc --noEmit` propre (quand TS sera en place).
- Résumé en puces de ce qui a été touché. Pas de paragraphes creux.

**À ne PAS faire seul :**
- `git push`
- Commits directs sur `main` (brancher en `feat/xxx`, `fix/xxx`, `chore/xxx`)
- Ajouter une lib native (>500 kB ou nécessitant un prebuild) sans demander
- Modifier `app.json`, `eas.json`, `babel.config.js` sans demander
- Toucher aux secrets / `.env`
- **Rebuild EAS sans demander** (coûte ~10 min et ne sert qu'en cas d'ajout de lib native)

---

## 8. Commandes utiles (setup réel de ce projet)

```bash
# Dev quotidien — hot reload sur le tel via dev build
npx expo start --dev-client --tunnel
# --tunnel : obligatoire sur le réseau 42 / réseaux restreints.
# --dev-client : obligatoire (on a un dev build, pas Expo Go).

# Type check (quand TS sera en place)
npx tsc --noEmit

# Fix des versions de deps Expo
npx expo install --fix

# Rebuild du dev build APK (SEULEMENT si ajout d'une lib native)
eas build --profile development --platform android

# Voir l'état des builds
eas build:list
eas build:view

# Connexion EAS (déjà fait, compte = throbert, via Google SSO)
eas login --sso
```

**Installation APK sur téléphone Android :**
1. Ouvrir le lien EAS du build depuis le browser du tel (ou scanner le QR).
2. Télécharger l'APK, autoriser "sources inconnues" une fois.
3. Installer, ouvrir.
4. L'app demande le serveur dev → scanner le QR de `npx expo start --dev-client --tunnel`.

---

## 9. Pièges connus (déjà rencontrés, ne PAS refaire)

Documentation explicite des merdes traversées au bootstrap pour que Claude Code ne les redéclenche pas.

1. **Expo Go ne fonctionne pas avec SDK 54+.** Expo Go plafonne au SDK 52. → **Dev build EAS obligatoire**. Ne jamais proposer `npx expo start` sans `--dev-client`, ni suggérer d'installer Expo Go.

2. **EAS Build upload le contenu git-tracké, pas le dossier local.** Un fichier non commité = absent du build. Avant tout `eas build`, vérifier :
   ```bash
   git status   # rien d'important en "non suivi"
   ```
   Si des fichiers importants ne sont pas trackés (cas déjà vu : `app.json`, `App.js`, `assets/`), les commiter d'abord. Utiliser `git add -f` si masqué par un `.gitignore`.

3. **`assets/` doit exister ET être commité.** `icon.png`, `adaptive-icon.png`, `splash-icon.png` obligatoires pour builder. Référencés dans `app.json`.

4. **Réseau 42 / restreint :** `npx expo start` en LAN échoue souvent. Toujours partir avec `--tunnel`.

5. **Émulateur Android absent :** je n'ai pas Android Studio ni d'émulateur. Répondre "non" à toute question EAS de type `Install and run the Android build on an emulator?`. Tester sur mon téléphone physique.

6. **Pas de Mac :** ne rien proposer qui nécessite iOS/Xcode en local. Les builds iOS cloud EAS sont possibles mais bloqués sur compte Apple dev payant → phase ultérieure.

7. **`origin/main` git disparu sur le remote :** état actuel, pas critique, à nettoyer plus tard (`git branch --unset-upstream` ou re-pointer vers un nouveau remote).

8. **Node via nvm :** `node`/`npm` ne sont disponibles que si nvm est chargé dans le shell. Mon `~/.zshrc` doit contenir :
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   ```
   Si `npm: command not found`, c'est ça qu'il manque.

---

## 10. Notes pour toi, Claude Code

- Mon background : C, C++, NASM, kernel (KFS 42), systèmes bas niveau. Le JS/TS est nouveau pour moi mais la logique de programmation ne l'est pas. Pas besoin de m'expliquer ce qu'est une fonction ou une closure. Explique ce qui est spécifique à React Native / Expo / l'écosystème JS.
- Réponses directes, concises, rigoureuses. Pas de "great question", pas de remplissage, pas de flatterie.
- Si une de mes propositions est bancale, dis-le franchement et propose mieux.
- Je préfère comprendre **pourquoi** une lib / un pattern avant de l'adopter. Propose, ne décide pas seul sur les choix structurants.
- Français par défaut. Anglais acceptable pour les termes techniques (pas besoin de traduire "hook", "bundler", etc.).