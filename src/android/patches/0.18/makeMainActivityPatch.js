const addPackagePatch = require('./addPackagePatch');

const append = (scope, pattern, patch) =>
  scope.replace(pattern, `${patch}${pattern}`);

module.exports = function makeMainActivityPatch(config) {
  const classPattern = 'public class MainActivity extends';
  const packagePattern = 'new MainReactPackage()';

  /**
   * Make a MainActivity.java program patcher
   * @param  {String}   importPath Import path, e.g. com.oblador.vectoricons.VectorIconsPackage;
   * @param  {String}   instance   Code to instance a package, e.g. new VectorIconsPackage();
   * @return {Function}            Patcher function
   */
  return function applyMainActivityPatch(content) {
    const patched = append(
      content,
      importPattern,
      config.packageImportPath + '\n'
    );

    return append(
      patched,
      packagePattern,
      addPackagePatch(config)
    );
  };
};
