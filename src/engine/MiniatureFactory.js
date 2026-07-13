import { THREE } from './ThreeScene.js';
import { getMiniatureRecipe } from '../miniatures/recipes.js';
import { MINIATURE_SOCKETS, PART_SLOT_ORDER, getPartDefinition } from '../miniatures/partCatalog.js';
import { createEliteMiniature } from '../miniatures/EliteMiniatureFactory.js';
import { createHeroMiniature } from './heroes/HeroMiniatureFactory.js';

const SOCKET_LAYOUTS = {
  humanoid: MINIATURE_SOCKETS,
  goblin: {
    ...MINIATURE_SOCKETS,
    pelvis: { position: [0, 0.48, 0] },
    chest: { position: [0, 0.94, 0] },
    head: { position: [0, 1.34, 0] },
    headTop: { position: [0, 1.67, 0] },
    handL: { position: [-0.46, 0.8, 0] },
    handR: { position: [0.46, 0.8, 0] },
    back: { position: [0, 1.0, -0.22] },
    waistFront: { position: [0, 0.62, 0.22] },
    waistBack: { position: [0, 0.62, -0.22] }
  },
  skeleton: MINIATURE_SOCKETS,
  slime: {
    root: { position: [0, 0, 0] },
    baseFx: { position: [0, 0.08, 0] }
  },
  mimic: {
    root: { position: [0, 0, 0] },
    baseFx: { position: [0, 0.08, 0] }
  }
};

export class MiniatureFactory {
  constructor() {
    this.geometryCache = new Map();
    this.materialCache = new Map();
  }

  create(agent) {
    const hero = createHeroMiniature(agent);
    if (hero) return hero;
    const elite = createEliteMiniature(agent);
    if (elite) return elite;
    const recipe = getMiniatureRecipe(agent.role);
    const root = new THREE.Group();
    root.name = `miniature:${recipe.id}`;
    root.userData.recipeId = recipe.id;
    root.userData.role = agent.role;

    const model = new THREE.Group();
    model.name = 'miniature-model';
    model.scale.setScalar(recipe.scale ?? 0.72);
    root.add(model);

    const sockets = this.createSockets(model, recipe.skeleton);
    this.buildBaseBody(model, sockets, recipe);
    this.attachRecipeParts(sockets, recipe);
    this.addIndicators(root, agent);

    return root;
  }

  createSockets(model, skeletonType) {
    const layout = SOCKET_LAYOUTS[skeletonType] ?? SOCKET_LAYOUTS.humanoid;
    const sockets = {};
    for (const [name, config] of Object.entries(layout)) {
      const socket = new THREE.Group();
      socket.name = `socket_${name}`;
      socket.position.set(...config.position);
      model.add(socket);
      sockets[name] = socket;
    }
    return sockets;
  }

  buildBaseBody(model, sockets, recipe) {
    if (recipe.skeleton === 'slime' || recipe.skeleton === 'mimic') return;
    if (recipe.skeleton === 'skeleton') {
      this.buildSkeletonBody(model, recipe);
      return;
    }

    const goblin = recipe.skeleton === 'goblin';
    const proportions = recipe.proportions ?? {};
    const skin = this.material(recipe, 'skin', { roughness: 0.65 });
    const dark = this.material(recipe, 'dark', { roughness: 0.82 });
    const cloth = this.material(recipe, 'cloth', { roughness: 0.72 });
    const shoulderScale = proportions.shoulders ?? 1;
    const legScale = proportions.legs ?? 1;

    const pelvis = this.mesh('base:pelvis', () => new THREE.BoxGeometry(0.48, 0.3, 0.34), cloth);
    pelvis.position.set(0, goblin ? 0.5 : 0.58, 0);
    model.add(pelvis);

    const torso = this.mesh('base:torso', () => new THREE.CapsuleGeometry(0.3, goblin ? 0.38 : 0.48, 4, 8), cloth);
    torso.scale.x = shoulderScale;
    torso.position.set(0, goblin ? 0.91 : 1.08, 0);
    model.add(torso);

    for (const side of [-1, 1]) {
      const leg = this.mesh('base:leg', () => new THREE.CapsuleGeometry(0.11, 0.5, 3, 6), cloth);
      leg.scale.y = legScale;
      leg.position.set(side * 0.16, goblin ? 0.27 : 0.3, 0);
      model.add(leg);

      const boot = this.mesh('base:boot', () => new THREE.BoxGeometry(0.22, 0.16, 0.34), dark);
      boot.position.set(side * 0.16, 0.04, 0.08);
      model.add(boot);

      const arm = this.mesh('base:arm', () => new THREE.CapsuleGeometry(0.09, 0.45, 3, 6), cloth);
      arm.position.set(side * 0.38 * shoulderScale, goblin ? 0.9 : 1.05, 0);
      arm.rotation.z = side * -0.14;
      model.add(arm);

      const hand = this.mesh('base:hand', () => new THREE.SphereGeometry(0.12, 8, 6), skin);
      hand.position.set(side * 0.47 * shoulderScale, goblin ? 0.68 : 0.79, 0);
      model.add(hand);
    }
  }

  buildSkeletonBody(model, recipe) {
    const bone = this.material(recipe, 'skin', { roughness: 0.58 });
    const dark = this.material(recipe, 'dark', { roughness: 0.86 });

    const pelvis = this.mesh('skeleton:pelvis', () => new THREE.BoxGeometry(0.36, 0.18, 0.22), bone);
    pelvis.position.set(0, 0.56, 0);
    model.add(pelvis);

    const spine = this.mesh('skeleton:spine', () => new THREE.CylinderGeometry(0.055, 0.065, 0.65, 6), bone);
    spine.position.set(0, 0.96, 0);
    model.add(spine);

    for (const side of [-1, 1]) {
      const leg = this.mesh('skeleton:longbone', () => new THREE.CylinderGeometry(0.045, 0.055, 0.62, 6), bone);
      leg.position.set(side * 0.13, 0.28, 0);
      model.add(leg);

      const foot = this.mesh('skeleton:foot', () => new THREE.BoxGeometry(0.16, 0.08, 0.28), dark);
      foot.position.set(side * 0.13, 0.02, 0.08);
      model.add(foot);

      const arm = this.mesh('skeleton:armbone', () => new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6), bone);
      arm.position.set(side * 0.34, 1.02, 0);
      arm.rotation.z = side * -0.12;
      model.add(arm);
    }
  }

  attachRecipeParts(sockets, recipe) {
    for (const slotName of PART_SLOT_ORDER) {
      const partId = recipe.parts?.[slotName];
      if (!partId) continue;
      const definition = getPartDefinition(partId);
      if (!definition) {
        console.warn(`[MiniatureFactory] Unknown part: ${partId}`);
        continue;
      }
      const socket = sockets[definition.slot];
      if (!socket) continue;
      const builder = this[definition.builder];
      if (typeof builder !== 'function') {
        console.warn(`[MiniatureFactory] Missing builder: ${definition.builder}`);
        continue;
      }
      const part = builder.call(this, recipe, definition);
      if (!part) continue;
      part.name = partId;
      socket.add(part);
    }
  }

  addIndicators(root, agent) {
    const ring = this.mesh(
      'ui:ring',
      () => new THREE.TorusGeometry(0.46, 0.035, 6, 24),
      new THREE.MeshBasicMaterial({ color: agent.faction === 'party' ? 0x88c7ff : 0xff8e73 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.34;
    root.add(ring);

    const hpBack = this.mesh('ui:hp-back', () => new THREE.BoxGeometry(0.76, 0.065, 0.04), new THREE.MeshBasicMaterial({ color: 0x330b0b }));
    hpBack.position.set(0, 1.72, 0);
    root.add(hpBack);

    const hp = this.mesh('ui:hp', () => new THREE.BoxGeometry(0.76, 0.07, 0.05), new THREE.MeshBasicMaterial({ color: 0x9ee0a3 }));
    hp.name = 'hp';
    hp.position.set(0, 1.72, 0.01);
    root.add(hp);
  }

  headRound(recipe) {
    const group = new THREE.Group();
    const head = this.mesh('part:head-round', () => new THREE.SphereGeometry(0.34, 12, 9), this.material(recipe, 'skin'));
    head.scale.y = recipe.proportions?.head ?? 1;
    group.add(head, this.makeEyes(recipe, 0.22, 0.03));
    return group;
  }

  headRoundSoft(recipe) {
    const group = this.headRound(recipe);
    group.scale.x = 1.05;
    return group;
  }

  headSquare(recipe) {
    const group = new THREE.Group();
    const head = this.mesh('part:head-square', () => new THREE.BoxGeometry(0.58, 0.58, 0.54), this.material(recipe, 'skin'));
    head.scale.y = recipe.proportions?.head ?? 1;
    group.add(head, this.makeEyes(recipe, 0.22, 0.04));
    return group;
  }

  headGoblin(recipe) {
    const group = new THREE.Group();
    const head = this.mesh('part:head-goblin', () => new THREE.SphereGeometry(0.36, 10, 7), this.material(recipe, 'skin'));
    head.scale.set(1.08, recipe.proportions?.head ?? 1.1, 0.9);
    group.add(head, this.makeEyes(recipe, 0.24, 0.06));
    return group;
  }

  headSkull(recipe) {
    const group = new THREE.Group();
    const skull = this.mesh('part:head-skull', () => new THREE.SphereGeometry(0.31, 10, 7), this.material(recipe, 'skin'));
    const jaw = this.mesh('part:jaw', () => new THREE.BoxGeometry(0.35, 0.14, 0.26), this.material(recipe, 'skin'));
    jaw.position.set(0, -0.22, 0.03);
    const eyes = this.makeEyes(recipe, 0.2, 0.05, true);
    group.add(skull, jaw, eyes);
    return group;
  }

  helmetRound(recipe) {
    const group = new THREE.Group();
    const dome = this.mesh('part:helmet-dome', () => new THREE.SphereGeometry(0.38, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), this.material(recipe, 'metal', { metalness: 0.32, roughness: 0.36 }));
    dome.position.y = -0.02;
    const nose = this.mesh('part:helmet-nose', () => new THREE.BoxGeometry(0.07, 0.32, 0.08), this.material(recipe, 'metal', { metalness: 0.32 }));
    nose.position.set(0, -0.12, 0.32);
    group.add(dome, nose);
    return group;
  }

  hoodRogue(recipe) {
    const hood = this.mesh('part:hood', () => new THREE.ConeGeometry(0.42, 0.58, 7), this.material(recipe, 'leather'));
    hood.position.y = 0.05;
    return hood;
  }

  clericBand(recipe) {
    const band = this.mesh('part:cleric-band', () => new THREE.TorusGeometry(0.34, 0.04, 6, 20), this.material(recipe, 'accent'));
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.12;
    return band;
  }

  wizardHat(recipe) {
    const group = new THREE.Group();
    const brim = this.mesh('part:wizard-brim', () => new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), this.material(recipe, 'cloth'));
    const cone = this.mesh('part:wizard-cone', () => new THREE.ConeGeometry(0.31, 0.9, 10), this.material(recipe, 'cloth'));
    cone.position.y = 0.47;
    cone.rotation.z = -0.12;
    group.add(brim, cone);
    return group;
  }

  goblinCap(recipe) {
    const cap = this.mesh('part:goblin-cap', () => new THREE.ConeGeometry(0.3, 0.48, 6), this.material(recipe, 'cloth'));
    cap.position.set(0.05, 0.14, 0);
    cap.rotation.z = -0.3;
    return cap;
  }

  torsoChain(recipe) {
    const group = new THREE.Group();
    const armor = this.mesh('part:torso-chain', () => new THREE.BoxGeometry(0.68, 0.68, 0.46), this.material(recipe, 'metal', { metalness: 0.25, roughness: 0.48 }));
    const collar = this.mesh('part:collar', () => new THREE.TorusGeometry(0.25, 0.05, 6, 14), this.material(recipe, 'accent'));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.3;
    group.add(armor, collar);
    return group;
  }

  torsoLeather(recipe) {
    const group = new THREE.Group();
    const vest = this.mesh('part:torso-leather', () => new THREE.BoxGeometry(0.58, 0.66, 0.42), this.material(recipe, 'leather'));
    const straps = this.mesh('part:cross-straps', () => new THREE.BoxGeometry(0.08, 0.8, 0.05), this.material(recipe, 'accent'));
    straps.rotation.z = 0.55;
    straps.position.z = 0.23;
    group.add(vest, straps);
    return group;
  }

  torsoRobeCleric(recipe) {
    const group = new THREE.Group();
    const robe = this.mesh('part:robe-cleric', () => new THREE.ConeGeometry(0.43, 0.9, 8), this.material(recipe, 'cloth'));
    robe.position.y = -0.12;
    const tabard = this.mesh('part:tabard', () => new THREE.BoxGeometry(0.2, 0.72, 0.05), this.material(recipe, 'accent'));
    tabard.position.set(0, -0.05, 0.36);
    group.add(robe, tabard);
    return group;
  }

  torsoRobeMage(recipe) {
    const group = this.torsoRobeCleric(recipe);
    const collar = this.mesh('part:mage-collar', () => new THREE.ConeGeometry(0.3, 0.3, 8, 1, true), this.material(recipe, 'dark'));
    collar.position.y = 0.33;
    group.add(collar);
    return group;
  }

  torsoGoblinRags(recipe) {
    const rags = this.mesh('part:goblin-rags', () => new THREE.ConeGeometry(0.39, 0.7, 7), this.material(recipe, 'cloth'));
    rags.position.y = -0.08;
    rags.rotation.y = 0.2;
    return rags;
  }

  torsoBoneRib(recipe) {
    const group = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const rib = this.mesh('part:rib', () => new THREE.TorusGeometry(0.24, 0.025, 5, 12, Math.PI), this.material(recipe, 'skin'));
      rib.rotation.z = Math.PI / 2;
      rib.position.y = i * 0.09;
      group.add(rib);
    }
    return group;
  }

  torsoSlimeBlob(recipe) {
    const group = new THREE.Group();
    const blob = this.mesh('part:slime-blob', () => new THREE.SphereGeometry(0.62, 16, 10), this.material(recipe, 'skin', { transparent: true, opacity: 0.72, roughness: 0.18 }));
    blob.scale.set(1.1, 0.78, 1);
    blob.position.y = 0.48;
    const core = this.mesh('part:slime-core', () => new THREE.SphereGeometry(0.15, 10, 8), this.material(recipe, 'dark', { roughness: 0.24 }));
    core.position.set(0.12, 0.52, 0.12);
    group.add(blob, core);
    return group;
  }

  torsoMimicBody(recipe) {
    const group = new THREE.Group();
    const chest = this.mesh('part:mimic-chest', () => new THREE.BoxGeometry(1.0, 0.68, 0.76), this.material(recipe, 'leather'));
    chest.position.y = 0.42;
    const lid = this.mesh('part:mimic-lid', () => new THREE.BoxGeometry(1.04, 0.22, 0.8), this.material(recipe, 'metal', { metalness: 0.08 }));
    lid.position.set(0, 0.85, -0.04);
    lid.rotation.x = -0.18;
    group.add(chest, lid);
    return group;
  }

  capeShort(recipe) {
    const cape = this.mesh('part:cape-short', () => new THREE.ConeGeometry(0.42, 0.82, 8, 1, true), this.material(recipe, 'cloth'));
    cape.rotation.x = Math.PI;
    cape.position.set(0, -0.22, -0.08);
    cape.scale.z = 0.35;
    return cape;
  }

  quiver(recipe) {
    const group = new THREE.Group();
    const tube = this.mesh('part:quiver', () => new THREE.CylinderGeometry(0.1, 0.13, 0.72, 8), this.material(recipe, 'leather'));
    tube.rotation.z = -0.3;
    tube.position.set(0.16, -0.05, 0);
    group.add(tube);
    return group;
  }

  relicPack(recipe) {
    const group = new THREE.Group();
    const pack = this.mesh('part:relic-pack', () => new THREE.BoxGeometry(0.48, 0.55, 0.24), this.material(recipe, 'leather'));
    const seal = this.mesh('part:relic-seal', () => new THREE.CylinderGeometry(0.11, 0.11, 0.04, 10), this.material(recipe, 'accent'));
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0, 0, -0.14);
    group.add(pack, seal);
    return group;
  }

  spellbook(recipe) {
    const book = this.mesh('part:spellbook', () => new THREE.BoxGeometry(0.46, 0.58, 0.14), this.material(recipe, 'leather'));
    book.rotation.z = -0.08;
    return book;
  }

  beltPlain(recipe) {
    const belt = this.mesh('part:belt', () => new THREE.TorusGeometry(0.29, 0.045, 6, 16), this.material(recipe, 'leather'));
    belt.rotation.x = Math.PI / 2;
    return belt;
  }

  pouchRogue(recipe) {
    const group = new THREE.Group();
    for (const x of [-0.2, 0.2]) {
      const pouch = this.mesh('part:pouch', () => new THREE.BoxGeometry(0.22, 0.26, 0.16), this.material(recipe, 'leather'));
      pouch.position.x = x;
      group.add(pouch);
    }
    return group;
  }

  scrollCase(recipe) {
    const tube = this.mesh('part:scroll-case', () => new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8), this.material(recipe, 'leather'));
    tube.rotation.z = Math.PI / 2;
    return tube;
  }

  pouchSmall(recipe) {
    return this.mesh('part:pouch-small', () => new THREE.BoxGeometry(0.22, 0.24, 0.16), this.material(recipe, 'leather'));
  }

  swordLong(recipe) {
    return this.makeBladeWeapon(recipe, 0.92, 0.12, false);
  }

  swordShort(recipe) {
    return this.makeBladeWeapon(recipe, 0.68, 0.1, false);
  }

  dagger(recipe) {
    return this.makeBladeWeapon(recipe, 0.46, 0.09, false);
  }

  daggerReverse(recipe) {
    const dagger = this.makeBladeWeapon(recipe, 0.46, 0.09, true);
    dagger.rotation.z = Math.PI;
    return dagger;
  }

  mace(recipe) {
    const group = new THREE.Group();
    const shaft = this.mesh('part:mace-shaft', () => new THREE.CylinderGeometry(0.045, 0.05, 0.7, 7), this.material(recipe, 'leather'));
    shaft.position.y = 0.22;
    const head = this.mesh('part:mace-head', () => new THREE.DodecahedronGeometry(0.18, 0), this.material(recipe, 'metal', { metalness: 0.3 }));
    head.position.y = 0.62;
    group.add(shaft, head);
    return group;
  }

  staff(recipe) {
    const group = new THREE.Group();
    const shaft = this.mesh('part:staff-shaft', () => new THREE.CylinderGeometry(0.045, 0.055, 1.35, 8), this.material(recipe, 'leather'));
    shaft.position.y = 0.22;
    const gem = this.mesh('part:staff-gem', () => new THREE.OctahedronGeometry(0.16, 0), this.material(recipe, 'accent', { emissive: true }));
    gem.position.y = 0.94;
    group.add(shaft, gem);
    return group;
  }

  boneClub(recipe) {
    const club = this.mesh('part:bone-club', () => new THREE.CapsuleGeometry(0.08, 0.72, 3, 6), this.material(recipe, 'skin'));
    club.position.y = 0.2;
    club.rotation.z = -0.2;
    return club;
  }

  shieldRound(recipe) {
    const group = new THREE.Group();
    const shield = this.mesh('part:shield', () => new THREE.CylinderGeometry(0.34, 0.34, 0.09, 14), this.material(recipe, 'metal', { metalness: 0.25 }));
    shield.rotation.x = Math.PI / 2;
    shield.rotation.z = Math.PI / 2;
    const boss = this.mesh('part:shield-boss', () => new THREE.SphereGeometry(0.1, 8, 6), this.material(recipe, 'accent'));
    boss.position.z = 0.08;
    group.add(shield, boss);
    return group;
  }

  book(recipe) {
    const group = new THREE.Group();
    const cover = this.mesh('part:book', () => new THREE.BoxGeometry(0.36, 0.46, 0.12), this.material(recipe, 'leather'));
    const page = this.mesh('part:page', () => new THREE.BoxGeometry(0.29, 0.4, 0.13), this.material(recipe, 'accent'));
    group.add(cover, page);
    group.rotation.z = 0.2;
    return group;
  }

  focusOrb(recipe) {
    const orb = this.mesh('part:focus-orb', () => new THREE.SphereGeometry(0.18, 12, 8), this.material(recipe, 'accent', { transparent: true, opacity: 0.86, emissive: true }));
    return orb;
  }

  haloSmall(recipe) {
    const halo = this.mesh('part:halo', () => new THREE.TorusGeometry(0.34, 0.025, 6, 22), this.material(recipe, 'accent', { emissive: true }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.25;
    return halo;
  }

  arcaneRing(recipe) {
    const ring = this.mesh('part:arcane-ring', () => new THREE.TorusGeometry(0.52, 0.025, 6, 28), this.material(recipe, 'accent', { transparent: true, opacity: 0.7, emissive: true }));
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  goblinEars(recipe) {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const ear = this.mesh('part:goblin-ear', () => new THREE.ConeGeometry(0.11, 0.42, 5), this.material(recipe, 'skin'));
      ear.rotation.z = side * -Math.PI / 2;
      ear.position.x = side * 0.4;
      group.add(ear);
    }
    return group;
  }

  slimeBubbles(recipe) {
    const group = new THREE.Group();
    const positions = [[-0.28, 0.84, 0.08], [0.25, 0.7, -0.12], [0.05, 1.02, 0.02]];
    for (const [x, y, z] of positions) {
      const bubble = this.mesh('part:slime-bubble', () => new THREE.SphereGeometry(0.11, 8, 6), this.material(recipe, 'accent', { transparent: true, opacity: 0.65 }));
      bubble.position.set(x, y, z);
      group.add(bubble);
    }
    return group;
  }

  mimicTeeth(recipe) {
    const group = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const tooth = this.mesh('part:mimic-tooth', () => new THREE.ConeGeometry(0.07, 0.22, 5), this.material(recipe, 'accent'));
      tooth.position.set(i * 0.12, 0.68, 0.42);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
    return group;
  }

  makeBladeWeapon(recipe, length, width, reverse) {
    const group = new THREE.Group();
    const blade = this.mesh(`part:blade:${length}`, () => new THREE.ConeGeometry(width, length, 4), this.material(recipe, 'metal', { metalness: 0.35, roughness: 0.28 }));
    blade.position.y = reverse ? -length * 0.32 : length * 0.38;
    if (reverse) blade.rotation.z = Math.PI;
    const guard = this.mesh('part:guard', () => new THREE.BoxGeometry(0.28, 0.06, 0.08), this.material(recipe, 'accent'));
    const grip = this.mesh('part:grip', () => new THREE.CylinderGeometry(0.045, 0.05, 0.28, 7), this.material(recipe, 'leather'));
    grip.position.y = reverse ? 0.16 : -0.16;
    group.add(blade, guard, grip);
    group.rotation.z = -0.15;
    return group;
  }

  makeEyes(recipe, spacing, y, hollow = false) {
    const group = new THREE.Group();
    const material = hollow
      ? this.material(recipe, 'dark', { roughness: 1 })
      : new THREE.MeshBasicMaterial({ color: 0x19151a });
    for (const side of [-1, 1]) {
      const eye = this.mesh('part:eye', () => new THREE.SphereGeometry(0.045, 7, 5), material);
      eye.position.set(side * spacing / 2, y, 0.31);
      group.add(eye);
    }
    return group;
  }

  mesh(key, createGeometry, material) {
    let geometry = this.geometryCache.get(key);
    if (!geometry) {
      geometry = createGeometry();
      this.geometryCache.set(key, geometry);
    }
    return new THREE.Mesh(geometry, material);
  }

  material(recipe, token, options = {}) {
    const color = recipe.palette?.[token] ?? 0xffffff;
    const key = `${token}:${color}:${JSON.stringify(options)}`;
    let material = this.materialCache.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.62,
        metalness: options.metalness ?? 0.02,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        emissive: options.emissive ? color : 0x000000,
        emissiveIntensity: options.emissive ? 0.42 : 0
      });
      this.materialCache.set(key, material);
    }
    return material;
  }
}
