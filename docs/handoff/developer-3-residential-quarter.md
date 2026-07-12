# Developer #3 — Residential Quarter implementation

Status: **implemented; CI verification active**  
Owner: **Developer #3**  
Tracker: **Issue #28**  
Working PR: **#29**

## Purpose

Zone B is not a collection of unrelated themed rooms. It is the first former civilian living district below the expedition boundary and must explain how residents once slept, ate, washed, gathered and worshipped before the citadel failed.

## Spatial and content logic

- **B06 Broken Dormitory** receives the A05 descent. Bunks and lockers sit on the perimeter so the room works as an arrival, salvage and temporary-camp threshold.
- **B07 Communal Kitchen** and **B08 Laundry Cistern** form the food-and-water service spine. Their large equipment stays against walls while service lanes remain open.
- **B09 Tenement Court** is the social and territorial center. Cross-shaped circulation remains clear between balconies, market bays, the well and defensive edges.
- **B10 Household Chapel** is a small domestic sanctuary and the visual buffer before the ossuary frontier.
- **B08** preserves the authored hidden drain toward H39 without presenting it as an ordinary main entrance.

Every recipe records exact manifest adjacency, semantic sockets, simulation responsibilities, story props, reserved traversal lanes and a minimum clear width of 2.2 units.

## Implemented rooms

| Room | Identity | Story prop | Runtime states |
|---|---|---|---|
| B06 | collapsed communal sleeping hall | refugee child map mural | abandoned / field-camp / burned |
| B07 | shared range and provisioning kitchen | interrupted final meal | cold / working / infested |
| B08 | wash room, hot-water tank and drainage node | smuggler route scratches | clear / camped / fungal-contaminated |
| B09 | multi-storey residential courtyard | tenant-key floor mosaic | empty / occupied / barricaded |
| B10 | household-scale sanctuary | hidden anti-laboratory prayer | dormant / reconsecrated / defiled |

## Implementation surface

- `ResidentialQuarterLandmarkRecipes.js`
- `ResidentialQuarterGeometry.js`
- five dedicated room diorama modules
- `ResidentialQuarterLandmarkAssetFactory.js`
- `ResidentialQuarterAssetAnimator.js`
- `ResidentialQuarterAssetPack.js`
- `Phase8AssetResolver.js` registration
- `residential-quarter-assets-smoke.mjs`
- dedicated GitHub Actions workflow
- 63-room campaign audit advanced from 41/63 to 46/63

## Acceptance boundary

This slice completes dedicated landmark coverage for B06–B10. It does not yet claim final authored world coordinates, final corridor polylines, dynamic route gating or browser flythrough approval. Those remain later work packages in issue #28.
