/* Persistence: boards, image assets and preferences live in IndexedDB on this device only.
   If the browser blocks IndexedDB (some private modes), everything still works for the visit and the UI says so. */
(function () {
"use strict";
const VB = window.VB;
const DB_NAME = "vision-studio", VER = 1;
let db = null;
const mem = { boards: new Map(), assets: new Map(), prefs: new Map() };

VB.db = {
  ok: false,
  open() {
    return new Promise(res => {
      if (!window.indexedDB) return res(false);
      let req;
      try { req = indexedDB.open(DB_NAME, VER); } catch (e) { return res(false); }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("boards")) d.createObjectStore("boards", { keyPath: "id" });
        if (!d.objectStoreNames.contains("assets")) d.createObjectStore("assets", { keyPath: "id" });
        if (!d.objectStoreNames.contains("prefs")) d.createObjectStore("prefs", { keyPath: "k" });
      };
      req.onsuccess = () => { db = req.result; VB.db.ok = true; res(true); };
      req.onerror = () => res(false);
      req.onblocked = () => res(false);
    });
  },
  _tx(store, mode, fn) {
    return new Promise((res, rej) => {
      if (!db) return rej(new Error("no db"));
      const t = db.transaction(store, mode), s = t.objectStore(store);
      let out; const r = fn(s);
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error("aborted"));
    });
  },
  async put(store, val) { if (!db) { mem[store].set(val.id || val.k, val); return; } return this._tx(store, "readwrite", s => s.put(val)); },
  async get(store, key) { if (!db) return mem[store].get(key); return this._tx(store, "readonly", s => s.get(key)); },
  async all(store) { if (!db) return Array.from(mem[store].values()); return this._tx(store, "readonly", s => s.getAll()); },
  async del(store, key) { if (!db) { mem[store].delete(key); return; } return this._tx(store, "readwrite", s => s.delete(key)); },

  putBoard(b) { return this.put("boards", b); },
  getBoard(id) { return this.get("boards", id); },
  listBoards() { return this.all("boards").then(l => l.sort((a, b) => b.updated - a.updated)); },
  delBoard(id) { return this.del("boards", id); },
  putAsset(a) { return this.put("assets", a); },
  getAsset(id) { return this.get("assets", id); },
  allAssets() { return this.all("assets"); },
  delAsset(id) { return this.del("assets", id); },
  async getPref(k, def) { try { const r = await this.get("prefs", k); return r ? r.v : def; } catch (e) { return def; } },
  setPref(k, v) { return this.put("prefs", { k, v }).catch(() => {}); }
};

/* ---------- in-memory asset table (object URLs for the live canvas) ---------- */
VB.assets = new Map();
VB.assetUrl = id => { const a = VB.assets.get(id); return a ? a.url : ""; };
VB.addAssetRecord = rec => {
  if (rec.blob && !rec.url) rec.url = URL.createObjectURL(rec.blob);
  VB.assets.set(rec.id, rec);
  return rec;
};
VB.loadAsset = async id => {
  if (!id || VB.assets.has(id)) return VB.assets.get(id);
  if (VB.sampleIds && VB.sampleIds.includes(id) && VB.makeSample) return VB.makeSample(id);
  const r = await VB.db.getAsset(id).catch(() => null);
  if (r) return VB.addAssetRecord(r);
  return null;
};
VB.assetIdsOf = elements => {
  const s = new Set();
  elements.forEach(e => { (e.cells || []).forEach(c => c && c.a && s.add(c.a)); if (e.asset) s.add(e.asset); });
  return Array.from(s);
};
VB.assetDataURL = id => new Promise((res, rej) => {
  const a = VB.assets.get(id);
  if (!a || !a.blob) return rej(new Error("missing image"));
  const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(a.blob);
});

/* Decode, downscale and store an image. Returns the asset record. Throws a human-readable Error. */
VB.addImageBlob = async (blob, opts) => {
  opts = opts || {};
  if (!blob || !/^image\//.test(blob.type || "")) throw new Error("that file is not an image the browser can read");
  if (blob.size > 40e6) throw new Error("that image is over 40 MB; try a smaller one");
  let bmp;
  try { bmp = await createImageBitmap(blob); }
  catch (e) {
    bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("the browser could not decode that image")); i.src = URL.createObjectURL(blob); });
  }
  const iw = bmp.width, ih = bmp.height, max = opts.max || 2200, k = Math.min(1, max / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const png = /png|gif|webp|svg/.test(blob.type) || opts.alpha;
  let out = blob;
  if (k < 1 || !/jpeg|png|webp/.test(blob.type) || blob.size > 2.5e6) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.drawImage(bmp, 0, 0, w, h);
    out = await new Promise(r => c.toBlob(r, png ? "image/png" : "image/jpeg", 0.9));
    if (!out) throw new Error("could not shrink that image");
  }
  const rec = { id: "a" + VB.uid(), blob: out, w, h, name: opts.name || blob.name || "photo", credit: opts.credit || "", alpha: !!png };
  VB.addAssetRecord(rec);
  await VB.db.putAsset({ id: rec.id, blob: rec.blob, w: rec.w, h: rec.h, name: rec.name, credit: rec.credit, alpha: rec.alpha });
  return rec;
};

VB.addImageFromUrl = async (url, opts) => {
  let res;
  try { res = await fetch(url, { mode: "cors" }); }
  catch (e) { throw new Error("that site does not let other pages copy its pictures. download the image and upload it instead"); }
  if (!res.ok) throw new Error("could not load that image (" + res.status + ")");
  return VB.addImageBlob(await res.blob(), opts);
};
})();
