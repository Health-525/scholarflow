const { execFileSync } = require('child_process');

const rawPort = process.argv[2] || "3000";
const port = parseInt(rawPort, 10);

if (Number.isNaN(port) || port <= 0 || port > 65535) {
  console.error(`[kill-port] invalid port: ${rawPort}`);
  process.exit(1);
}

function killWindows() {
  const output = execFileSync('netstat', ['-ano'], { encoding: 'utf8', shell: false });
  const pids = new Set();
  for (const line of output.split('\n')) {
    if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execFileSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore', shell: false });
    } catch {}
  }
  if (pids.size > 0) {
    console.log(`[kill-port] Killed PIDs on port ${port}: ${[...pids].join(', ')}`);
  }
}

function killUnix() {
  let output = "";
  try {
    output = execFileSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8', shell: false });
  } catch {
    return;
  }
  const pids = output.split('\n').map((s) => s.trim()).filter(Boolean);
  for (const pid of pids) {
    try {
      process.kill(parseInt(pid, 10), 'SIGKILL');
    } catch {}
  }
  if (pids.length > 0) {
    console.log(`[kill-port] Killed PIDs on port ${port}: ${pids.join(', ')}`);
  }
}

try {
  if (process.platform === 'win32') {
    killWindows();
  } else {
    killUnix();
  }
} catch {}
