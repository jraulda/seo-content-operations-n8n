import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const names = [
  'prepare-and-sync-articles.json',
  'assign-articles-to-trello.json',
  'close-published-articles.json',
];
const workflows = Object.fromEntries(names.map(name => [
  name, JSON.parse(fs.readFileSync(path.join(root, 'workflows', name), 'utf8')),
]));

for (const [name, workflow] of Object.entries(workflows)) {
  assert.equal(workflow.active, false, `${name} must import disabled`);
  const nodeNames = new Set(workflow.nodes.map(node => node.name));
  assert.equal(nodeNames.size, workflow.nodes.length, `${name} has duplicate node names`);
  for (const node of workflow.nodes) {
    assert.ok(!node.credentials, `${name}: embedded credential reference`);
    if (node.type === 'n8n-nodes-base.code') {
      new vm.Script(`function run() {\n${node.parameters.jsCode}\n}`);
    }
  }
  for (const [source, types] of Object.entries(workflow.connections)) {
    assert.ok(nodeNames.has(source), `${name}: missing source ${source}`);
    for (const outputs of Object.values(types)) {
      for (const edges of outputs) {
        for (const edge of edges) {
          assert.ok(nodeNames.has(edge.node), `${name}: missing target ${edge.node}`);
        }
      }
    }
  }
}

function runCode(file, nodeName, rows, sideInputs = {}) {
  const node = workflows[file].nodes.find(item => item.name === nodeName);
  assert.ok(node);
  return vm.runInNewContext(`(() => {\n${node.parameters.jsCode}\n})()`, {
    $input: { all: () => rows.map(json => ({ json })) },
    $items: name => (sideInputs[name] || []).map(json => ({ json })),
  });
}

const configs = JSON.parse(fs.readFileSync(path.join(root, 'examples', 'account-config.json')));
const articles = JSON.parse(fs.readFileSync(path.join(root, 'examples', 'article-control.json')));
const context = { 'Read Account Configuration': configs };
const prepared = runCode('prepare-and-sync-articles.json', 'Prepare Articles for Sync', articles, context);
assert.equal(prepared.length, 1);
assert.equal(prepared[0].json.article_id, 'SEO-2026-10-EXAMPLESTORE-01');
assert.equal(prepared[0].json.destination_sheet, 'BLOG POSTS - OCT26');
assert.equal(prepared[0].json.update_calendar, true);
assert.equal(prepared[0].json.update_writer_log, true);

const ready = { ...prepared[0].json, calendar_sync: 'Synced', writer_log_sync: 'Synced' };
const assignment = runCode('assign-articles-to-trello.json', 'Validate Assignment Candidates', [ready], context);
assert.equal(assignment.length, 1);
assert.ok(assignment[0].json.trello_description.includes(`Control ID: ${ready.article_id}`));
assert.ok(assignment[0].json.trello_description.includes('Primary keyword:'));
assert.equal(runCode('assign-articles-to-trello.json', 'Validate Assignment Candidates', [prepared[0].json], context).length, 0);

const published = {
  ...ready, status: 'Published', URL: 'https://example.com/blog/reusable-bottle/',
  actual_publication_date: '2026-10-30', calendar_sync: 'Pending', writer_log_sync: 'Pending',
};
const closing = runCode('close-published-articles.json', 'Find Published Articles Pending Sync', [published], context);
assert.equal(closing.length, 1);
assert.equal(closing[0].json.destination_sheet, 'BLOG POSTS - OCT26');
assert.equal(closing[0].json.update_calendar, true);
assert.equal(closing[0].json.update_writer_log, true);

console.log('Three exports validated; synthetic prepare, assign, and close paths passed.');
