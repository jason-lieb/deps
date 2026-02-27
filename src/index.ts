#!/usr/bin/env bun

import { runCli } from "./cli";
import { autoSetupDirenv } from "./auto-setup";

// Auto-configure direnv if installed
await autoSetupDirenv();

// Register all commands
import "./commands/init";
import "./commands/add";
import "./commands/remove";
import "./commands/list";
import "./commands/env";
import "./commands/direnv-setup";

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
