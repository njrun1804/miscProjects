// js/data-loader.js — Shared data loading module for Timeline of Tron V2
// Fetches JSON from db/api/ and caches in memory. All rooms import from here.

const DATA_CACHE = {};
const API_BASE = 'db/api/';

export async function loadData(filename) {
    if (DATA_CACHE[filename]) return DATA_CACHE[filename];
    const resp = await fetch(API_BASE + filename, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`Failed to load ${filename}: ${resp.status}`);
    const data = await resp.json();
    DATA_CACHE[filename] = data;
    return data;
}

export async function loadMultiple(filenames) {
    const results = {};
    await Promise.all(filenames.map(async f => {
        results[f.replace('.json', '')] = await loadData(f);
    }));
    return results;
}
