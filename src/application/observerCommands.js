// 관찰자 커맨드 테이블 (content/ui/surface-manifest.json 커맨드 어휘의 sim/clock 부분).
// 핸들러 시그니처: (context, command) — context는 {sim, adapter}.
// clock.* 커맨드는 sim이 아니라 어댑터 플래그(paused/speed)를 조작하며,
// 어댑터가 update(dt)에서 이를 적용합니다.

function requireSim(context) {
  if (!context?.sim) throw new Error('command requires a sim in context');
  return context.sim;
}

function requireAdapter(context) {
  if (!context?.adapter) throw new Error('command requires an adapter in context');
  return context.adapter;
}

function setSpeed(context, command) {
  const adapter = requireAdapter(context);
  const speed = command?.speed;
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0) {
    throw new Error(`clock speed must be a positive finite number, got ${speed}`);
  }
  adapter.speed = speed;
  return { speed };
}

export const OBSERVER_COMMANDS = {
  'sim.make-noise': (context, command) => {
    requireSim(context).makeNoise(command?.roomId);
    return { roomId: command?.roomId ?? null };
  },
  'sim.drop-coin': (context, command) => {
    requireSim(context).dropCoin(command?.roomId);
    return { roomId: command?.roomId ?? null };
  },
  'clock.pause': context => {
    requireAdapter(context).paused = true;
    return { paused: true };
  },
  'clock.resume': context => {
    requireAdapter(context).paused = false;
    return { paused: false };
  },
  'clock.speed': setSpeed,
  // surface-manifest.json 표기 별칭
  'clock.set-speed': setSpeed
};

// 알 수 없는 커맨드/핸들러 예외는 절대 throw하지 않고 {ok:false, error}로 반환합니다.
export function dispatchCommand(context, command) {
  const type = command?.type;
  if (typeof type !== 'string' || !type) {
    return { ok: false, error: 'command.type must be a non-empty string' };
  }
  const handler = OBSERVER_COMMANDS[type];
  if (!handler) {
    return { ok: false, error: `unknown command "${type}"` };
  }
  try {
    const result = handler(context ?? {}, command);
    return { ok: true, result: result === undefined ? null : result };
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error) };
  }
}
