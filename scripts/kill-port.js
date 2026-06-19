const { execSync } = require('child_process');

const port = process.argv[2] || 3000;

try {
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of output.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
    }
    if (pids.size > 0) console.log(`[kill-port] Killed PIDs on port ${port}: ${[...pids].join(', ')}`);
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
  }
} catch {}
