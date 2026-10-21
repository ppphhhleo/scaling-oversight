'use strict';
// Pure URL contract. The only dataset is the bundled, versioned ALFWorld snapshot.
(function (root) {
  const version = '1';
  const modes = {pure: 'raw', highlight: 'highlight', aggregated: 'aggregate'};
  function read(search, data) {
    const q = new URLSearchParams(search);
    const allowed = ['dataset', 'id', 'condition', 'v'];
    for (const key of q.keys()) {
      if (!allowed.includes(key)) throw new Error(`Unknown parameter: ${key}. Use dataset, id, condition, and optional v.`);
      if (q.getAll(key).length !== 1) throw new Error(`Duplicate parameter: ${key}. Each parameter must appear once.`);
    }
    if (!q.size) return read('?dataset=alfworld&id=t003_b05&condition=highlight&v=1', data);
    for (const key of ['dataset', 'id', 'condition']) {
      if (!q.get(key)) throw new Error(`Missing ${key}. A review link needs dataset, id, and condition.`);
    }
    if ((q.get('v') ?? version) !== version) throw new Error('Unsupported viewer version. This file implements v=1. Use a frozen copy of the required version.');
    if (q.get('dataset') !== 'alfworld') throw new Error('Dataset unavailable. This file bundles only dataset=alfworld; it does not load external dataset URLs.');
    const condition = q.get('condition'), id = q.get('id');
    if (condition === 'embodied') throw new Error('Embodied map unavailable. These logs contain no coordinates, scene geometry, or replayable simulator snapshots. Use pure, highlight, or aggregated.');
    if (!Object.hasOwn(modes, condition)) throw new Error('Unknown condition. Supported conditions: pure, highlight, aggregated.');
    const task = condition === 'aggregated'
      ? data.tasks.find(t => t.id === id)
      : data.tasks.find(t => t.episodes.some(e => e.id === id));
    if (!task) throw new Error(condition === 'aggregated'
      ? 'Aggregation requires a task ID, for example id=t003, containing its 16 runs.'
      : 'Individual review requires an episode ID, for example id=t003_b05. This ID is not in the bundled dataset.');
    return {dataset:'alfworld', id, condition, v:version, taskId:task.id, mode:modes[condition]};
  }
  function query(route) {
    return new URLSearchParams({dataset:route.dataset,id:route.id,condition:route.condition,v:route.v}).toString();
  }
  const api = {read, query, version};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReviewRoutes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
