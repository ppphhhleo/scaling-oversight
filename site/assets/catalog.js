const $ = selector => document.querySelector(selector);
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
try {
  const response = await fetch(new URL('../data/manifest.json', import.meta.url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  $('#dataset-summary').textContent = `${data.tasks.length} tasks · ${data.meta.episodes} recorded trajectories · ${data.meta.won} recorded successes`;
  const records = [];
  for (const task of data.tasks) {
    const section = element('section', undefined, 'task');
    section.append(element('h2', `${task.id} · ${task.goal}`));
    section.append(element('p', `${task.episodes.filter(ep => ep.won).length}/${task.episodes.length} runs succeeded`, 'task-summary'));
    const list = element('ul', undefined, 'runs');
    for (const episode of task.episodes) {
      const item = element('li');
      const primary = element('a', `${episode.id} · ${episode.steps} steps`, 'primary');
      primary.href = `typed.html?${new URLSearchParams({dataset:'alfworld',id:episode.id,condition:'highlight',v:'1'})}`;
      const pure = element('a', 'Pure', 'pure');
      pure.href = `typed.html?${new URLSearchParams({dataset:'alfworld',id:episode.id,condition:'pure',v:'1'})}`;
      pure.setAttribute('aria-label', `${episode.id}: recorded sequence without highlighting`);
      item.append(primary, element('span', episode.won ? 'Won' : 'Not won', episode.won ? 'won' : 'not-won'), pure);
      list.append(item);
      records.push({section, item, text:`${task.id} ${task.goal} ${episode.id}`.toLowerCase()});
    }
    section.append(list); $('#tasks').append(section);
  }
  $('#task-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    for (const record of records) record.item.hidden = !record.text.includes(query);
    for (const section of document.querySelectorAll('.task')) section.hidden = ![...section.querySelectorAll('li')].some(item => !item.hidden);
    $('#empty').hidden = records.some(record => !record.item.hidden);
  });
} catch (error) {
  $('#dataset-summary').textContent = `Could not load the trajectory index (${error.message}). Please reload the page.`;
}
