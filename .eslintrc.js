module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true
    }
  },
  plugins: ["ember"],
  extends: ["eslint:recommended", "plugin:ember/recommended"],
  env: {
    browser: true,
  },
  rules: {
    "ember/avoid-leaking-state-in-ember-objects": 0,
    'ember/no-jquery': 'error',
    'ember/no-new-mixins': 0
  },
  overrides: [
    // node files
    {
      files: [
        '.eslintrc.js',
        '.template-lintrc.js',
        'ember-cli-build.js',
        'index.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'tests/dummy/config/**/*.js'
      ],
      excludedFiles: [
        'addon/**',
        'app/**',
        'tests/dummy/app/**'
      ],
      excludedFiles: ["app/**", "addon/**", "tests/dummy/app/**"],
      parserOptions: {
        sourceType: "script",
        ecmaVersion: 2018,
      },
      env: {
        browser: false,
        node: true,
      },
      plugins: ["node"],
      rules: Object.assign(
        {},
        require("eslint-plugin-node").configs.recommended.rules,
        {
          // add your custom rules and overrides for node files here
        }
      ),
    },

    // test files
    {
      files: ["tests/**/*.js"],
      excludedFiles: ["tests/dummy/**/*.js"],
      env: {
        embertest: true,
      },
    },
  ],
};
