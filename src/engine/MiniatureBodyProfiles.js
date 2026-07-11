export const BODY_PROFILES = Object.freeze({
  masculine: Object.freeze({ shoulders: 1.08, hips: 0.93, waist: 0.94, chestDepth: 1.04, limbLength: 0.99, faceWidth: 1.03, jawWidth: 1.05, stance: 1.04, posture: 0.02 }),
  feminine: Object.freeze({ shoulders: 0.94, hips: 1.08, waist: 0.88, chestDepth: 0.97, limbLength: 1.02, faceWidth: 0.96, jawWidth: 0.91, stance: 0.96, posture: -0.01 }),
  neutral: Object.freeze({ shoulders: 1, hips: 1, waist: 1, chestDepth: 1, limbLength: 1, faceWidth: 1, jawWidth: 1, stance: 1, posture: 0 })
});

export function resolveBodyType(agent, recipe) {
  const candidate = agent.bodyType ?? agent.presentation ?? agent.gender ?? recipe.bodyType ?? 'neutral';
  const normalized = String(candidate).toLowerCase();
  if (['female', 'woman', 'feminine'].includes(normalized)) return 'feminine';
  if (['male', 'man', 'masculine'].includes(normalized)) return 'masculine';
  return BODY_PROFILES[normalized] ? normalized : 'neutral';
}

export function variationFor(agent) {
  const key = agent.id ?? agent.name ?? agent.role ?? 'miniature';
  return {
    height: 0.96 + hash01(`${key}:height`) * 0.08,
    width: 0.96 + hash01(`${key}:width`) * 0.08,
    torsoLength: 0.96 + hash01(`${key}:torso`) * 0.08,
    limbLength: 0.96 + hash01(`${key}:limb`) * 0.08,
    faceBias: hash01(`${key}:face`) * 2 - 1,
    asymmetry: hash01(`${key}:asymmetry`)
  };
}

export function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return ((result >>> 0) % 10000) / 10000;
}
