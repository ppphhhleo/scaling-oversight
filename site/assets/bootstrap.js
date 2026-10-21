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
    if (route.condition === 'aggregated') {
      const task = await json(`data/aggregated/${route.taskId}.json`);
      if (task.id !== route.taskId || !Array.isArray(task.runs)) throw new Error('Aggregation data do not match this task.');
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('assets/aggregate.css?rev=72c31bd88b38', root).href;
      document.head.append(css);
      const {renderAggregate} = await import(new URL('assets/aggregate.js?rev=f089e0cd9757', root).href);
      renderAggregate(task);
      return;
    }
    // read() validates the ID against the local manifest before constructing a data path.
    const episode = await json(`data/alfworld/${route.id}.json`);
    if (episode.id !== route.id || !Array.isArray(episode.steps) || !Array.isArray(episode.edges)) throw new Error('The trajectory file does not match the requested review link.');
    const task = manifest.tasks.find(task => task.id === route.taskId);
    window.TRAJECTORIES = {meta: manifest.meta, tasks: [{...task, episodes: [episode]}]};
    await import(new URL('assets/viewer.js?rev=daca4f35f0cf', root).href);
  } catch (error) {
    document.querySelector('#goal').textContent = 'Visualization unavailable';
    document.querySelector('#error').textContent = error.message;
    document.querySelector('#error').hidden = false;
    document.querySelector('#graph').hidden = true;
  }
})();
