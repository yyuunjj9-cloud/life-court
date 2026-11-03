const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// 프론트 소스의 '@/…' 별칭(tsconfig paths)을 frontend/src로 풀어 준다.
const frontendSrc = path.join(__dirname, '../../frontend/src');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = path.join(frontendSrc, request.slice(2));
  return resolveFilename.call(this, request, ...rest);
};
require.extensions['.tsx'] = require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText, filename);
