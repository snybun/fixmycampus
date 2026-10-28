// vite.config.js
import { defineConfig } from "file:///C:/Users/Mark/Desktop/fixmycampus/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Mark/Desktop/fixmycampus/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/dist/" : "/",
  build: {
    outDir: "../public/dist",
    emptyOutDir: true
  },
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/health.php": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxNYXJrXFxcXERlc2t0b3BcXFxcZml4bXljYW1wdXNcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE1hcmtcXFxcRGVza3RvcFxcXFxmaXhteWNhbXB1c1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTWFyay9EZXNrdG9wL2ZpeG15Y2FtcHVzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCB9KSA9PiAoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBiYXNlOiBjb21tYW5kID09PSAnYnVpbGQnID8gJy9kaXN0LycgOiAnLycsXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJy4uL3B1YmxpYy9kaXN0JyxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTc1LFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgICcvaGVhbHRoLnBocCc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG5cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VCxTQUFTLG9CQUFvQjtBQUN6VixPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxRQUFRLE9BQU87QUFBQSxFQUM1QyxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTSxZQUFZLFVBQVUsV0FBVztBQUFBLEVBQ3ZDLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
