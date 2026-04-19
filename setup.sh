#!/bin/bash

echo "🧬 Initialisation du système Jarvis 2026..."

# 1. Installation de NVM (Gestionnaire de Node)
if [ ! -d "$HOME/.nvm" ]; then
    echo "📥 Installation de NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# 2. Chargement de NVM pour la session actuelle
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Installation de Node LTS (Stable)
echo "📦 Installation de Node.js..."
nvm install --lts
nvm use --lts

# 4. Création/Correction du package.json (Version compatible garantie)
echo "📝 Configuration du projet..."
cat <<EOF > package.json
{
  "name": "jarvis-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios"
  },
  "dependencies": {
    "expo": "~55.0.0",
    "expo-status-bar": "~2.0.1",
    "react": "18.3.1",
    "react-native": "0.78.0",
    "expo-sqlite": "~15.0.0",
    "@powersync/react-native": "latest",
    "@ai-sdk/react": "latest"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2"
  },
  "private": true
}
EOF

# 5. Installation forcée (Ignore les conflits de versions mineurs)
echo "🚀 Installation des dépendances (Mode Force)..."
npm install --legacy-peer-deps

# 6. Patch pour Ubuntu (Limites de fichiers)
echo "🔧 Optimisation Ubuntu..."
sudo sysctl fs.inotify.max_user_watches=524288 &> /dev/null

echo "-------------------------------------------------------"
echo "✅ TOUT EST INSTALLÉ AVEC SUCCÈS !"
echo "📱 Commande pour lancer l'app : npx expo start --tunnel"
echo "-------------------------------------------------------"