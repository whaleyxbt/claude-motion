// Runs Python 3 with the given arguments on any OS: `python3` on macOS and
// Linux, `python` on Windows, where `python3` is usually a Microsoft Store stub.
import {spawnSync} from 'node:child_process';

const python = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(python, process.argv.slice(2), {stdio: 'inherit'});
if (result.error) console.error(`Failed to start ${python}: ${result.error.message}`);
process.exit(result.status ?? 1);
