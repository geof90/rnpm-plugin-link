const readFile = require('./fs').readFile;
const writeFile = require('./fs').writeFile;
const path = require('path');
const compose = require('lodash.flowright');
const getPrefix = require('./getPrefix');

const cut = (scope, pattern) =>
  scope.replace(pattern + '\n', '');

module.exports = function unregisterNativeAndroidModule(name, dependencyConfig, projectConfig) {
  const prefix = getPrefix(getReactVersion(projectConfig.folder));

  /**
   * @param  {String} content Content of the Settings.gradle file
   * @return {String}         Patched content of Settings.gradle
   */
  const cutModuleFromSettings = (name) => (content) =>
    cut(content, `include ':${name}'\n` +
      `project(':${name}').projectDir = ` +
      `new File(rootProject.projectDir, '../node_modules/${name}/android')`
    );

  /**
   * Cut module compilation from the project build
   * @param  {String} content Content of the Build.gradle file
   * @return {String}         Patched content of Build.gradle
   */
  const cutModuleFromBuild = (name) => (content) =>
    cut(content, `    compile project(':${name}')`);

  const getAddPackagePatch = require(`./${prefix}/addPackagePath`);

  /**
   * Make a MainActivity.java program patcher
   * @param  {String}   importPath Import path, e.g. com.oblador.vectoricons.VectorIconsPackage;
   * @param  {String}   instance   Code to instance a package, e.g. new VectorIconsPackage();
   * @return {Function}            Patcher function
   */
  const makeMainActivityPatcher = (content) => {
    const patched = cut(content, dependencyConfig.packageImportPath);
    return cut(patched, getAddPackagePatch());
  };

  const applySettingsGradlePatch = compose(
    writeFile(projectConfig.settingsGradlePath),
    cutModuleFromSettings(name),
    readFile(projectConfig.settingsGradlePath)
  );

  const applyBuildGradlePatch = compose(
    writeFile(projectConfig.buildGradlePath),
    cutModuleFromBuild(name),
    readFile(projectConfig.buildGradlePath)
  );

  const applyMainActivityPatch = compose(
    writeFile(projectConfig.mainActivityPath),
    makeMainActivityPatcher,
    readFile(projectConfig.mainActivityPath)
  );

  /**
   * Check if module has been installed already
   */
  const isInstalled = compose(
    (content) => ~content.indexOf(getAddPackagePatch()),
    readFile(projectConfig.mainActivityPath)
  );

  if (!isInstalled(name)) {
    return false;
  }

  compose(
    applySettingsGradlePatch,
    applyBuildGradlePatch,
    applyMainActivityPatch
  )();

  return true;
};
