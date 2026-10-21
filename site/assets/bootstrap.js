'use strict';
(async function () {
  const root = new URL('../', document.currentScript.src);
  async function json(path) {
    const response = await fetch(new URL(path, root));
    if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}). Please retry or check the site deployment.`);
    return response.json();
  }
  try {
    const manifest = await json('data/manifest.json');
    const route = ReviewRoutes.read(location.search, manifest);
    if (!['pure', 'highlight'].includes(route.condition)) throw new Error('This viewer supports condition=highlight or condition=pure for one recorded trajectory. Aggregated and embodied views are not included.');
    // read() validates the ID against the local manifest before constructing a data path.
    const episode = await json(`data/alfworld/${route.id}.json`);
    if (episode.id !== route.id || !Array.isArray(episode.steps) || !Array.isArray(episode.edges)) throw new Error('The trajectory file does not match the requested review link.');
    const task = manifest.tasks.find(task => task.id === route.taskId);
    window.TRAJECTORIES = {meta: manifest.meta, tasks: [{...task, episodes: [episode]}]};
    await import(new URL('assets/viewer.js', root).href);
  } catch (error) {
    document.querySelector('#goal').textContent = 'Visualization unavailable';
    document.querySelector('#error').textContent = error.message;
    document.querySelector('#error').hidden = false;
    document.querySelector('#graph').hidden = true;
  }
})();
