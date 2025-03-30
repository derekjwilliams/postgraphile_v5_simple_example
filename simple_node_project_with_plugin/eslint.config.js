// eslint.config.js
import js from '@eslint/js' // Provides base recommended rules
import globals from 'globals' // Provides global variable definitions (like node, browser)
import tseslint from 'typescript-eslint' // Provides TS parser, plugin, and configs
import graphileExportPlugin from 'eslint-plugin-graphile-export' // Import the graphile plugin

export default tseslint.config(
  // 1. Global ignores (applied first)
  {
    ignores: [
      'node_modules/',
      'dist/', // Ignore compiled output
      'eslint.config.js', // Ignore the config file itself
    ],
  },

  // 2. Apply ESLint recommended rules globally
  js.configs.recommended,

  // 3. Apply TypeScript recommended rules globally (includes parser setup)
  // This replaces 'parser', '@typescript-eslint/parser', 'plugins: ["@typescript-eslint"]',
  // and 'extends: ["plugin:@typescript-eslint/recommended"]' from the old config.
  ...tseslint.configs.recommended,

  // 4. Configure the graphile-export plugin
  {
    // Apply this config block to relevant files
    files: ['src/**/*.ts'], // Adjust glob pattern if needed
    plugins: {
      // Register the plugin. The key 'graphile-export' is used in rule names.
      'graphile-export': graphileExportPlugin,
    },
    rules: {
      // Apply the recommended rules from the graphile-export plugin.
      // This replaces 'extends: ["plugin:graphile-export/recommended"]'
      ...graphileExportPlugin.configs.recommended.rules,
    },
  },

  // 5. Configure project-specific settings (parser options, globals)
  {
    files: ['src/**/*.ts'], // Apply specifically to your source TS files
    languageOptions: {
      // Configure the TS parser
      parserOptions: {
        project: true, // Use 'tsconfig.json' for type-aware linting
        tsconfigRootDir: import.meta.dirname, // Helps ESLint find tsconfig.json relative to this config file
      },
      // Define global variables available
      globals: {
        ...globals.node, // Add Node.js globals (replaces env: { node: true })
        // Add other globals if needed, e.g., ...globals.browser
      },
    },
    // Add any custom rule overrides here, specific to your TS files
    // rules: {
    //   "@typescript-eslint/no-explicit-any": "warn",
    // }
  }
)
