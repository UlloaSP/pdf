if (!process.env.npm_config_user_agent?.startsWith("pnpm/")) {
  console.error("Use vp install (pnpm) or pnpm install for this project.");
  process.exit(1);
}
