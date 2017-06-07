"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodeCache = require("node-cache");
class BlobStore {
    static add(key, data) {
        let k = key.toString();
        return BlobStore.Cache.set(key, data);
    }
    static exists(key) {
        let k = key.toString();
        return BlobStore.Cache.keys().indexOf(k) >= 0;
    }
    static stats() {
        return BlobStore.Cache.getStats();
    }
    static get(key) {
        return BlobStore.Cache.get(key.toString());
    }
}
BlobStore.Cache = new NodeCache({ stdTTL /*seconds*/: 60 * 5 }); // TODO: Make expiration configurable
exports.BlobStore = BlobStore;
//# sourceMappingURL=blob-store.js.map