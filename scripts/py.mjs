// Runs Python 3 with the given arguments on any OS: `python3` on macOS and
// Linux. On Windows, `python3` and often `python` are Microsoft Store stubs
// that print an install hint and exit, so try the `py -3` launcher first.
import {spawnSync} from 'node:child_process';

const candidates =
  process.platform === 'win32'
    ? [['py', ['-3']], ['python', []]]
    : [['python3', []]];

const works = ([cmd, pre]) =>
  spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(sys.version_info[0] != 3)'], {stdio: 'ignore'}).status === 0;

const found = candidates.find(works);
if (!found) {
  console.error(`No Python 3 found (tried ${candidates.map(([c, p]) => [c, ...p].join(' ')).join(', ')}).`);
  process.exit(1);
}

const [cmd, pre] = found;
const result = spawnSync(cmd, [...pre, ...process.argv.slice(2)], {stdio: 'inherit'});
if (result.error) console.error(`Failed to start ${cmd}: ${result.error.message}`);
process.exit(result.status ?? 1);
