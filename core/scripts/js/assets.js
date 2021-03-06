/**
 * @file
 * Copy files for JS vendor dependencies from node_modules to the assets/vendor
 * folder.
 *
 * This script handles all dependencies except CKEditor, Modernizr,
 * and jQuery.ui which require a custom build step.
 */

const path = require('path');
const { copyFile, writeFile, readFile, chmod } = require('fs').promises;

const coreFolder = path.resolve(__dirname, '../../');
const packageFolder = `${coreFolder}/node_modules`;
const assetsFolder = `${coreFolder}/assets/vendor`;

(async () => {
  const librariesPath = `${coreFolder}/core.libraries.yml`;
  // Open the core.libraries.yml file to update version information
  // automatically.
  const libraries = (await readFile(librariesPath, 'utf-8')).split('\n\n');

  function updateLibraryVersion(libraryName, { version }) {
    const libraryIndex = libraries.findIndex((lib) =>
      lib.startsWith(libraryName),
    );
    if (libraryIndex > 0) {
      const libraryDeclaration = libraries[libraryIndex];
      // Get the previous package version.
      const currentVersion = libraryDeclaration.match(/version: "(.*)"\n/)[1];
      // Replace the version value and the version in the licence URL.
      libraries[libraryIndex] = libraryDeclaration.replace(
        new RegExp(currentVersion, 'g'),
        version,
      );
    }
  }

  /**
   * Declare the array that defines what needs to be copied over.
   *
   * @prop {string} pack
   *   The name of the npm package (used to get the name of the folder where
   *   the files are situated inside of the node_modules folder). Note that we
   *   use `pack` and not `package` because `package` is a future reserved word.
   * @prop {string} [folder]
   *   The folder under `assets/vendor/` where the files will be copied. If
   *   this
   *   is not defined the value of `pack` is used.
   * @prop {string} [library]
   *   The key under which the library is declared in core.libraries.yml.
   * @prop {Array} files
   *   An array of files to be copied over.
   *     - A string if the file has the same name and is at the same level in
   *   the source and target folder.
   *     - An object with a `from` and `to` property if the source and target
   *   have a different name or if the folder nesting is different.
   */
  const process = [
    {
      pack: 'backbone',
      files: ['backbone.js', 'backbone-min.js', 'backbone-min.map'],
    },
    {
      pack: 'css.escape',
      folder: 'css-escape',
      library: 'css.escape',
      files: ['css.escape.js'],
    },
    {
      pack: 'es6-promise',
      files: [
        { from: 'dist/es6-promise.auto.min.js', to: 'es6-promise.auto.min.js' },
        {
          from: 'dist/es6-promise.auto.min.map',
          to: 'es6-promise.auto.min.map',
        },
      ],
    },
    {
      pack: 'farbtastic',
      library: 'jquery.farbtastic',
      files: [
        'marker.png',
        'mask.png',
        'wheel.png',
        'farbtastic.css',
        { from: 'farbtastic.min.js', to: 'farbtastic.js' },
      ],
    },
    {
      pack: 'jquery',
      files: [
        { from: 'dist/jquery.js', to: 'jquery.js' },
        { from: 'dist/jquery.min.js', to: 'jquery.min.js' },
        { from: 'dist/jquery.min.map', to: 'jquery.min.map' },
      ],
    },
    {
      pack: 'jquery-form',
      library: 'jquery.form',
      files: [
        { from: 'dist/jquery.form.min.js', to: 'jquery.form.min.js' },
        { from: 'dist/jquery.form.min.js.map', to: 'jquery.form.min.js.map' },
        { from: 'src/jquery.form.js', to: 'src/jquery.form.js' },
      ],
    },
    {
      pack: 'joyride',
      folder: 'jquery-joyride',
      library: 'jquery.joyride',
      files: ['jquery.joyride-2.1.js'],
    },
    {
      pack: 'jquery-once',
      library: 'jquery.once',
      files: ['jquery.once.js', 'jquery.once.min.js', 'jquery.once.min.js.map'],
    },
    {
      pack: 'js-cookie',
      files: [{ from: 'dist/js.cookie.min.js', to: 'js.cookie.min.js' }],
    },
    {
      pack: 'normalize.css',
      folder: 'normalize-css',
      library: 'normalize',
      files: ['normalize.css'],
    },
    {
      pack: '@drupal/once',
      folder: 'once',
      files: [
        { from: 'dist/once.js', to: 'once.js' },
        { from: 'dist/once.min.js', to: 'once.min.js' },
        { from: 'dist/once.min.js.map', to: 'once.min.js.map' },
      ],
    },
    {
      pack: 'picturefill',
      files: [{ from: 'dist/picturefill.min.js', to: 'picturefill.min.js' }],
    },
    {
      pack: '@popperjs/core',
      folder: 'popperjs',
      files: [
        { from: 'dist/umd/popper.min.js', to: 'popper.min.js' },
        { from: 'dist/umd/popper.min.js.map', to: 'popper.min.js.map' },
      ],
    },
    {
      pack: 'shepherd.js',
      folder: 'shepherd',
      files: [
        { from: 'dist/js/shepherd.min.js', to: 'shepherd.min.js' },
        { from: 'dist/js/shepherd.min.js.map', to: 'shepherd.min.js.map' },
      ],
    },
    { pack: 'sortablejs', folder: 'sortable', files: ['Sortable.min.js'] },
    {
      pack: 'tabbable',
      files: [
        { from: 'dist/index.umd.min.js', to: 'index.umd.min.js' },
        { from: 'dist/index.umd.min.js.map', to: 'index.umd.min.js.map' },
      ],
    },
    {
      pack: 'underscore',
      files: ['underscore-min.js', 'underscore-min.js.map'],
    },
    {
      pack: 'loadjs',
      files: [{ from: 'dist/loadjs.min.js', to: 'loadjs.min.js' }],
    },
  ].map(async ({ pack, files = [], folder = false, library = false }) => {
    const sourceFolder = pack;
    const libraryName = library || folder || pack;
    const destFolder = folder || pack;

    let packageInfo;
    // Take the version info from the package.json file.
    if (!['joyride', 'farbtastic'].includes(pack)) {
      packageInfo = JSON.parse(
        await readFile(`${packageFolder}/${sourceFolder}/package.json`),
      );
    }
    if (packageInfo) {
      updateLibraryVersion(libraryName, packageInfo);
    }

    files.forEach(async (file) => {
      let source = file;
      let dest = file;
      if (typeof file === 'object') {
        source = file.from;
        dest = file.to;
      }
      // For map files, make sure the sources files don't leak outside the
      // library folder. In the `sources` member, remove all "../" values at
      // the start of the files names to avoid having the virtual files outside
      // of the library vendor folder in dev tools.
      if (path.extname(source) === '.map') {
        console.log('Process map file', source);
        const map = await readFile(
          `${packageFolder}/${sourceFolder}/${source}`,
        );
        const json = JSON.parse(map);
        json.sources = json.sources.map((source) =>
          source.replace(/^(\.\.\/)+/, ''),
        );
        await writeFile(
          `${assetsFolder}/${destFolder}/${dest}`,
          JSON.stringify(json),
        );
      } else {
        console.log(
          'Copy',
          `${sourceFolder}/${source}`,
          'to',
          `${destFolder}/${dest}`,
        );
        await copyFile(
          `${packageFolder}/${sourceFolder}/${source}`,
          `${assetsFolder}/${destFolder}/${dest}`,
        );
        // These 2 files come from a zip file that hasn't been updated in years
        // hardcode the permission fix to pass the commit checks.
        if (['jquery.joyride-2.1.js', 'marker.png'].includes(dest)) {
          await chmod(`${assetsFolder}/${destFolder}/${dest}`, 0o644);
        }
      }
    });
  });

  await Promise.all(process);
  await writeFile(librariesPath, libraries.join('\n\n'));
})();
