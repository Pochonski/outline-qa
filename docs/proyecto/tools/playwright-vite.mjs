import { createServer } from "vite";

const server = await createServer({
  server: {
    port: 3001,
    strictPort: true,
    watch: {
      ignored: [
        "**/.qa/**",
        "**/playwright-report/**",
        "**/test-results/**",
        "**/build/**",
      ],
    },
  },
});
await server.listen();
server.printUrls();
