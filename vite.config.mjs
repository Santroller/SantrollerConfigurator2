import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { splitVendorChunkPlugin } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl';

// `vite --mode https` serves over https with a self signed certificate, as Web Bluetooth and WebHID
// need a secure context when the page isn't on localhost (e.g. testing from a phone)
export default defineConfig(({ mode }) => ({
  plugins: [react({
    babel: {
      plugins: [['babel-plugin-react-compiler']],
    },
  }), tsconfigPaths(), splitVendorChunkPlugin(), ...(mode === 'https' ? [basicSsl()] : [])],

  resolve: {
    alias: {
      // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    host: "0.0.0.0"
  }
}));
