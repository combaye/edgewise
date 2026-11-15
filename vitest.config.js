import { defineConfig } from "vitest/config";

// Only this app's tests. The working folder also holds unrelated sibling
// projects with their own (non-Vitest) test files, which must not be collected.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,jsx}", "server/**/*.test.js"],
  },
});
