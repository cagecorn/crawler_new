const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function run() {
  const testDir = path.join(__dirname, 'tests');
  const files = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.test.js'))
    .sort();

  for (const file of files) {
    console.log(`\nRunning ${file}`);
    await new Promise((resolve, reject) => {
      const proc = spawn('node', [path.join(testDir, file)], { stdio: 'inherit' });
      proc.on('exit', code => {
        if (code !== 0) {
          reject(new Error(`${file} failed with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }
  console.log('\nAll tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
