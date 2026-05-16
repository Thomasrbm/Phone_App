import type { ComponentProps } from 'react';
import type { Feather } from '@expo/vector-icons';

// Picker uses Feather glyphs (already bundled). Curated set, grouped
// by domain so the grid stays scannable instead of being a 280-item
// dump. Add icons here as new use cases come up.
export type FeatherName = ComponentProps<typeof Feather>['name'];

export type IconSection = {
  label: string;
  icons: FeatherName[];
};

export const ICON_SECTIONS: IconSection[] = [
  {
    label: 'Santé & énergie',
    icons: [
      'heart',
      'activity',
      'droplet',
      'zap',
      'eye',
      'smile',
      'thermometer',
      'wind',
    ],
  },
  {
    label: 'Routine du jour',
    icons: [
      'sun',
      'moon',
      'sunrise',
      'sunset',
      'coffee',
      'home',
      'clock',
      'watch',
      'umbrella',
      'cloud',
    ],
  },
  {
    label: 'Travail & étude',
    icons: [
      'book',
      'book-open',
      'edit-2',
      'edit-3',
      'feather',
      'briefcase',
      'dollar-sign',
      'bar-chart-2',
      'pie-chart',
      'trending-up',
      'target',
      'award',
    ],
  },
  {
    label: 'Code & programmation',
    icons: [
      'code',
      'terminal',
      'cpu',
      'database',
      'server',
      'hard-drive',
      'monitor',
      'smartphone',
      'tablet',
      'git-branch',
      'git-commit',
      'git-merge',
      'git-pull-request',
      'github',
      'gitlab',
      'package',
      'box',
      'layers',
      'command',
      'key',
      'lock',
      'unlock',
      'shield',
      'wifi',
      'cloud-lightning',
    ],
  },
  {
    label: 'Communication',
    icons: [
      'mail',
      'message-circle',
      'message-square',
      'phone',
      'send',
      'bell',
      'users',
      'user',
      'mic',
      'headphones',
    ],
  },
  {
    label: 'Maison & courses',
    icons: [
      'shopping-cart',
      'shopping-bag',
      'gift',
      'key',
      'lock',
      'truck',
      'scissors',
      'tool',
    ],
  },
  {
    label: 'Médias & loisirs',
    icons: [
      'music',
      'camera',
      'video',
      'image',
      'film',
      'youtube',
      'twitch',
      'play',
      'pause',
    ],
  },
  {
    label: 'Déplacement',
    icons: [
      'map',
      'map-pin',
      'compass',
      'navigation',
      'anchor',
      'globe',
    ],
  },
  {
    label: 'Divers',
    icons: [
      'star',
      'flag',
      'bookmark',
      'tag',
      'check',
      'check-circle',
      'list',
      'repeat',
      'refresh-cw',
    ],
  },
];

// Flat list of all icons (used by callers that don't need sections).
export const ICON_OPTIONS: FeatherName[] = ICON_SECTIONS.flatMap(
  (s) => s.icons
);
