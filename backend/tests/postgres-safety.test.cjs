const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const filename = path.join(__dirname, 'postgres/storage.test.cjs');
for (const [name, value, expected] of [
  ['missing test URL does not fall back to DATABASE_URL', undefined, /TEST_DATABASE_URL is required/],
  ['remote test URL is refused', 'postgresql://test:test@production.invalid/lifecourt_test', /Production connections are refused/],
  ['loopback production database name is refused', 'postgresql://test:test@127.0.0.1/postgres', /Production connections are refused/],
]) {
  test(name, () => {
    const env = { ...process.env, DATABASE_URL: 'postgresql://test:test@production.invalid/production' };
    if (value === undefined) delete env.TEST_DATABASE_URL;
    else env.TEST_DATABASE_URL = value;
    // Execute the guarded entrypoint directly, not a nested --test runner.
    const result = spawnSync(process.execPath, [filename], { env, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, expected);
  });
}
