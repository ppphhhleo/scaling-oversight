import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'

class SiteTests(unittest.TestCase):
    def test_catalog_and_episode_integrity(self):
        manifest = json.loads((SITE / 'data/manifest.json').read_text())
        self.assertEqual(len(manifest['tasks']), 20)
        ids, total_steps, won = set(), 0, 0
        for task in manifest['tasks']:
            self.assertEqual(len(task['episodes']), 16)
            for summary in task['episodes']:
                with self.subTest(episode=summary['id']):
                    self.assertNotIn(summary['id'], ids)
                    ids.add(summary['id'])
                    raw = (SITE / 'data/alfworld' / (summary['id'] + '.json')).read_bytes()
                    self.assertEqual(hashlib.sha256(raw).hexdigest(), summary['sha256'])
                    episode = json.loads(raw)
                    self.assertEqual(episode['id'], summary['id'])
                    self.assertEqual(episode['won'], summary['won'])
                    self.assertEqual(len(episode['steps']), summary['steps'])
                    total_steps += len(episode['steps'])
                    won += bool(episode['won'])
                    self.assertEqual(episode['dependencyMethod'], 'recorded-action-partial-state-v1')
                    for step in episode['steps']:
                        self.assertTrue({'action', 'obs', 'pre', 'adm', 'response', 'invalid', 'parsedAction', 'stateChanges'} <= step.keys())
                    for edge in episode['edges']:
                        self.assertEqual(edge['relation'], 'state_precondition')
                        self.assertGreaterEqual(edge['from'], 0)
                        self.assertLess(edge['from'], edge['to'])
                        self.assertLess(edge['to'], len(episode['steps']))
        self.assertEqual(len(ids), 320)
        self.assertEqual(total_steps, 14340)
        self.assertEqual(won, 55)
        self.assertEqual(manifest['meta'], {'episodes': 320, 'steps': 14340, 'won': 55})
        self.assertEqual({p.stem for p in (SITE / 'data/alfworld').glob('*.json')}, ids)

    def test_aggregation_matches_published_episodes(self):
        manifest = json.loads((SITE / 'data/manifest.json').read_text())
        for task in manifest['tasks']:
            with self.subTest(task=task['id']):
                raw = (SITE / 'data/aggregated' / (task['id'] + '.json')).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), task['aggregation_sha256'])
                aggregate = json.loads(raw)
                self.assertEqual(aggregate['id'], task['id'])
                episodes = {e['id']: e for e in task['episodes']}
                self.assertEqual({r['id'] for r in aggregate['runs']}, set(episodes))
                self.assertEqual(len(aggregate['runs']), len(episodes))
                self.assertEqual(aggregate['won'], sum(e['won'] for e in episodes.values()))
                for run in aggregate['runs']:
                    self.assertEqual(run['won'], episodes[run['id']]['won'])
                    self.assertEqual(run['n'], episodes[run['id']]['steps'])
                    for field in ['tokens', 'dep_tokens']:
                        indices = [token[1] for token in run[field]]
                        self.assertEqual(indices, sorted(set(indices)))
                        self.assertTrue(all(0 <= i < run['n'] for i in indices))
                        self.assertTrue(all(isinstance(t[0], str) and t[0] for t in run[field]))

    def test_static_assets_are_local_and_present(self):
        for page in SITE.glob('*.html'):
            for path in re.findall(r'(?:src|href)="([^"]+)"', page.read_text()):
                if path.startswith(('#', 'https:')):
                    continue
                self.assertFalse(path.startswith('/'), path)
                self.assertTrue((page.parent / path.split('?')[0]).is_file(), path)
        self.assertTrue((SITE / '.nojekyll').is_file())
        self.assertTrue((SITE / 'assets/viewer.js').is_file())
        self.assertFalse(any(p.is_symlink() for p in SITE.rglob('*')))

if __name__ == '__main__':
    unittest.main()
