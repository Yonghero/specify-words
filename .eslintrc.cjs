module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 2023,
  },
  rules: {
    'vue/attribute-hyphenation': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'tailwindcss/no-custom-classname': 'off',
    // 'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': [0, { 'packageDir ': './src/' }],
    'max-len': ['error', {
      code: 160,
      ignorePattern: 'class="([\\s\\S]*?)"|d="([\\s\\S]*?)"', // ignore classes or svg draw attributes
      ignoreUrls: true,
    }],
    'no-return-assign': 'off',
    'vue/multi-word-component-names': 'off',
    'import/prefer-default-export': 'off',
    'class-methods-use-this': 'off',
    'no-use-before-define': 'off',
    'no-param-reassign': 'off',
    semi: [2, 'never'],
    'linebreak-style': 'off',
    'no-restricted-syntax': 'off',
    'no-confusing-arrow': 'off',
    'implicit-arrow-linebreak': 'off',
    'function-paren-newline': 'off',
    'no-shadow': 'off',
    'no-underscore-dangle': 'off',
  },
}
