import { cloneSleepingCitadelSpawnNetwork } from './SleepingCitadelSpawnNetwork.js';

export function getCampaignSpawnNetwork(manifest) {
  if (!manifest || manifest.id !== 'sleeping-citadel') return null;
  const network = cloneSleepingCitadelSpawnNetwork();
  validateSpawnNetwork(manifest, network);
  return network;
}

export function validateSpawnNetwork(manifest, network) {
  const roomIds = new Set((manifest.rooms ?? []).map(room => room.id));
  if (!network?.enabled) throw new Error('Sleeping Citadel spawn network must be enabled');
  if (Object.keys(network.socketsByRoom ?? {}).length !== roomIds.size) {
    throw new Error('spawn network must cover every authored room');
  }
  for (const roomId of roomIds) {
    const sockets = network.socketsByRoom?.[roomId];
    if (!Array.isArray(sockets) || sockets.length < 1) throw new Error(`spawn network has no socket for ${roomId}`);
  }
  const siteIds = new Set();
  for (const site of network.sites ?? []) {
    if (!site.id || siteIds.has(site.id)) throw new Error(`duplicate or missing spawn site id ${site.id}`);
    siteIds.add(site.id);
    if (!roomIds.has(site.roomId)) throw new Error(`spawn site ${site.id} references unknown room ${site.roomId}`);
    if (!(network.socketsByRoom?.[site.roomId] ?? []).some(socket => socket.id === site.socketId)) {
      throw new Error(`spawn site ${site.id} references unknown socket ${site.socketId}`);
    }
  }
  const active = (network.sites ?? []).filter(site => site.state === 'active').length;
  if (active > (network.globalActiveSiteCap ?? 28)) throw new Error('initial active spawn sites exceed the global cap');
  return true;
}
