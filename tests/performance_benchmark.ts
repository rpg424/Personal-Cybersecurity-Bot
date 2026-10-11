/**
 * Benchmark measuring the impact of synchronous file operations on the Node.js event loop
 * compared to asynchronous file operations.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

async function benchmark() {
  const tempDir = path.join(os.tmpdir(), 'pe_benchmark_test_large');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Create dummy files
  const NUM_FILES = 5000;
  for (let i = 0; i < NUM_FILES; i++) {
    fs.writeFileSync(path.join(tempDir, `test_${i}.scr`), 'MZ is a PE file header');
  }
  const files = fs.readdirSync(tempDir);

  console.log(`Starting benchmark with ${NUM_FILES} files...`);

  // --- Synchronous Test ---
  console.log("\n--- Synchronous approach ---");
  let syncMaxDelay = 0;
  let syncStart = Date.now();

  const timerSync = setInterval(() => {
    const delay = Date.now() - syncStart - 5; // Expect 5ms
    if (delay > syncMaxDelay) syncMaxDelay = delay;
    syncStart = Date.now();
  }, 5);

  const startSyncTime = performance.now();

  // Wait to ensure timer is running
  await new Promise(r => setTimeout(r, 20));
  syncStart = Date.now(); // reset timer logic

  for (const file of files) {
    const fullPath = path.join(tempDir, file);
    let isPE = false;
    try {
        const fd = fs.openSync(fullPath, 'r');
        const buf = Buffer.alloc(2);
        fs.readSync(fd, buf, 0, 2, 0);
        fs.closeSync(fd);
        isPE = buf[0] === 0x4d && buf[1] === 0x5a;
    } catch {}
  }

  const endSyncTime = performance.now();

  // Yield again to allow timer to record the delay accumulated during the sync loop
  await new Promise(r => setTimeout(r, 20));
  clearInterval(timerSync);

  console.log(`Total execution time (including yields): ${(endSyncTime - startSyncTime).toFixed(2)}ms`);
  console.log(`Max event loop block delay: ${syncMaxDelay}ms`);

  // --- Asynchronous Test ---
  console.log("\n--- Asynchronous approach ---");
  let asyncMaxDelay = 0;
  let asyncStart = Date.now();

  const timerAsync = setInterval(() => {
    const delay = Date.now() - asyncStart - 5;
    if (delay > asyncMaxDelay) asyncMaxDelay = delay;
    asyncStart = Date.now();
  }, 5);

  const startAsyncTime = performance.now();

  await new Promise(r => setTimeout(r, 20));
  asyncStart = Date.now(); // reset timer logic

  for (const file of files) {
    const fullPath = path.join(tempDir, file);
    let isPE = false;
    let fd = null;
    try {
      fd = await fs.promises.open(fullPath, 'r');
      const buf = Buffer.alloc(2);
      await fd.read(buf, 0, 2, 0);
      isPE = buf[0] === 0x4d && buf[1] === 0x5a;
    } catch {
    } finally {
      if (fd) {
          await fd.close();
      }
    }
  }
  const endAsyncTime = performance.now();

  await new Promise(r => setTimeout(r, 20));
  clearInterval(timerAsync);

  console.log(`Total execution time (including yields): ${(endAsyncTime - startAsyncTime).toFixed(2)}ms`);
  console.log(`Max event loop block delay: ${asyncMaxDelay}ms`);

  // Clean up
  for (const file of files) {
    fs.unlinkSync(path.join(tempDir, file));
  }
  fs.rmdirSync(tempDir);
}

benchmark().catch(console.error);
