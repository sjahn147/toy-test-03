export class WorksitePresentationRenderer {
  constructor({ group, roomY, assets, cargoMeshes }) {
    this.group = group;
    this.roomY = roomY;
    this.assets = assets;
    this.cargoMeshes = cargoMeshes;
    this.scaffolds = new Map();
    this.signatures = new Map();
  }

  render(snapshot, time) {
    const rooms = new Map((snapshot.rooms ?? []).map(room => [room.id,