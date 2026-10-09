import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sitePreview } from './site-preview-plugin.mjs';

export default defineConfig({
  plugins: [react(), sitePreview()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Allow ngrok (and similar) tunnels; subdomain changes each session
    allowedHosts: ['terminal.local', '.ngrok-free.dev', '.ngrok.io', 'localhost'],
  },
});
