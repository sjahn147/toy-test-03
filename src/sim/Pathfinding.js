export function buildGraph(links) {
  const graph = new Map();
  for (const [a, b] of links) {
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a).push(b);
    graph.get(b).push(a);
  }
  return graph;
}

export function nextStep(graph, from, to) {
  if (from === to) return from;
  const queue = [[from]];
  const seen = new Set([from]);

  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const n of graph.get(last) ?? []) {
      if (seen.has(n)) continue;
      const next = [...path, n];
      if (n === to) return next[1];
      seen.add(n);
      queue.push(next);
    }
  }

  return from;
}

export function nearestRoom(graph, from, roomIds) {
  const targets = new Set(roomIds);
  const queue = [from];
  const seen = new Set([from]);

  while (queue.length) {
    const room = queue.shift();
    if (targets.has(room)) return room;
    for (const n of graph.get(room) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }

  return null;
}
