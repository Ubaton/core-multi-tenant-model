import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

const appFiles = filesIn('app');
const routes = appFiles.filter((file) => file.endsWith('page.tsx')).map((file) => {
  const parts = file.replaceAll('\\', '/').split('/').slice(1, -1).filter((part) => !part.startsWith('('));
  const pattern = parts.map((part) => part.startsWith('[') ? '[^/]+' : part).join('/');
  return new RegExp(`^/${pattern}/?$`);
});
const missing = [];
let checked = 0;
for (const file of [...appFiles, ...filesIn('components')].filter((file) => file.endsWith('.tsx'))) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    const isHref = (ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) && node.name.getText(source) === 'href';
    if (isHref && node.initializer && ts.isStringLiteral(node.initializer)) {
      const href = node.initializer.text.split(/[?#]/)[0];
      if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')) {
        checked++;
        if (!routes.some((route) => route.test(href))) missing.push(`${file}: ${href}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (missing.length) {
  console.error(`Missing destinations:\n${missing.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${checked} static internal navigation destinations: all have pages.`);
}
