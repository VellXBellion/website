// build.js - rakit views/ + public/ + netlify/ menjadi folder "deploy/" siap upload ke Netlify
// Jalankan: node build.js   lalu drag folder "deploy" ke Netlify.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, 'deploy');
function assemble(rel, d = 0) {
  if (d > 5) throw new Error('Include terlalu dalam');
  const f = path.join(__dirname, 'views', rel);
  return fs.readFileSync(f, 'utf8').replace(/<!--#include (\S+?)-->/g, (_, x) => assemble(x, d + 1));
}
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(__dirname, 'public'), out, { recursive: true });
fs.cpSync(path.join(__dirname, 'netlify'), path.join(out, 'netlify'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'netlify.toml'), path.join(out, 'netlify.toml'));
fs.writeFileSync(path.join(out, 'index.html'), assemble('index.html'));
console.log('Selesai -> deploy/');
