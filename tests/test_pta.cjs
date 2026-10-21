// Validate support counts and termination across both PTA layouts and token sources.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const site = path.join(__dirname, '../site');
const source = fs.readFileSync(path.join(site, 'assets/aggregate.js'), 'utf8');
const buildGraph = new Function(source.slice(source.indexOf('function buildGraph('), source.indexOf('function selectRuns(')) + '; return buildGraph;')();
let checked = 0;
for (const name of fs.readdirSync(path.join(site, 'data/aggregated'))) {
  const task = JSON.parse(fs.readFileSync(path.join(site, 'data/aggregated', name)));
  for (const field of ['tokens', 'dep_tokens']) for (const tree of [true, false]) {
    const {nodes, links} = buildGraph(task.runs, field, tree);
    assert.equal(nodes[0].runs.length, task.runs.length);
    assert.equal(nodes.reduce((sum, node) => sum + node.ends.length, 0), task.runs.length);
    for (const node of nodes) {
      assert.equal(new Set(node.runs).size, node.runs.length);
      assert.equal(node.won, task.runs.filter(r => node.runs.includes(r.id) && r.won).length);
      assert.ok(node.ends.every(id => node.runs.includes(id)));
      if (tree && node.depth) assert.equal(node.parents.size, 1);
    }
    for (const link of links) {
      assert.equal(nodes[link.to].depth, nodes[link.from].depth + 1);
      assert.ok(link.runs.every(id => nodes[link.from].runs.includes(id) && nodes[link.to].runs.includes(id)));
      assert.equal(new Set(link.runs).size, link.runs.length);
    }
    checked++;
  }
}
console.log(`Validated ${checked} task / token-source / layout combinations`);
