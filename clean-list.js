#!/usr/bin/env node
/**
 * Root-friendly alias for the contact CSV cleaner.
 * Usage: node clean-list.js [input] [output]
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const script = path.join(__dirname, "scripts", "clean-contacts.mjs");
const child = spawn(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
