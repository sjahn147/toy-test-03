import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('../src/ui/StrategyObserverShell.js', import.meta.url), 'utf8');
const screen = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(shell, /data-shell-log-mode="chronicle"/);
assert.match(shell, /data-event-channel/);
assert.match(shell, /onTimelineMode/);
assert.match(screen, /timelineMode/);
assert.match(screen, /saveChroniclePreferences/);
assert.match(html, /chronicle\.css/);
console.log('WP9-A UI contract smoke passed');
