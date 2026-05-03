import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*']
  },
  ...firebaseRulesPlugin.configs['flat/recommended'],
  {
    files: ['**/*.rules'],
    plugins: {
      'firebase-rules': firebaseRulesPlugin,
    },
    languageOptions: {
      parser: firebaseRulesPlugin.preprocessors['.rules'],
    },
    rules: {
      // Add custom rules if needed
    },
  }
]
