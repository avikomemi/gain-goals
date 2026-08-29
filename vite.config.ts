import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/pages/Dashboard')) return 'p-dash';
          if (id.includes('/pages/Workout')) return 'p-workout';
          if (id.includes('/pages/Journal')) return 'p-journal';
          if (id.includes('/pages/Trends')) return 'p-trends';
          if (id.includes('/pages/Team')) return 'p-team';
          if (id.includes('/data/program')) return 'program';
          if (id.includes('/store/')) return 'store';
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
