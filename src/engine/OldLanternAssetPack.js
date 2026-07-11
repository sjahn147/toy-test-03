import { THREE } from './ThreeScene.js';

export const OLD_LANTERN_ASSET_PACK_ID = 'campaign.old-lantern';

const RECIPES = Object.freeze({
  'inn.old-lantern.common-room': room('H36', 'ruined', ['ruined', 'bivouac', 'repaired', 'prosperous', 'besieged', 'burned'], 15.2, 11.8, ['hearth', 'service-bar', 'job-board', 'defense-shutters']),
  'inn.old-lantern.kitchen': room('H37', 'blackened', ['blackened', 'camp-kitchen', 'working', 'infested'], 13.2, 10.2, ['kitchen-range', 'prep-table', 'pantry', 'wash-basin']),
  'inn.old-lantern.guest-wing': room('H38', 'collapsed', ['collapsed', 'partitioned-camp', 'guestrooms', 'webbed'], 14.4, 10.8, ['bed-module', 'linen-chest', 'hall-lantern', 'barricade']),
  'inn.old-lantern.cellar': room('H39', 'flooded', ['flooded', 'stocked', 'fungal-brewery', 'raided'], 13.6, 10.4, ['barrel-rack', 'brew-vat', 'drain', 'smuggler-cache']),
  'inn.old-lantern.secret-office': room('H40', 'sealed', ['sealed', 'discovered', 'operations-room'], 9.6, 8.4, ['ledger-desk', 'map-wall', 'signal-lantern', 'secret-door'])
});

export const OLD_LANTERN_BUNDLE_IDS = Object.freeze(Object.keys(RECIPES));
export const getOldLanternRecipe = id => RECIPES[id] ?? null;
export const listOldLanternRecipes = () => Object.values(RECIPES);

export function createOldLanternAssetPack() {
  const ids = new Set(OLD_LANTERN_BUNDLE_IDS);
  return Object.freeze({
    id: OLD_LANTERN_ASSET_PACK_ID,
    bundleIds: OLD_LANTERN_BUNDLE_IDS,
    canCreate: id => ids.has(id),
    create(id, context = {}) { return build(id, context.state ?? RECIPES[id]?.defaultState); },
    getRecipe: getOldLanternRecipe,
    listRecipes: listOldLanternRecipes,
    animate(root, elapsed) { animate(root, elapsed); }
  });
}

function room(roomId, defaultState, states, width, depth, sockets) {
  return Object.freeze({ id: `inn.old-lantern.${roomId === 'H36' ? 'common-room' : roomId === 'H37' ? 'kitchen' : roomId === 'H38' ? 'guest-wing' : roomId === 'H39' ? 'cellar' : 'secret-office'}`, roomId, defaultState, states: Object.freeze(states), placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }), footprint: Object.freeze({ width, depth, height: roomId === 'H36' ? 6.4 : 5.2 }), sockets: Object.freeze(sockets), detailBudget: 'hero', triangleBudget: roomId === 'H36' ? 52000 : 34000 });
}

function build(id, state) {
  const root = new THREE.Group();
  root.name = `old-lantern:${id}`;
  root.userData = { assetId: id, state, oldLantern: true };
  root.add(shell(id, state));
  if (id.endsWith('common-room')) commonRoom(root, state);
  else if (id.endsWith('kitchen')) kitchen(root, state);
  else if (id.endsWith('guest-wing')) guestWing(root, state);
  else if (id.endsWith('cellar')) cellar(root, state);
  else office(root, state);
  return root;
}

function shell(id, state) {
  const g = new THREE.Group();
  const damaged = ['ruined', 'burned', 'blackened', 'collapsed', 'raided'].includes(state);
  const small = id.endsWith('secret-office');
  const w = small ? 9 : 14, d = small ? 7.8 : 10.4;
  box(g, w, 0.22, d, damaged ? M.charred : M.floor, 0, 0.11, 0);
  box(g, w, 3.8, 0.28, damaged ? M.soot : M.wall, 0, 1.9, -d / 2);
  for (const side of [-1, 1]) box(g, 0.3, 4.4, d, damaged ? M.charred : M.darkWood, side * (w / 2 - 0.15), 2.2, 0);
  for (let i = 0; i < 7; i += 1) box(g, 0.22, 0.22, d, M.darkWood, -w / 2 + 0.8 + i * ((w - 1.6) / 6), 4.05, 0, damaged && i === 5 ? 0.18 : 0);
  return g;
}

function commonRoom(root, state) {
  const active = ['bivouac', 'repaired', 'prosperous', 'besieged'].includes(state);
  const prosperous = state === 'prosperous';
  const hearth = new THREE.Group(); hearth.name = 'hearth';
  box(hearth, 3.2, 0.42, 1.7, M.stone, -4.7, 0.22, -2.9);
  box(hearth, 0.56, 2.5, 1, M.stone, -5.9, 1.45, -2.9);
  box(hearth, 0.56, 2.5, 1, M.stone, -3.5, 1.45, -2.9);
  const arch = mesh(new THREE.TorusGeometry(1.2, 0.3, 8, 24, Math.PI), M.stoneLight); arch.rotation.z = Math.PI; arch.position.set(-4.7, 2.45, -2.85); hearth.add(arch);
  if (active) flames(hearth, -4.7, 0.75, -3.05, state === 'besieged' ? 5 : 3);
  root.add(hearth);
  box(root, 4.8, 1.1, 0.8, M.oak, 3.6, 0.62, -3.2);
  box(root, 4.4, 0.18, 1.15, M.brass, 3.6, 1.24, -3.2);
  for (let i = 0; i < (prosperous ? 12 : active ? 6 : 2); i += 1) cylinder(root, 0.09, 0.42, i % 2 ? M.greenGlass : M.amberGlass, 1.7 + (i % 6) * 0.55, 1.55 + Math.floor(i / 6) * 0.42, -3.25);
  for (let i = 0; i < 4; i += 1) {
    const x = -1.6 + (i % 2) * 3.7, z = -0.3 + Math.floor(i / 2) * 3;
    box(root, 2, 0.18, 1.05, M.oak, x, 0.92, z, state === 'ruined' && i === 2 ? 0.3 : 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(root, 0.16, 0.8, 0.16, M.darkWood, x + sx * 0.72, 0.45, z + sz * 0.33);
  }
  box(root, 2.4, 1.6, 0.16, M.darkWood, 0, 2.2, -5.08);
  for (let i = 0; i < (active ? 7 : 2); i += 1) plane(root, 0.4, 0.48, M.paper, -0.85 + (i % 4) * 0.52, 2 + Math.floor(i / 4) * 0.55, -4.98);
  if (state === 'bivouac') bedrolls(root, 4, -0.8, 3.4);
  if (state === 'besieged') barricade(root, 4.6);
  if (state === 'burned') debris(root, 18, M.charred);
  lanterns(root, prosperous ? 6 : active ? 4 : 1, 3.4);
}

function kitchen(root, state) {
  const lit = state === 'working' || state === 'camp-kitchen';
  box(root, 4.5, 1.2, 1.8, M.stone, -3.8, 0.65, -3.25);
  for (let i = 0; i < 3; i += 1) {
    const mouth = mesh(new THREE.TorusGeometry(0.48, 0.15, 7, 20, Math.PI), M.iron); mouth.rotation.z = Math.PI; mouth.position.set(-5.1 + i * 1.25, 1, -2.35); root.add(mouth);
    if (lit) flames(root, -5.1 + i * 1.25, 0.72, -2.55, 2);
  }
  box(root, 4.1, 0.22, 1.8, M.oak, 0, 1.02, -0.4);
  for (let shelf = 0; shelf < 3; shelf += 1) box(root, 3.2, 0.18, 0.75, M.oak, 4.6, 0.65 + shelf * 0.85, 2.7);
  for (let i = 0; i < (state === 'working' ? 18 : 6); i += 1) cylinder(root, 0.14, 0.38, i % 2 ? M.ceramic : M.amberGlass, 3.35 + (i % 6) * 0.48, 0.92 + Math.floor(i / 6) * 0.85, 2.65);
  if (state === 'infested') for (let i = 0; i < 11; i += 1) pulseSphere(root, -4.8 + (i % 6) * 1.65, 0.25, -1.2 + Math.floor(i / 6) * 3.4, M.slime);
  if (state === 'blackened') debris(root, 14, M.soot);
  lanterns(root, state === 'working' ? 4 : 1, 3.2);
}

function guestWing(root, state) {
  const restored = state === 'guestrooms';
  for (let i = 0; i < 6; i += 1) {
    const x = -4.4 + (i % 3) * 4.4, z = -2.7 + Math.floor(i / 3) * 5.2;
    box(root, 2.6, 0.42, 1.25, restored ? M.oak : M.darkWood, x, 0.42, z, state === 'collapsed' && i === 4 ? 0.24 : 0);
    box(root, 2.25, 0.18, 1.05, restored ? M.linen : M.dirtyLinen, x, 0.72, z);
    box(root, 0.65, 0.22, 0.92, M.linen, x - 0.72, 0.88, z);
  }
  for (let i = 0; i < 4; i += 1) box(root, 0.18, 3.4, 9.2, M.darkWood, -5.3 + i * 3.55, 1.7, 0);
  if (state === 'webbed') for (let i = 0; i < 9; i += 1) { const web = mesh(new THREE.TorusGeometry(0.8 + (i % 3) * 0.25, 0.018, 5, 24), M.web); web.rotation.set(Math.PI / 2, i * 0.31, 0); web.position.set(-5 + (i % 5) * 2.5, 1.2 + (i % 3) * 0.8, -3.7 + Math.floor(i / 5) * 6.5); root.add(web); }
  if (state === 'partitioned-camp') bedrolls(root, 8, -4.5, -3.2);
  if (state === 'collapsed') debris(root, 20, M.charred);
  lanterns(root, restored ? 6 : 2, 3.15);
}

function cellar(root, state) {
  const full = state === 'stocked' || state === 'fungal-brewery';
  for (let rack = 0; rack < 4; rack += 1) for (let i = 0; i < (full ? 5 : 2); i += 1) { const barrel = mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.25, 12), M.oak); barrel.rotation.z = Math.PI / 2; barrel.position.set((rack % 2 ? 1.4 : -5.2) + i * 0.95, 0.82, -3.2 + rack * 2.15); root.add(barrel); }
  cylinder(root, 1.45, 2, state === 'fungal-brewery' ? M.fungal : M.copper, 0, 1.05, 0.3);
  if (state === 'flooded') { const water = plane(root, 12.6, 9.2, M.water, 0, 0.28, 0); water.rotation.x = -Math.PI / 2; water.name = 'old-lantern-water'; }
  if (state === 'fungal-brewery') for (let i = 0; i < 13; i += 1) pulseSphere(root, -5.2 + (i % 7) * 1.7, 0.48, -3 + Math.floor(i / 7) * 5.6, M.fungal);
  if (state === 'raided') debris(root, 18, M.oak);
}

function office(root, state) {
  const open = state !== 'sealed', ops = state === 'operations-room';
  box(root, 2.3, 3.2, 0.28, open ? M.darkWood : M.stone, 0, 1.65, -3.95, open ? -0.5 : 0);
  if (!open) return;
  box(root, 3.8, 0.22, 1.9, M.oak, 0, 1, -0.3);
  plane(root, 5.6, 2.8, M.map, 0, 2.35, -4.12);
  for (let i = 0; i < (ops ? 18 : 7); i += 1) pulseSphere(root, -2.4 + (i % 7) * 0.75, 1.45 + Math.floor(i / 7) * 0.65, -4.03, i % 3 ? M.brass : M.red, 0.06);
  for (let i = 0; i < (ops ? 10 : 4); i += 1) box(root, 0.48, 0.08, 0.7, i % 2 ? M.paper : M.leather, -1.6 + (i % 5) * 0.8, 1.16 + Math.floor(i / 5) * 0.1, -0.55 + Math.floor(i / 5) * 0.7);
  lanterns(root, ops ? 4 : 1, 3);
}

function animate(root, elapsed) { root.traverse(node => { if (node.name === 'old-lantern-flame') node.scale.y = 0.9 + Math.sin(elapsed * 8 + node.id) * 0.14; if (node.name === 'old-lantern-pulse') { const p = 1 + Math.sin(elapsed * 2.2 + node.id) * 0.06; node.scale.x = p; node.scale.z = p; } if (node.name === 'old-lantern-water') node.material.opacity = 0.42 + Math.sin(elapsed * 1.7) * 0.05; if (node.name === 'old-lantern-lantern') node.rotation.z = Math.sin(elapsed * 1.3 + node.id) * 0.035; }); }
function lanterns(root, count, y) { for (let i = 0; i < count; i += 1) { const g = new THREE.Group(); g.name = 'old-lantern-lantern'; cylinder(g, 0.2, 0.5, M.iron, 0, 0, 0); pulseSphere(g, 0, 0, 0, M.flame, 0.12, 'old-lantern-flame'); g.position.set(-4.8 + (i % 4) * 3.2, y, -2.8 + Math.floor(i / 4) * 4.7); root.add(g); } }
function flames(root, x, y, z, count) { for (let i = 0; i < count; i += 1) { const f = mesh(new THREE.ConeGeometry(0.18 + (i % 2) * 0.05, 0.65 + (i % 3) * 0.12, 7), i % 2 ? M.ember : M.flame); f.position.set(x - 0.35 + i * 0.24, y, z); f.name = 'old-lantern-flame'; root.add(f); } }
function bedrolls(root, count, x, z) { for (let i = 0; i < count; i += 1) { const r = mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.55, 10), i % 3 ? M.linen : M.red); r.rotation.z = Math.PI / 2; r.position.set(x + (i % 4) * 2.1, 0.35, z + Math.floor(i / 4) * 2); root.add(r); } }
function barricade(root, z) { for (let i = 0; i < 6; i += 1) box(root, 5.2, 0.28, 0.34, i % 2 ? M.oak : M.darkWood, 0, 0.7 + i * 0.35, z, (i % 2 ? 1 : -1) * 0.12); }
function debris(root, count, material) { for (let i = 0; i < count; i += 1) { const s = mesh(i % 3 ? new THREE.BoxGeometry(0.3, 0.14, 0.9) : new THREE.DodecahedronGeometry(0.28, 0), material); s.position.set((hash(`x${i}`) - 0.5) * 11, 0.22, (hash(`z${i}`) - 0.5) * 8); s.rotation.set(i * 0.23, i * 0.51, i * 0.17); root.add(s); } }
function box(root, w, h, d, material, x, y, z, rz = 0) { const n = mesh(new THREE.BoxGeometry(w, h, d), material); n.position.set(x, y, z); n.rotation.z = rz; root.add(n); return n; }
function cylinder(root, r, h, material, x, y, z) { const n = mesh(new THREE.CylinderGeometry(r, r, h, 12), material); n.position.set(x, y, z); root.add(n); return n; }
function plane(root, w, h, material, x, y, z) { const n = mesh(new THREE.PlaneGeometry(w, h), material); n.position.set(x, y, z); root.add(n); return n; }
function pulseSphere(root, x, y, z, material, r = 0.25, name = 'old-lantern-pulse') { const n = mesh(new THREE.SphereGeometry(r, 10, 7), material); n.position.set(x, y, z); n.name = name; root.add(n); return n; }
function mesh(geometry, material) { return new THREE.Mesh(geometry, material); }
function hash(v) { let h = 2166136261; for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; }
function mat(color, roughness = 0.8, metalness = 0, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }); }

const M = Object.freeze({ floor: mat(0x5f3f2a, .92), darkWood: mat(0x2e211a, .96), oak: mat(0x755037, .86), charred: mat(0x1d1817, 1), wall: mat(0x6d6862, .94), stone: mat(0x77736f, .9), stoneLight: mat(0x9b9387, .86), soot: mat(0x29272b, 1), iron: mat(0x444950, .62, .65), brass: mat(0xb78a43, .46, .62), copper: mat(0xa7643d, .5, .55), linen: mat(0xd1c5aa, .96), dirtyLinen: mat(0x7e7364, .98), red: mat(0x7a3540, .96), paper: mat(0xd6bf87, .92), leather: mat(0x68432e, .94), ceramic: mat(0xc8bfae, .72), greenGlass: mat(0x315d49, .35, .05, { transparent: true, opacity: .76 }), amberGlass: mat(0x925a2e, .38, .05, { transparent: true, opacity: .78 }), flame: mat(0xffc15e, .22, .02, { emissive: 0xff8b2b, emissiveIntensity: 1.4 }), ember: mat(0xd95d2c, .3, .02, { emissive: 0xa92c18, emissiveIntensity: 1.1 }), slime: mat(0x63956a, .58, .02, { emissive: 0x35683d, emissiveIntensity: .35 }), web: mat(0xd9d6cc, .4, 0, { transparent: true, opacity: .55 }), water: mat(0x4f8997, .22, .03, { transparent: true, opacity: .45 }), fungal: mat(0x557e67, .72, 0, { emissive: 0x294d42, emissiveIntensity: .35 }), map: mat(0xb8a678, .9) });
