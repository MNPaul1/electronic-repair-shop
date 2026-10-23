import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const path of ['index.html', 'products.html', 'about.html', 'styles.css']) cpSync(path, `dist/${path}`);
cpSync('js', 'dist/js', { recursive: true });
