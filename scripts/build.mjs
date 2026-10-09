import { spawnSync } from 'node:child_process';

const sites = process.env.VITE_SITES_MODE === 'true' || process.argv.includes('--sites');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  sites ? ['run', 'build:sites'] : ['run', 'build:frontend'],
  { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
