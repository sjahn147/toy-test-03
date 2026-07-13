import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('../src/ui/StrategyObserverShell.js', import.meta.url), 'utf8');
const screen = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(shell, /data-shell-locale="ko"/);
assert.match(shell, /data-shell-locale="bilingual"/);
assert.match(shell, /setTimelineLocale/);
assert.match(shell, /event\.secondaryText/);
assert.match(shell, /chronicleUiCopy/);
assert.match(screen, /onTimelineLocale/);
assert.match(html, /chronicle-ko\.css/);
console.log('WP9-B UI contract smoke passed');
