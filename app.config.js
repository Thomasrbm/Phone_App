// Dynamic Expo config. Wraps app.json and tweaks identity per build
// variant via APP_VARIANT (set per-profile in eas.json).
//
//   APP_VARIANT unset    → dev build & production: com.jarvis.app
//   APP_VARIANT=preview  → release APK distinct from dev: com.jarvis.app.preview
//
// The point: a release build can be installed alongside the dev build
// on the same Android device (different applicationId = different app).

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT;
  const isPreview = variant === 'preview';

  if (!isPreview) return config;

  return {
    ...config,
    name: `${config.name} (Preview)`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}.preview`,
    },
    android: {
      ...config.android,
      package: `${config.android.package}.preview`,
    },
  };
};
