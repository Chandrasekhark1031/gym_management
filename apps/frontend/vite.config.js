import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Allow ngrok (and similar) tunnels; subdomain changes each session
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', 'localhost'],
  },
});
