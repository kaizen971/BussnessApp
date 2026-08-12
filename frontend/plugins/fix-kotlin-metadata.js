const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withKotlinMetadataFix(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "build.gradle"
      );

      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, "utf8");

        if (!content.includes("Xskip-metadata-version-check")) {
          const kotlinFix = `
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions {
      freeCompilerArgs.addAll(["-Xskip-metadata-version-check"])
    }
  }
}
`;
          content += kotlinFix;
          fs.writeFileSync(buildGradlePath, content);
        }
      }

      return config;
    },
  ]);
}

module.exports = withKotlinMetadataFix;
