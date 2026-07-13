import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';
const root=await mkdtemp(join(tmpdir(),'wp8e-factory-'));
await mkdir(join(root,'src/engine/heroes'),{recursive:true});await mkdir(join(root,'src/content/heroes'),{recursive:true});
await writeFile(join(root,'package.json'),JSON.stringify({type:'module'}));await writeFile(join(root,'src/engine/ThreeScene.js'),THREE_STUB);
await copyFile(new URL('../src/engine/heroes/HeroMiniatureFactory.js',import.meta.url),join(root,'src/engine/heroes/HeroMiniatureFactory.js'));
await copyFile(new URL('../src/content/heroes/HeroDefinitions.js',import.meta.url),join(root,'src/content/heroes/HeroDefinitions.js'));
const {createHeroMiniature}=await import(`${pathToFileURL(join(root,'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${Date.now()}`);
const cases=[
 ['hero.pev','hero-pev',12,['blobRoot','artifactOrbit','metalPlateL','fungalCap','spectralTail']],
 ['hero.eighth-cocoon','hero-eighth-cocoon',45,['thorax','abdomen','knightChest','lanceRoot','shieldRoot','silkRig']],
 ['hero.empty-queen-hand','hero-empty-queen-hand',40,['sacRoot','crownRoot','carrier0','carrier4','egg0']],
 ['hero.failed-successor','hero-failed-successor',25,['mask','shadow','parasiteFace','extraArms','seal']],
 ['hero.sleeping-gardener','hero-sleeping-gardener',45,['trunk','gardenBed','rootLeg0','rootLeg3','hookL','crown']],
 ['hero.goldcrown-back','hero-goldcrown-back',50,['body0','body3','rakeL','rakeR','trophies','crown']]
];
for(const [id,role,min,joints] of cases){const mesh=createHeroMiniature({id:`a-${role}`,heroId:id,role,faction:'dungeon',hp:100,maxHp:100});assert.ok(mesh);assert.equal(mesh.userData.articulated,true);assert.ok(mesh.userData.heroMeshCount>=min,`${id} mesh count ${mesh.userData.heroMeshCount}`);for(const j of joints)assert.ok(mesh.userData.joints[j],`${id} missing ${j}`);assert.ok(mesh.getObjectByName('hero-ring'));}
for(const kind of ['spiderling','royal-spiderling','parasite-echo']){const mesh=createHeroMiniature({id:`s-${kind}`,role:kind,heroSummonKind:kind});assert.ok(mesh);assert.equal(mesh.userData.heroSummonKind,kind);assert.ok(mesh.userData.heroMeshCount>=8,`${kind} density`);}
console.log('WP8-E final hero factory smoke passed');
