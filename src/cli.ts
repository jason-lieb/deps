export interface Command {
  name: string;
  description: string;
  run: (args: string[]) => Promise<number>;
}

const commands: Map<string, Command> = new Map();

export function registerCommand(cmd: Command): void {
  commands.set(cmd.name, cmd);
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}

export function getAllCommands(): Command[] {
  return Array.from(commands.values());
}

export async function runCli(args: string[]): Promise<number> {
  const cmdName = args[0];

  if (!cmdName || cmdName === "--help" || cmdName === "-h") {
    printHelp();
    return 0;
  }

  const cmd = getCommand(cmdName);
  if (!cmd) {
    console.error(`Unknown command: ${cmdName}`);
    console.error(`Run 'deps --help' for usage.`);
    return 1;
  }

  try {
    return await cmd.run(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    return 1;
  }
}

function printHelp(): void {
  console.log("deps - Nix-powered dependency management\n");
  console.log("Usage: deps <command> [options]\n");
  console.log("Commands:");
  for (const cmd of getAllCommands()) {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  }
}
