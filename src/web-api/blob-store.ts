import * as NodeCache from 'node-cache';

export class BlobStore {
    private static Cache = new NodeCache({ stdTTL/*seconds*/: 60 * 5 }); // TODO: Make expiration configurable

    public static add(key: string, data: Buffer): boolean {
        let k = key.toString();
        return BlobStore.Cache.set<Buffer>(key, data);
    }

    public static exists(key: string): boolean {
        let k = key.toString();
        return BlobStore.Cache.keys().indexOf(k) >= 0;
    }

    public static stats(): NodeCache.Stats {
        return BlobStore.Cache.getStats();
    }

    public static get(key: string): Buffer {
        return BlobStore.Cache.get<Buffer>(key.toString());
    }
}