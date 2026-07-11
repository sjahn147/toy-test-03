// Agent inspector selector (surface.inspector.agent).
// This selector is the only place where the UI joins normalized entity tables.

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === '