const THREE_VERSION = '0.165.0';
const GLTF_LOADER_URL = `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js`;
const KTX2_LOADER_URL = `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/KTX2Loader.js`;
const SKELETON_UTILS_URL = `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/utils/SkeletonUtils.js`;
const MESHOPT_URL = 'https://unpkg.com/meshoptimizer@0.20.0/meshopt_decoder.module.js';

/**
 * Optional authored-asset path. The synchronous procedural skinned factory remains
 * the production fallback until Blender-authored GLB files are added to assets/.
 */
export class AdventurerGLTFAssetCache {
  constructor({ renderer = null, transcoderPath = 'https://unpkg.com/three@0.165.0/examples/jsm/libs/basis/' } = {}) {
    this.renderer = renderer;
    this.transcoderPath = transcoderPath;
    this.records = new Map();
    this.loaderPromise = null;
    this.clonePromise = null;
  }

  async preload(id, url) {
    if (!id || !url) throw new Error('adventurer asset preload requires id and url');
    if (this.records.has(id)) return this.records.get(id);
    const promise = this.load(url).catch(error => {
      this.records.delete(id);
      throw error;
    });
    this.records.set(id, promise);
    return promise;
  }

  has(id) {
    return this.records.has(id);
  }

  async instantiate(id) {
    const record = this.records.get(id);
    if (!record) return null;
    const gltf = await record;
    const clone = await this.cloneFunction();
    return {
      scene: clone(gltf.scene),
      animations: [...(gltf.animations ?? [])],
      parser: gltf.parser,
      userData: { ...(gltf.userData ?? {}) }
    };
  }

  clear() {
    this.records.clear();
  }

  async load(url) {
    const loader = await this.loader();
    return loader.loadAsync(url);
  }

  async loader() {
    if (!this.loaderPromise) {
      this.loaderPromise = Promise.all([
        import(GLTF_LOADER_URL),
        import(KTX2_LOADER_URL),
        import(MESHOPT_URL)
      ]).then(([gltfModule, ktxModule, meshoptModule]) => {
        const loader = new gltfModule.GLTFLoader();
        const meshoptDecoder = meshoptModule.MeshoptDecoder ?? meshoptModule.default ?? meshoptModule;
        loader.setMeshoptDecoder(meshoptDecoder);
        if (this.renderer) {
          const ktx2 = new ktxModule.KTX2Loader();
          ktx2.setTranscoderPath(this.transcoderPath);
          ktx2.detectSupport(this.renderer);
          loader.setKTX2Loader(ktx2);
        }
        return loader;
      });
    }
    return this.loaderPromise;
  }

  async cloneFunction() {
    if (!this.clonePromise) {
      this.clonePromise = import(SKELETON_UTILS_URL).then(module => module.clone);
    }
    return this.clonePromise;
  }
}
