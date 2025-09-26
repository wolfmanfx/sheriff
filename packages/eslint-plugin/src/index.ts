import rules from './lib/rules';
import { legacy, legacyBarrelModulesOnly } from "./lib/configs/legacy";
import { all, barrelModulesOnly } from "./lib/configs/all";
import type { ESLint } from 'eslint';
import type { TSESLint } from '@typescript-eslint/utils';
import {
  name as packageName,
  version as packageVersion,
} from '../package.json';

const meta = { name: packageName, version: packageVersion };

export type SheriffEslintPlugin = {
  configs: Record<string, ESLint.ConfigData | TSESLint.FlatConfig.Config>;
  rules: typeof rules;
  meta: { name: string; version: string };
};

const configs: SheriffEslintPlugin['configs'] = {
  legacy,
  legacyBarrelModulesOnly,
  barrelModulesOnly,
  all
};

export { configs, rules, meta };

const plugin: SheriffEslintPlugin = { configs, rules, meta };
export default plugin;
