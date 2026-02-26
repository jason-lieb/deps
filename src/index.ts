#!/usr/bin/env bun

import { runCli } from "./cli";

// Register commands
import "./commands/init";
import "./commands/install";

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
