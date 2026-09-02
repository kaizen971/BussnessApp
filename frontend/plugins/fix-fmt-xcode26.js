const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFmtXcode26Fix(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf8");

      const fmtPatch = `
    # Xcode 26 workaround: patch fmt base.h to disable consteval
    fmt_base = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      system("chmod", "u+w", fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/#\\s*define FMT_USE_CONSTEVAL 1/, '#  define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.write(fmt_base, patched)
        puts "[fmt patch] Successfully patched FMT_USE_CONSTEVAL to 0"
      else
        puts "[fmt patch] No changes needed (already patched or pattern not found)"
      end
    else
      puts "[fmt patch] WARNING: fmt base.h not found at \#{fmt_base}"
    end

    # Force fmt target to C++17 as a belt-and-suspenders fix
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

      if (!podfileContent.includes("FMT_USE_CONSTEVAL")) {
        podfileContent = podfileContent.replace(
          "# This is necessary for Xcode 14",
          fmtPatch + "\n    # This is necessary for Xcode 14"
        );
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
}

module.exports = withFmtXcode26Fix;
