// setup.js
const { execSync } = require('child_process');

console.log("🚀 Lancement du setup Jarvis 2026...");

const run = (command) => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Erreur lors de l'exécution de : ${command}`);
    process.exit(1);
  }
};

console.log("\n📦 1. Installation des dépendances de base...");
run('npm install');

console.log("\n💾 2. Installation des briques critiques (SQLite, PowerSync, AI SDK)...");
run('npx expo install expo-sqlite');
run('npm install @powersync/react-native @ai-sdk/react');

console.log("\n✨ 3. Nettoyage du cache Expo...");
run('npx expo install --fix');

console.log("\n✅ Setup terminé ! Tu peux maintenant lancer l'app avec : npx expo start");