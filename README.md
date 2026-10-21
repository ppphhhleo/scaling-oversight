# Scaling Oversight

A static ALFWorld trajectory viewer for human review. The site preserves the typed viewer, with a searchable catalog and per-trajectory data loading. It contains 320 recorded runs across 20 tasks (14,340 steps; 55 recorded successes).

- [Trajectory catalog](https://ppphhhleo.github.io/scaling-oversight/)
- [Example: t004_b01](https://ppphhhleo.github.io/scaling-oversight/typed.html?dataset=alfworld&id=t004_b01&condition=highlight&v=1)
- [Example: t002_b03](https://ppphhhleo.github.io/scaling-oversight/typed.html?dataset=alfworld&id=t002_b03&condition=highlight&v=1)

## Review links

```text
typed.html?dataset=alfworld&id=t004_b01&condition=highlight&v=1
```

`id` selects a recorded episode (`t000_b00` through `t019_b15`). `condition=highlight` enables the prerequisite graph and path views; `condition=pure` shows the recorded sequence. `condition=h` uses the same plain step layout and labels highlighted steps as “Key steps.” The selection method remains one longest prerequisite path for the whole trace; this label does not imply measured causal importance. Clicking a step changes the displayed observation, not the highlighted path. Ties keep one representative path; traces without dependency edges have no highlighted steps. `condition=aggregated` uses a task ID (for example `id=t004`) and shows the section 2 PTA visualization over its 16 runs. Embodied views are not included. `v=1` is the URL contract version, not an immutable data or code snapshot. Freeze a Git revision for a reproducible study.

Optional hash parameters retain viewer selections, for example `#view=longest&step=17`. The catalog contains links for every episode.

Embed the viewer in a survey:

```html
<iframe
  src="https://ppphhhleo.github.io/scaling-oversight/typed.html?dataset=alfworld&amp;id=t004_b01&amp;condition=highlight&amp;v=1"
  title="ALFWorld trajectory review"
  width="100%" height="900" style="border:0">
</iframe>
```

## Aggregated view (PTA only)

[Example: t004, all 16 runs](https://ppphhhleo.github.io/scaling-oversight/typed.html?dataset=alfworld&id=t004&condition=aggregated&v=1)

This is the existing prototype’s section 2, with optional controls under **Display settings**. No milestone funnel, step strips, dependency-analysis panel, or outcome-association table is included. Default: task-milestone tokens, merged-by-depth layout, all runs. Choose **prefix tree (exact prefixes)** for a strict PTA; merged-by-depth is a flow abstraction and can join distinct histories. Node height and link width encode run counts; hue encodes eventual win rate; darker nodes and end bars encode termination. Dashed links fold intervening exploration steps. Click a node for its action, depth, run count, and recorded wins.

Two deterministic token sources are retained from the original prototype: task-aware canonical actions (fixed ALFWorld rules) and steps touched by inferred dependency edges. Both drop instance numbers. This dependency-token extractor includes lineage and differs from the single-trace viewer’s prerequisite-only graph. Aggregated paths are canonical action sequences, not dependency paths or equivalent world states. Run filtering, layout, and color selections are local UI state and are not encoded in the link.

## Contents and method

- `site/typed.html` and `site/assets/`: viewer and catalog; no external runtime dependencies.
- `site/data/manifest.json`: catalog, source identifiers, and per-episode checksums.
- `site/data/alfworld/`: one JSON file per episode. Only the selected episode is fetched.
- `site/data/aggregated/`: compact canonical tokens for each task; source-prototype checksum in the manifest.
- `tests/`: data integrity and static asset checks.
- `.github/workflows/pages.yml`: validation and Pages deployment.

The data retain recorded commands, pre/post observations, admissible actions, original responses, parsed command information, state changes, and inferred prerequisite edges used by the viewer. Other graph layers and development artifacts are omitted. Dependency method: `recorded-action-partial-state-v1`. Edges are rule-based inferences from partial observations, not simulator-verified causal dependencies. Degree counts and paths describe those inferred edges; a dependency path is not a complete action plan. Recorded success flags come from the dataset.

Source archive: `ALFWorld-20261019T014924Z-1-001.zip`. Archive and source-viewer SHA-256 hashes are recorded in the manifest. The visualization builds on [ALFWorld](https://github.com/alfworld/alfworld).

## Run and deploy

```sh
python3 -m unittest discover -s tests -v
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. Serve over HTTP; loading JSON from `file://` is not supported.

In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Pushes to `main` validate and deploy only `site/`. The site works under the `/scaling-oversight/` project prefix. No backend, API key, Python server, or simulator is needed on GitHub Pages.
