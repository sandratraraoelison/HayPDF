const { spawn } = require("node:child_process");
const env = { ...process.env, HAYPDF_DEV: "1" };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require("electron"), [process.argv[2] || "."], {
  stdio: "inherit",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
