# Polish Features

Inventaire des micro-features UX ajoutées sans rebuild EAS. Chaque feature a
un slug : pour la retirer, dire à Claude `supprime <slug>` et il sait où
chercher (chaque insertion est marquée d'un commentaire `// POLISH:<slug>`).

| Slug | Description | Fichiers principaux |
|---|---|---|
| `section-dots` | Petit point coloré devant les sections "À faire" (orange) et "Faits" (vert) sur l'écran jour | `app/calendar/[date].tsx` |
| ~~`encoche-pulse`~~ | (Retiré : 3 worklets reanimated en boucle infinie simultanés contribuaient au lag global perçu.) | — |
| ~~`day-press`~~ | (Retiré pour cause de lag : 100+ `useSharedValue` simultanés alourdissaient la vue mois.) | — |
| `empty-trash` | Icône + texte plus inviting quand la corbeille du jour est vide | `app/trash/[date].tsx` |
| `empty-search` | Idem pour l'écran de recherche globale sans résultat | `app/search.tsx` |
| `routine-burst` | Petit "pop" (scale 1 → 1.3 → 1) sur l'icône check d'une routine au moment où on la complète | `src/components/DayRoutinesSection.tsx` |
| `hub-crossfade` | Crossfade ultra-rapide (80ms) entre vues du hub au lieu de bascule instantanée | `app/index.tsx` |
| `all-done-pop` | Quand tout est coché : la card "Progrès du jour" tinte vers `doneSoft` + le footer "Journée bouclée ✓" passe en couleur `done`, fade 320ms. Pas de scale. | `app/calendar/[date].tsx` |
| `encoche-haptic` | Vibration courte (20ms) au déclenchement d'une encoche (`DragHandle`) | `src/components/DragHandle.tsx` |
