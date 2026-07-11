# Production workstream and handoff plan

## 1. 목적

이 문서는 Sleeping Citadel 캠페인과 프로덕션 UI를 여러 작업자가 병렬로 구현할 때 경계를 명확히 하기 위한 인계 문서입니다.

작업은 큰 리팩터 한 건으로 묶지 않습니다. 각 workstream은 독립적으로 검토 가능한 산출물과 acceptance gate를 가집니다.

---

# 2. 공통 기준 자료

모든 작업자는 다음 문서를 먼저 읽습니다.

1. `docs/architecture/production-layering.md`
2. `docs/migration/production-content-migration.md`
3. `docs/ui/strategy-ui-surface.md`
4. `docs/campaigns/sleeping-citadel-overview.md`
5. `docs/campaigns/sleeping-citadel-room-bible.md`
6. `docs/assets/content-asset-inventory.md`
7. `content/campaigns/sleeping-citadel/campaign.manifest.json`
8. `content/assets/asset-catalog.json`
9. `content/ui/surface-manifest.json`

문서와 구현이 충돌하면 PR에서 계약 변경을 명시하고 관련 문서와 manifest를 같은 PR에서 갱신합니다.

---

# 3. 작업 스트림 개요

| 코드 | 작업 스트림 | 주요 산출물 | 선행 의존성 |
|---|---|---|---|
| W1 | Runtime façade & orchestration | GameRuntimeFacade, legacy adapter, event bus | 없음 |
| W2 | Content registry & compiler | schema, validator, ScenarioCompiler | manifest 기준선 |
| W3 | Strategy UI shell | 상단 바, navigator, inspector, timeline | selector 계약 |
| W4 | Presentation selectors | view-model과 memoized selector | W1 snapshot 계약 |
| W5 | Campaign world authoring | 63개 방 JSON, connection, story | room bible |
| W6 | Environment art & room kits | authored GLB·materials·variants | asset catalog |
| W7 | Inn restoration vertical slice | 여관 tier 0–3 콘텐츠·어셋·상태 | W2, W5, W6 |
| W8 | Faction/ecology content | 초기 세력·둥지·자원·encounter | W2, W5 |
| W9 | Camera & overlays | pan, follow roster, overlay renderer | W3, W4 |
| W10 | Audio/VFX & chronicle | ambient zones, event cues, timeline text | event contract |
| W11 | Save/load & migrations | save schema, round-trip, content version | normalized IDs |
| W12 | QA, tooling & performance | validators, soak, screenshot, budgets | 전 스트림 |

---

# 4. W1 — Runtime façade & orchestration

## 범위

- `GameRuntimeFacade`
- `LegacyPhaseRuntimeAdapter`
- `WorldEventBus`
- command dispatch
- lifecycle과 destroy 계약

## 수정 가능 영역

```text
src/application/
src/compat/
src/app/App.js
```

## 수정 금지

- 캠페인 방 콘텐츠
- authored asset binary
- 시스템 규칙의 대규모 변경

## 산출물

```text
src/application/GameRuntimeFacade.js
src/application/GameRuntimeFactory.js
src/application/WorldEventBus.js
src/compat/LegacyPhaseRuntimeAdapter.js
```

## acceptance

- 현재 Phase 8E 동작 보존
- UI가 façade를 통해 pause, speed, noise, coin 명령 실행
- event subscribe/unsubscribe 동작
- destroy 후 RAF·listener·renderer 누수 없음
- legacy entry point로 즉시 롤백 가능

## 인계 정보

- snapshot shape
- command 목록
- update order
- error boundary
- compatibility limitations

---

# 5. W2 — Content registry, schema & compiler

## 범위

- JSON schema
- ID registry
- 참조 검증
- 캠페인 compiler
- 기존 scenario 호환 출력

## 수정 가능 영역

```text
src/content/
content/schemas/
content/campaigns/
tests/content/
```

## 산출물

- `ContentRegistry`
- `ContentValidator`
- `ScenarioCompiler`
- CLI 또는 node validation script
- A/B/H vertical slice compiled fixture

## acceptance

- 중복 ID 거부
- 잘못된 connection 참조 거부
- 누락 asset ID 보고
- 63개 방 모두 graph에 연결됨
- secret connection 발견 조건 검증
- compiled scenario를 legacy runtime에서 실행 가능

## 병렬화

- schema와 compiler는 별도 작업 가능
- room authoring은 validator가 준비되기 전에도 manifest 초안으로 진행 가능

---

# 6. W3 — Strategy UI shell

## 범위

- 화면 레이아웃
- 반응형 panel
- UI state store
- keyboard/touch accessibility

## 수정 가능 영역

```text
src/ui/
src/styles/
content/ui/
```

## 산출물

- Global bar
- Left navigator
- Context inspector
- Event timeline
- Overlay toolbar
- Camera controls
- mobile bottom sheet/drawer

## acceptance

- viewport 최소 비율 준수
- 모든 panel 접기 가능
- 선택 대상에 따라 inspector 변경
- timeline 필터·pin·focus 지원
- touch target 최소 44px
- reduced motion 지원
- legacy metric HUD feature flag 유지

## 시각 QA

- 1440×900
- 1024×768
- 390×844
- 430×932

---

# 7. W4 — Presentation selectors & view-models

## 범위

UI가 simulation 내부 객체를 읽지 않도록 presentation 경계를 만듭니다.

## 산출물

```text
selectGlobalBar
selectFactionList
selectPartyList
selectSettlementList
selectRoomList
selectAgentInspector
selectRoomInspector
selectSettlementInspector
selectCargoInspector
selectStructureInspector
selectTimelineEvents
selectOverlayData
selectCameraRoster
```

## acceptance

- legacy snapshot fixture에서 동작
- 필드 누락 시 안전한 기본값
- 동일 입력에서 안정적 referential output 또는 memoization
- selector test가 UI와 독립적으로 실행됨
- HTML 문자열 생성 금지

## W3와의 계약

W4는 view-model JSON fixture를 먼저 제공합니다. W3는 실제 runtime을 기다리지 않고 fixture로 UI를 구현할 수 있습니다.

---

# 8. W5 — Campaign world authoring

## 범위

- 63개 방 manifest
- zone metadata
- normal/secret/conditional connection
- room system tags
- story fragment
- settlement potential
- initial ecology and faction setup

## 수정 가능 영역

```text
content/campaigns/sleeping-citadel/
docs/campaigns/
```

## 작업 단위

1. A–B: gate/residential
2. C–D: flooded/industry
3. E–G: ossuary/fungal/spider
4. H–I: inn/market
5. J–K: orc/laboratory
6. L–M: royal/final

## room acceptance

각 방은 반드시 포함합니다.

- 안정적 ID
- 이름과 zone
- 권장 크기
- port/connection 요구
- visual landmark
- prop bundle 최소 1개
- ecosystem hook 최소 1개
- system tag 최소 2개
- 기본/점령/파괴 상태
- story fragment 또는 secret

## 전체 acceptance

- 63개 방 수 일치
- 고립 방 없음
- 대형 정착지 후보 최소 8개
- 비밀통로 최소 6개
- 대형 개체 경로 존재
- 캠페인 시작·중간·심층 목표가 연결됨

---

# 9. W6 — Environment art & room kits

## 범위

- GLB room kit
- material library
- prop bundle
- damage/occupation variants
- LOD/mobile variants

## 디렉터리

```text
assets/models/environment/
assets/models/props/
assets/textures/
assets/materials/
assets/licenses/
```

## 우선순위

### P0

- generic stone room kit
- citadel gate
- Old Lantern Inn kit
- central market landmark
- ossuary kit
- flooded floor/water kit
- final sanctum focal asset

### P1

- fungal garden
- spider vertical colony
- orc barracks
- laboratory
- royal deep

## acceptance

- catalog ID와 파일 경로 일치
- origin·scale·orientation 규칙 준수
- collision/footprint metadata 제공
- procedural fallback 존재
- license 문서 존재
- mobile texture budget 준수
- normal/damaged/occupied variant 중 필요한 상태 제공

---

# 10. W7 — Inn restoration vertical slice

여관은 캠페인의 대표적인 문명 발전 콘텐츠이며 별도 vertical slice로 취급합니다.

## 방

- H36 common room
- H37 kitchen
- H38 guest wing
- H39 cellar
- H40 innkeeper secret room

## 발전 상태

```text
ruined
→ bivouac
→ field camp
→ repaired inn
→ fortified inn
→ neutral undercity hub
```

## 시스템 연결

- settlement capacity
- comfort/recovery
- food/water consumption
- merchant inventory
- party regrouping
- new party spawn
- resident profession
- siege and damage
- secret route
- rumor generation

## 필요한 어셋

- common room shell
- hearth and chimney
- service bar
- tables/chairs/benches
- kitchen range
- pantry/storage
- guest beds/partitions
- cellar barrels/racks
- signboard
- shutters/barricades
- innkeeper desk and ledger
- ruined and repaired variants

## acceptance

- tier마다 capacity·회복·시각 상태 변화
- 가구 파괴가 capacity에 반영
- 식량 부족 시 기능 저하
- 다른 파티가 여관에서 재조립 가능
- 공성으로 tier 하락 또는 폐허 전환 가능
- 동일 콘텐츠가 procedural fallback으로도 읽힘

---

# 11. W8 — Faction & ecology content

## 범위

- 초기 settlement
- population/capacity
- species mix
- resource loops
- build preferences
- diplomacy baseline
- rare event

## 주요 세력

- Lantern Compact
- Brass Button Market
- Copper-Tail Clutch
- Red-Tusk Host
- Choir of Unfinished Names
- Bluecap Communion
- Red-Silk Brood

## acceptance

각 세력은 다음을 가집니다.

- 초기 거점
- 주 자원과 부족 자원
- 선호 확장 방향
- 군사/물류/건설 성향
- 최소 2개 다른 세력과의 관계
- 승리보다 생존 가능한 장기 loop
- 몰락 시 난민·분열·흡수 결과

---

# 12. W9 — Camera & overlays

## 범위

- free pan
- orbit
- pinch zoom
- follow target persistence
- camera roster
- room/faction focus
- overlay visualization

## 카메라 acceptance

### Desktop

- left drag pan
- right drag rotate
- wheel zoom
- double click focus

### Touch

- one finger pan
- pinch zoom
- two-finger rotate
- double tap follow
- long press select

### Follow

- target ID 유지
- corridor movement 연속 추적
- manual orbit 허용
- 사망 시 corpse hold 후 fallback 정책
- roster에서 즉시 대상 교체

## overlay acceptance

- territory
- supply
- danger
- population
- resources
- infection
- noise
- secrets
- path intent

오버레이는 simulation state를 수정하지 않습니다.

---

# 13. W10 — Audio, VFX & chronicle

## 범위

- zone ambience
- settlement ambience
- combat cue
- construction/siege cue
- rare event cue
- structured timeline copy
- session chronicle export

## 우선 오디오

- gate rain and lamps
- flooded stores water machinery
- ossuary bone resonance
- fungal spores and low choir
- spider silk tension
- inn hearth/crowd layers
- market chatter
- orc drums
- laboratory hum
- royal deep wind
- final sanctum pulse

## acceptance

- 오디오가 zone 전환에 따라 crossfade
- 동일 cue 과다 반복 방지
- reduced motion과 별개로 mute/volume 지원
- historic event가 chronicle에 남음
- 사건 클릭 시 방 focus 가능

---

# 14. W11 — Save/load & migration

## 범위

- save schema
- entity 직렬화
- content version
- migration chain
- UI/camera state 저장

## acceptance

- 10분 실행 후 save/load state 비교
- 발견 secret 보존
- settlement tier·damage 보존
- agent memory·equipment 보존
- cargo·construction job 보존
- Three.js object 미포함
- 구버전 fixture migration test

---

# 15. W12 — QA, tooling & performance

## 도구

- content validator
- asset coverage report
- room screenshot harness
- deterministic seed runner
- soak test
- performance overlay
- missing asset overlay

## acceptance gate

### 기능

- 63개 방 방문 가능
- 영구 이동 교착 없음
- interaction overflow가 일반 이동 capacity를 무력화하지 않음
- 여관 tier 0→3 가능
- 공성·봉쇄·물류 발생
- 최소 5개 세력 20분 이상 존속 가능

### 성능

- desktop 120 agents target
- mobile 60 agents target
- 4× 속도 평균 simulation 12ms 이하 목표
- mobile texture memory 192MB 이하 목표

### 콘텐츠

- missing P0 asset 0개 또는 명시적 fallback
- 모든 room landmark 존재
- 모든 story fragment 참조 유효

---

# 16. 의존성 그래프

```text
W1 Runtime façade ─────┬─→ W4 Selectors ─→ W3 UI shell
                       └─→ W11 Save/load

W2 Registry/compiler ──┬─→ W5 Campaign authoring
                       ├─→ W7 Inn vertical slice
                       └─→ W8 Faction content

W6 Environment art ────┬─→ W7 Inn vertical slice
                       └─→ W5 room visual completion

W4 Selectors + W3 UI ──→ W9 Camera/overlays

All workstreams ───────→ W12 QA/tooling
```

W5와 W6는 manifest와 catalog ID 계약만 합의하면 병렬로 진행할 수 있습니다.

---

# 17. 권장 milestone

## Milestone 1 — Production shell

- W1 façade
- W4 selector fixture
- W3 top bar/inspector/timeline skeleton
- W2 validator skeleton

## Milestone 2 — Inn playable slice

- A/B/H seven-room compiler slice
- 여관 P0 asset
- tier progression
- new UI에서 agent/room/settlement inspection

## Milestone 3 — Ecosystem campaign alpha

- A–I 구역
- 5개 세력
- 물류·공성·여관
- save/load
- overlay 4종

## Milestone 4 — Full Sleeping Citadel

- 63개 방
- 7개 주요 세력
- J–M 심층 콘텐츠
- 보스 성소
- 모든 overlay
- mobile optimization

---

# 18. PR 인계 템플릿

```markdown
## Scope

## Contracts changed
- content IDs:
- selector/view-model:
- runtime commands/events:
- asset IDs:

## Legacy behavior
- preserved:
- intentionally changed:

## Fallback

## Validation
- tests:
- content validator:
- screenshots:
- performance:

## Follow-up work
```

---

# 19. 작업 완료 시 인계 체크리스트

- [ ] 관련 문서와 manifest 갱신
- [ ] 신규 ID catalog 등록
- [ ] procedural fallback 또는 missing policy
- [ ] selector/view-model fixture
- [ ] 테스트와 재현 방법
- [ ] 모바일 확인
- [ ] screenshot 또는 영상
- [ ] 성능 영향 기록
- [ ] known limitation
- [ ] 다음 작업자가 시작할 정확한 파일과 함수 기록

이 체크리스트가 충족되지 않은 기능은 구현이 동작하더라도 인계 완료로 보지 않습니다.


---

# 부록: WP0–WP6 실제 구현 기록 (M0 라운드)

아래는 이 문서의 W1–W12 계획과 별개로, 프로덕션 아키텍처 M0 라운드(위 architecture/production-layering.md 실행)에서
멀티 에이전트 오케스트레이션으로 실제 완료된 작업 패키지 기록입니다. 위 W1(façade)·W2(registry/compiler)·
W4(selectors) 스트림의 상당 부분이 이 라운드에서 이미 구현되었으므로, 후속 작업자는 아래 산출물을 재작성하지
않고 확장하면 됩니다.

# Workstream plan — 병렬 작업 스트림 계획

## 1. 목적

이 문서는 프로덕션 아키텍처 라운드(마이그레이션 M0 단계)를 여러 작업자 또는 에이전트가 **병렬로** 진행하기 위한 작업 패키지(WP) 분해를 기록합니다. 각 패키지는 파일 소유권이 완전히 분리되어 서로의 파일을 수정하지 않으며, 인터페이스(공개 API)만을 계약으로 공유합니다.

단계 정의는 [`../migration/production-content-migration.md`](../migration/production-content-migration.md), 구조 계약은 [`../architecture/production-layering.md`](../architecture/production-layering.md)를 따릅니다.

## 2. 의존성 그래프

```text
WP0 (계약·스키마)
 ├→ WP1 (콘텐츠 파이프라인)  ┐
 ├→ WP2 (authored 콘텐츠)    │
 ├→ WP3 (파사드·어댑터)      ├→ WP5 (통합·테스트·CI)
 ├→ WP4 (셀렉터)             │
 └→ WP6 (문서)               ┘
```

- WP0은 단독 선행합니다. snapshot·이벤트 계약과 JSON 스키마가 확정되어야 나머지가 병렬 시작할 수 있습니다.
- WP1~WP4, WP6은 파일 세트가 분리되어 완전 병렬입니다. WP1은 자체 6방 fixture로 개발하므로 WP2의 실데이터를 기다리지 않습니다.
- WP5만 기존 파일(`package.json`, `src/main.js`)을 수정할 수 있으며, 모든 패키지 산출물을 통합해 테스트를 작성·실행합니다.

---

## 3. WP0 — 도메인 계약과 스키마

### 파일 소유권

```text
src/domain/snapshotContract.js
src/domain/eventContract.js
content/schemas/campaign.manifest.schema.json
content/schemas/asset-catalog.schema.json
content/schemas/README.md
```

### 인터페이스 (다른 패키지에 노출)

- `assertWorldSnapshot(snapshot)` — layering 문서 6장의 정규화 구조(`clock/entities/indexes/events`) 검증. WP3이 생산자, WP4·WP5가 소비자.
- `createWorldEvent({type, severity, ...})` + severity 상수 — layering 문서 10장의 이벤트 shape. WP3·WP4가 소비.
- 스키마 JSON 2종 — WP1 밸리데이터와 WP2 저작이 같은 스키마를 참조. ajv 등 외부 의존 없이 자체 밸리데이터가 소비할 수 있는 구조.

### 의존성

없음 (선행 패키지).

### 산출물 / 인수 조건

- 모든 모듈이 node 호환 (DOM·Three.js import 없음).
- snapshot 계약이 JSON 직렬화 가능한 plain object만 허용.
- 검증: WP5의 `tests/runtime-facade-smoke.mjs`가 `assertWorldSnapshot`을 통과 게이트로 사용.

---

## 4. WP1 — 콘텐츠 파이프라인

### 파일 소유권

```text
src/content/ContentRegistry.js
src/content/ContentValidator.js
src/content/ScenarioCompiler.js
src/content/layout/zoneLayout.js
src/content/legacyMappings.js
src/content/loadContentNode.js
```

### 인터페이스

- `ContentRegistry` — `registerCampaign(manifest)`, `registerAssetCatalog(catalog)`, `getRoom(id)`, `resolvePropBundle(id)`. 중복 ID 등록 거부.
- `validateCampaign(registry, campaignId) → {ok, errors, warnings}` — 고유 ID, connection endpoint 존재, 입구 존재, 비밀 제외 연결성, settlement 후보 최소 크기, compat.ecology-guards.
- `validateCompiledScenario(scenario) → {ok, errors}` — AABB 겹침, apply-chain 예약 prefix 충돌.
- `compileCampaign({manifest, assetCatalog}) → {scenario, report}` — 레거시 scenario shape 방출. **결정론적** (RNG 금지, 두 번 컴파일 시 deep-equal).
- `loadContentNode.js` — node:fs 접근을 이 파일 한 곳에 격리 (테스트 전용 로더).

### 의존성

WP0 스키마. 실데이터(WP2)에는 의존하지 않음 — 자체 6방 fixture로 개발.

### 산출물 / 인수 조건

- 컴파일 결과가 Phase5/6/8 멱등 가드를 선점: `phase8SpatialScaleApplied: true`, `legacyDimensions`/`spatialCapacity` 자체 계산, 세력 lair prop 직접 배치.
- 비밀통로는 `scenario.links` 포함 + `secret_route` 태그 + `scenario.secretLinks` 별도 보존.
- prop ID는 `sc-<code>-<n>` 네임스페이스.
- 검증: `tests/content-pipeline-smoke.mjs` (WP5 작성) — 레지스트리 적재, 밸리데이터 통과, 결정론 deep-equal, apply 체인 no-op, `DungeonSimPhase8` 150틱.

---

## 5. WP2 — authored 콘텐츠 (데이터만)

### 파일 소유권

```text
content/campaigns/sleeping-citadel/campaign.manifest.json
content/assets/asset-catalog.json
```

### 인터페이스

코드 없음. manifest 자체가 계약입니다.

- 방 63개: `{id(room bible 코드 A01..M63), zoneId, size:[w,d], kind(서술적 kind → legacyMappings.mapRoomKind으로 레거시 enum 매핑), tags, landmarkBundle, stateVariants}`. ID 규칙은 `content/README.md` 준수 (짧은 room bible 코드를 그대로 안정 ID로 사용).
- 존 13개 (macro-grid col/row 포함), 연결 74+ normal / 6 secret, 세력 7개 (`startingAgents`, lair), wildlife.
- 카탈로그: P0/P1 어셋 패밀리 — `{status, priority, proceduralFallback{factory, recipe}, legacyProp?, footprint}`.

### 의존성

WP0 스키마. 원본은 [`../campaigns/sleeping-citadel-room-bible.md`](../campaigns/sleeping-citadel-room-bible.md)와 [`../assets/content-asset-inventory.md`](../assets/content-asset-inventory.md)에서 전사.

### 산출물 / 인수 조건

- `schemaVersion`/`contentVersion` 포함, 스키마 통과.
- 세력 7종의 `ecologyFaction` 매핑 고정 (Lantern Compact→`adventurer-expedition`, Brass Button→`goblin-clan`, Copper-Tail→`copper-tail-clutch`, Red-Tusk→`red-tusk-tribe`, Choir→`undead-host`, Bluecap→`bluecap-colony`, Red-Silk→`red-wing-brood`).
- 검증: `tests/content-pipeline-smoke.mjs` — 63방/13존/6비밀/7세력 카운트와 밸리데이터 전체 통과.

---

## 6. WP3 — 런타임 파사드와 호환 어댑터

### 파일 소유권

```text
src/compat/LegacyPhaseRuntimeAdapter.js
src/compat/normalizeLegacySnapshot.js
src/application/GameRuntimeFacade.js
src/application/observerCommands.js
```

### 인터페이스

- `LegacyPhaseRuntimeAdapter` — `constructor({scenario, createSim})`, `static fromSim(sim)`, `update(dt)`, `getSnapshot()`, `dispatch(command)`, `subscribe(listener)`.
- `normalizeLegacySnapshot(sim)` — `sim.snapshot()`을 WP0 계약의 정규화 WorldSnapshot으로 변환 (Map→plain object, JSON 직렬화 가능).
- `GameRuntimeFacade` — layering 문서 5장의 인터페이스: `update/getSnapshot/getViewModel/dispatch/subscribe`.
- `observerCommands.js` — `sim.make-noise`, `sim.drop-coin` 등 커맨드 테이블. UI는 이 커맨드만 dispatch.

### 의존성

WP0 계약. 기존 `DungeonSimPhase8`은 읽기 전용으로 소비 (수정 금지).

### 산출물 / 인수 조건

- 모든 파일 node 호환.
- snapshot이 `assertWorldSnapshot` 통과 + JSON 왕복 후 deep-equal.
- 검증: `tests/runtime-facade-smoke.mjs` — 어댑터 50틱, 계약·직렬화, subscribe/dispatch, `getViewModel`.

---

## 7. WP4 — 프레젠테이션 셀렉터

### 파일 소유권

```text
src/presentation/selectors/selectGlobalBar.js
src/presentation/selectors/selectAgentInspector.js
src/presentation/selectors/selectRoomInspector.js
src/presentation/selectors/selectSettlementInspector.js
src/presentation/selectors/selectTimelineEvents.js
src/presentation/selectors/index.js
```

### 인터페이스

- 순수함수 `select*(snapshot, args) → plain object`. 이름은 `content/ui/surface-manifest.json`의 셀렉터 명세와 일치.
- 정규화 snapshot만 읽습니다. sim 인스턴스·시스템 내부 접근 금지.

### 의존성

WP0 snapshot 계약. WP3 산출물과는 계약으로만 결합 (직접 import 없음).

### 산출물 / 인수 조건

- 모든 셀렉터가 node 호환 순수함수, 동일 입력에 동일 출력.
- 이번 라운드는 proof-of-use — HUD 배선은 M1 후속 스트림 소관.
- 검증: `tests/runtime-facade-smoke.mjs` — 실제 어댑터 snapshot에 셀렉터 5종을 적용해 plain object 반환 확인.

---

## 8. WP5 — 통합·테스트·CI (기존 파일 수정 허용)

### 파일 소유권

```text
tests/content-pipeline-smoke.mjs        (신규)
tests/runtime-facade-smoke.mjs          (신규)
.github/workflows/production-architecture-smoke.yml  (신규)
package.json                            (수정: test:content, test:facade)
src/main.js                             (수정: fail-soft 캠페인 로드)
```

### 인터페이스

- `npm run test:content`, `npm run test:facade` 스크립트.
- `src/main.js`의 캠페인 로드는 fetch 기반 (import attribute 비사용), 실패 시 기존 시나리오 4종으로 부팅하는 fail-soft.

### 의존성

WP1~WP4 전체 산출물 (통합 지점). 유일하게 기존 파일 수정 권한을 가지는 패키지.

### 산출물 / 인수 조건

- `node tests/content-pipeline-smoke.mjs` 통과 (60초 예산): manifest 로드 → 63방/13존/6비밀/7세력 → 밸리데이터 ok → 컴파일 결정론 → apply 체인 통과(5/6/8 no-op 검증) → 150틱 무오류.
- `node tests/runtime-facade-smoke.mjs` 통과.
- 기존 `test:phase8`, `test:phase8e` 회귀 없음.
- 브라우저에서 캠페인 시나리오 등장·로드 확인.

---

## 9. WP6 — 문서

### 파일 소유권

```text
docs/migration/production-content-migration.md
docs/handoff/workstream-plan.md   (이 문서)
```

### 의존성

계획 문서와 기존 설계 문서. 코드 산출물에는 의존하지 않음.

### 산출물 / 인수 조건

- `docs/README.md` 인덱스가 참조하는 두 문서의 갭 해소.
- 마이그레이션 문서가 M0 호환 아티팩트(64방 waystation, 열린 비밀통로, Phase7 자원 시드)를 은퇴 시점과 함께 명시.

---

## 10. 후속 스트림 (다음 라운드)

이번 라운드(M0) 이후, 아래 스트림이 병렬 후보입니다.

### 10.1 전략 UI 셸 (마이그레이션 M1)

[`../ui/strategy-ui-surface.md`](../ui/strategy-ui-surface.md) 17장의 구현 단위를 따릅니다.

| 단위 | 내용 | 선행 |
| --- | --- | --- |
| UI-01 Shell | top bar, left navigator, 우측 inspector, bottom timeline, panel 상태 | WP3 파사드 |
| UI-02 View-model boundary | 셀렉터 확장, 정규화 ID, 시스템 직접 접근 제거 | WP4 셀렉터 |
| UI-03 Selection surfaces | agent/room/settlement/faction/cargo/structure inspector | UI-02 |
| UI-04 Overlays | 영토, 보급, 위험, 생태, 자원, 비밀 overlay | UI-02 |
| UI-05 Camera | pan/orbit/zoom, 지속 추적, roster, 이벤트 포커스 | UI-01 |
| UI-06 Mobile | compact bar, bottom sheet, drawer navigator | UI-01 |
| UI-07 Chronicle | 구조화 타임라인과 필터 | WP0 이벤트 계약 |

UI-02가 완료되면 마이그레이션 M1의 "UI가 sim 내부를 직접 읽지 않음" 조건이 충족됩니다.

### 10.2 어셋 제작

[`../assets/content-asset-inventory.md`](../assets/content-asset-inventory.md) 10장의 우선순위를 따릅니다.

- **Vertical slice P0**: 공통 석재 구조 kit, H36 여관 접객실, H37 여관 주방, I41 중앙 교차홀, A01 안전 광장, 고블린 시장·언데드 납골당 핵심 프롭, UI 상단 바·세력 문장·상태 아이콘.
- **Campaign P1**: 나머지 여관 3방, 균류·거미 hero asset, 오크 투기장·족장실, 연구소 배양조·소환실, 왕실·최종 성소, 구역별 ambient audio.
- authored GLB가 준비되는 대로 asset-catalog의 `status`를 갱신하고, `authored.model` 경로를 연결합니다. 렌더러 배선은 마이그레이션 M2(AssetResolver) 스트림과 합류합니다.

### 10.3 캠페인 콘텐츠 polish

- 방별 `stateVariants` 확충 (원래/점령·복원/파괴·오염 3상태, 중요 방은 세력별 variant).
- encounter hook과 스토리 조각을 `content/campaigns/sleeping-citadel/` 하위 파일로 분리 (`zones/`, `encounters/`, `stories/`).
- [`../campaigns/sleeping-citadel-overview.md`](../campaigns/sleeping-citadel-overview.md) 10장의 제작 우선순위(여관 → 중앙시장 → 산업 회랑 → …)를 따릅니다.
- 밸리데이터 규칙 강화: 대형 몬스터 문 폭, prop footprint의 walkable cell 검사, 자원-소비 세력 경로 연결.
