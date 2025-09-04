// plugins/fix-gradle-wrapper.js
const { withDangerousMod, withGradleProperties } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Expo SDK 51 prefers Gradle 8.6/8.7 + Kotlin 1.9.24
const GRADLE_URL = "https://services.gradle.org/distributions/gradle-8.7-bin.zip";

const withGradleWrapperPin = (config) =>
  withDangerousMod(config, ["android", async (cfg) => {
    const p = path.join(cfg.modRequest.projectRoot, "android", "gradle", "wrapper", "gradle-wrapper.properties");
    if (fs.existsSync(p)) {
      let txt = fs.readFileSync(p, "utf8");
      txt = txt.replace(/distributionUrl=.*\n/, `distributionUrl=${GRADLE_URL}\n`);
      fs.writeFileSync(p, txt);
    }
    return cfg;
  }]);

const withWindowsFriendlyGradleProps = (config) =>
  withGradleProperties(config, (cfg) => {
    const add = (key, value) => cfg.modResults.push({ type: "property", key, value });
    add("org.gradle.jvmargs", "-Xmx4g -Dfile.encoding=UTF-8");
    add("org.gradle.caching", "true");
    add("org.gradle.daemon", "false");     // mitigate Windows file locks
    add("org.gradle.vfs.watch", "false");  // mitigate Windows file locks
    add("expo.kotlinVersion", "1.9.24");   // <-- force Kotlin 1.9.24
    return cfg;
  });

module.exports = (config) => {
  config = withGradleWrapperPin(config);
  config = withWindowsFriendlyGradleProps(config);
  return config;
};
