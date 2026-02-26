#!/usr/bin/env bun

import { runCli } from "./cli";

// Register all commands
import "./commands/init";
import "./commands/install";
import "./commands/add";
import "./commands/remove";
import "./commands/list";
import "./commands/shell";
import "./commands/env";

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
