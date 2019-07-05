const RegionFile = require('./region')

module.exports = loader

let versionCache = {};
function loader (mcVersion) {
  if (versionCache[mcVersion] === undefined) {
    let versioned = require('./chunk')(mcVersion);

    versionCache[mcVersion] = class extends Anvil {
      constructor(path) {
        super(path, versioned);
      }
    };
    Object.defineProperty (versionCache[mcVersion], "name", {value: `Anvil_${mcVersion.replace(/\./g, "_")}`});
  }
  return versionCache[mcVersion];
}

class Anvil {
  constructor (path, versioned) {
    this.regions = {}
    this.path = path
    this._versioned = versioned;
  }

  regionFileName (x, z) {
    const region = { x: x >> 5, z: z >> 5 }
    return this.path + '/r.' + region.x + '.' + region.z + '.mca'
  }

  async getRegion (x, z) {
    if (typeof x !== 'number' || typeof z !== 'number') {
      throw new Error('Missing x or z arguments.')
    }
    const name = this.regionFileName(x, z)
    let region = this.regions[name]
    if (region === undefined) {
      region = new RegionFile(name)
      this.regions[name] = region
      await region.initialize()
    }
    return region
  }

  // returns a Promise. Resolve a Chunk object or reject if it hasn’t been generated
  async load (x, z) {
    const data = await this.loadRaw(x, z)
    if (data == null) { return null }
    return this._versioned.nbtChunkToPrismarineChunk(data)
  }

  async loadRaw (x, z) {
    const region = await this.getRegion(x, z)
    return region.read(x & 0x1F, z & 0x1F)
  }

  // returns a Promise. Resolve an empty object when successful
  async save (x, z, chunk) {
    await this.saveRaw(x, z, this._versioned.prismarineChunkToNbt(chunk))
  }

  async saveRaw (x, z, nbt) {
    let region = await this.getRegion(x, z)
    await region.write(x & 0x1F, z & 0x1F, nbt)
  }
}
