import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { splitVendorChunkPlugin } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl';
import { spawn } from 'node:child_process';

// Regenerate the protobuf modules when a .proto changes, so the dev server never runs with a
// config.js that is missing fields (protobufjs silently drops fields it doesn't know when encoding)
function rebuildProtos() {
  let running = false;
  let queued = false;
  let timer;
  const run = (server) => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    server.config.logger.info('proto changed, running build_proto', { timestamp: true });
    const child = spawn('yarn build_proto', { stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      running = false;
      if (code !== 0) {
        server.config.logger.error(`build_proto failed (exit ${code})`, { timestamp: true });
      }
      if (queued) {
        queued = false;
        run(server);
      }
    });
  };
  return {
    name: 'rebuild-protos',
    apply: 'serve',
    configureServer(server) {
      // Both proto dirs are under the project root, which vite already watches
      server.watcher.on('all', (_event, file) => {
        if (!file.endsWith('.proto')) {
          return;
        }
        // saving several protos at once (e.g. a git checkout) only rebuilds once
        clearTimeout(timer);
        timer = setTimeout(() => run(server), 200);
      });
    },
  };
}

// `vite --mode https` serves over https with a self signed certificate, as Web Bluetooth and WebHID
// need a secure context when the page isn't on localhost (e.g. testing from a phone)
export default defineConfig(({ mode }) => ({
  plugins: [react({
    babel: {
      plugins: [['babel-plugin-react-compiler']],
    },
  }), tsconfigPaths(), splitVendorChunkPlugin(), rebuildProtos(), ...(mode === 'https' ? [basicSsl()] : [])],

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
    host: "0.0.0.0",
    watch: {
      // The firmware tree (1GB+ of sources, build dirs and venvs) isn't imported by the app, and
      // crawling it held up the watcher for minutes. Only its protos matter, for rebuildProtos().
      ignored: (file) => {
        const p = file.replaceAll('\\', '/');
        return p.includes('/Santroller/') && !p.includes('/Santroller/proto');
      },
    },
  }
}));
