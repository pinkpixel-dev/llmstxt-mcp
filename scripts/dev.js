#!/usr/bin/env node
/**
 * Development script for LLMSTXT-MCP server
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { watch } from 'node:fs';
import treeKill from 'tree-kill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let currentProcess = null;

function startServer() {
  if (currentProcess) {
    console.log('🔄 Restarting server...');
    treeKill(currentProcess.pid, 'SIGTERM', () => {
      launchServer();
    });
  } else {
    launchServer();
  }
}

function launchServer() {
  console.log('🚀 Starting LLMSTXT-MCP server...');
  
  currentProcess = spawn(
    'node',
    ['--loader', 'tsx', join(rootDir, 'src/index.ts'), '--help'],
    {
      stdio: 'inherit',
      cwd: rootDir
    }
  );
  
  currentProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`❌ Server exited with code ${code}`);
    }
    currentProcess = null;
  });
  
  currentProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
}

// Watch for changes in src directory
function watchFiles() {
  console.log('👀 Watching for changes in src/...');
  
  const watcher = watch(join(rootDir, 'src'), { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.ts')) {
      console.log(`📝 File changed: ${filename}`);
      startServer();
    }
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dev server...');
    watcher.close();
    if (currentProcess) {
      treeKill(currentProcess.pid, 'SIGTERM');
    }
    process.exit(0);
  });
}

// Start initial server and begin watching
startServer();
watchFiles();