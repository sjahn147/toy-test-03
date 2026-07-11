# Production content migration plan

## 1. 목적

이 문서는 빅뱅 리팩터 없이 현재 `Phase*` 상속 체인 런타임을 데이터 중심 구조로 이동시키는 순서를 정의합니다. 목표 구조는 [`../architecture/production-layering.md`](../architecture/production-layering.md)가 정의하며, 이 문서는 그 구조에 **언제, 어떤 순서로, 어떤 호환 계층을 유지하면서** 도달하는지를 다룹니다.

기본 원칙:

- 각 단계는 기존 시나리오 4종과 `Phase*` 스모크 테스트를 깨지 않습니다.
- 새 경로는 기존 경로와 **병렬**로 추가하고, 검증이 끝난 뒤에만 기존 경로를 은퇴시킵니다.
- 호환 아티팩트(임시 셰임)는 숨기지 않고 이 문서에 명시적으로 기록합니다.
- 캠페인 콘텐츠 ID(`campaign.sleeping-citadel`, `room.sleeping-citadel.*`)는 모든 단계에서 안정 계약으로 유지합니다.

단계 요약:

```text
M0  콘텐츠 파이프라인 + 파사드 병렬 경로        ← 이번 라운드 (진행 중)
M1  UI가 selector를 통해 읽기 시작
M2  렌더러가 asset catalog를 통해 어셋 해석
M3  조합 루트와 정규화 WorldState가 내부 저장소가 됨
M4  Phase* 체인 은퇴, 캠페인은 콘텐츠만으로 추가
```

---

## 2. M0 — 콘텐츠 파이프라인과 병렬 파사드 (이번 라운드, 진행 중)

`campaign.manifest.json → ContentRegistry → ContentValidator → ScenarioCompiler → 기존 scenario shape → DungeonSimPhase8` 파이프라인을 실제로 배선합니다. UI와 렌더러는 변경하지 않습니다.

### 범위

- `src/content/` — `ContentRegistry`, `ScenarioCompiler`, `ContentValidator`, `layout/zoneLayout.js`, `legacyMappings.js`, `loadContentNode.js`
- `content/campaigns/sleeping-citadel/campaign.manifest.json` — room bible 63방·13구역 전사
- `content/assets/asset-catalog.json` — P0/P1 어셋 패밀리와 procedural fallback 매핑
- `content/schemas/` — manifest·catalog 자체 스키마 (외부 의존 없는 자체 밸리데이터가 소비)
- `src/domain/` — `snapshotContract.js`, `eventContract.js` (layering 문서 6장·10장 계약의 코드화)
- `src/compat/LegacyPhaseRuntimeAdapter.js` + `src/compat/normalizeLegacySnapshot.js`
- `src/application/GameRuntimeFacade.js` + `observerCommands.js`
- `src/presentation/selectors/` — 셀렉터 5종 (`selectGlobalBar`, `selectAgentInspector`, `selectRoomInspector`, `selectSettlementInspector`, `selectTimelineEvents`)
- `src/main.js` — fail-soft 캠페인 로드 (컴파일 실패 시 기존 시나리오 4종으로 부팅)

이 단계에서 파사드와 셀렉터는 **병렬 경로**입니다. `ObserveScreenPhase8`은 여전히 sim 내부를 직접 읽으며, 셀렉터는 스모크 테스트가 사용을 증명하는(proof-of-use) 수준까지만 배선합니다.

### 완료 조건

- 컴파일러가 manifest에서 레거시 scenario shape를 결정론적으로 방출합니다 (두 번 컴파일하면 deep-equal).
- 컴파일된 시나리오가 기존 apply 체인(`applyPhase2Facilities` → `applyPhase5Ecology` → `applyPhase6Ecology` → `applyPhase8SpatialScale` → `applyPhase7Territories`)을 통과하고, Phase5/6/8 멱등 가드가 no-op으로 동작합니다.
- `DungeonSimPhase8`이 캠페인 시나리오로 150틱을 무오류 실행합니다.
- 파사드가 `update/getSnapshot/getViewModel/dispatch/subscribe` 계약을 만족하고, snapshot이 JSON 왕복 직렬화 가능합니다.
- 브라우저에서 캠페인 시나리오가 목록에 나타나 로드되며, manifest 로드 실패 시에도 기존 시나리오로 부팅됩니다.

### 호환 계층 (M0에서 허용하는 아티팩트)

이번 라운드는 다음 셰임을 의도적으로 유지합니다. 각 항목은 후속 단계에 은퇴 시점이 정해져 있습니다.

| 아티팩트 | 내용 | 은퇴 |
| --- | --- | --- |
| `applyPhase2Facilities` 통과 | 입구 방 이름을 변경하고 합성 waystation 방 1개를 덧붙입니다. 런타임의 방 수는 63개가 아니라 **64개**입니다. | M1 |
| 비밀통로의 열린 컴파일 | 레거시 런타임에 발견 게이트가 없으므로 비밀통로 6쌍을 `scenario.links`에 포함합니다. 대신 양단 방에 `secret_route` 태그를 달고 `scenario.secretLinks`에 별도 보존해 이후 게이팅에 대비합니다. | M1 |
| Phase7 자원 시드 | 영토 자원은 manifest가 아니라 레거시 room `kind` 기준으로 `applyPhase7Territories`가 시드합니다. | M3 |
| UI의 sim 내부 접근 | `ObserveScreenPhase8`은 계속 `settlementSystem.settlements` Map 등을 직접 읽습니다. 셀렉터는 존재하지만 UI가 소비하지 않습니다. | M1 |
| propBundle의 부분 방출 | 카탈로그에 `legacyProp` 매핑이 있는 bundle만 레거시 prop으로 방출하고, 나머지는 `scenario.meta.propBundlesByRoom`에 기록만 합니다. 렌더러는 이 메타를 아직 읽지 않습니다. | M2 |

### 검증

- `node tests/content-pipeline-smoke.mjs` — 레지스트리 63방/13존/6비밀/7세력, 밸리데이터 통과, 컴파일 결정론, apply 체인 no-op, 150틱 실행 (60초 예산)
- `node tests/runtime-facade-smoke.mjs` — 어댑터 50틱, snapshot 계약과 JSON 왕복, 셀렉터 5종, subscribe/dispatch
- `npm run test:phase8`, `npm run test:phase8e` — 기존 회귀 없음
- 브라우저 수동 확인 — 캠페인 로드와 fail-soft

---

## 3. M1 — UI가 selector를 통해 읽기 시작

### 범위

- `ObserveScreen` 계열 HUD가 sim 내부(`sim.agents`, settlement Map 등) 대신 파사드의 snapshot과 셀렉터/view-model을 읽도록 이동합니다. surface-manifest의 셀렉터 이름(`selectGlobalBar`, `selectFactionList`, `selectRoomInspector` 등)이 계약입니다.
- 컴파일러가 입구 시설(등록소, 여신상, 보급 시설)을 직접 방출하고, 캠페인 콘텐츠에 대해 `applyPhase2Facilities`를 은퇴시킵니다. 런타임 방 수가 콘텐츠와 동일한 63개가 됩니다. 기존 절차적 시나리오 4종은 계속 Phase2를 통과합니다.
- `scenario.secretLinks`에 발견 게이팅을 도입합니다. 비밀통로는 발견 이벤트(`campaign.secret-discovered`) 전까지 이동 그래프에서 제외되고, 발견 시 열립니다.

### 완료 조건

- HUD의 어떤 코드 경로도 `sim.` 내부 컬렉션을 직접 순회하지 않습니다 (grep으로 확인 가능한 수준).
- 캠페인 시나리오의 런타임 방 수 = manifest 방 수 = 63.
- 비밀통로 6쌍이 발견 전 이동에 사용되지 않고, 발견 후 실제 경로에 반영됩니다.

### 호환 계층

- `applyPhase2Facilities`는 절차적 시나리오 전용으로 유지됩니다 (캠페인 경로에서만 제외).
- 렌더러는 여전히 레거시 prop 배열을 소비합니다.

### 검증

- `tests/content-pipeline-smoke.mjs`에 63방 불변·비밀 게이팅 검사 추가
- `tests/runtime-facade-smoke.mjs`의 셀렉터 검사가 실제 HUD 배선과 같은 코드 경로를 사용
- 기존 `test:phase1`~`test:phase8e` 회귀 없음 (절차적 시나리오의 Phase2 동작 보존)

---

## 4. M2 — 렌더러의 asset catalog 해석

### 범위

- `src/render/AssetResolver.js` 도입. 렌더러가 `scenario.meta.propBundlesByRoom`의 bundle ID를 catalog로 해석합니다: authored GLB → procedural fallback → primitive 비상 폴백 → missing-asset 진단 마커.
- 절차적 `AssetFactory`들을 공식 fallback으로 catalog에 연결합니다 (`proceduralFallback.factory/recipe`).
- 고아 파일 삭제: `src/data/enrichScenario.js`, `src/data/applyPhase8PropLayout.js` (임포터 없음 확인 후 제거).

### 완료 조건

- 캠페인 방의 시각 소품이 catalog 항목에서 해석됩니다. catalog 미등록 bundle은 진단 마커로 표시됩니다.
- authored GLB가 없는 상태에서도 procedural fallback으로 전체 캠페인이 렌더링됩니다.
- 고아 파일 2종이 저장소에서 삭제되고 어떤 테스트도 깨지지 않습니다.

### 호환 계층

- `legacyProp` 매핑을 통한 레거시 prop 방출은 sim이 소비하는 동안 유지됩니다 (서식지·시설 prop은 sim 로직에 결합되어 있음).

### 검증

- asset-catalog 해석 스모크 (bundle → factory/recipe 해석이 node 환경에서 검증 가능한 범위)
- 브라우저 수동 확인 — 진단 마커 0개 목표, fallback 렌더링 확인

---

## 5. M3 — 조합 루트와 정규화 WorldState

### 범위

- `src/application/FeatureComposer.js`(조합 루트)가 `DungeonSimPhase8` 생성자 배선을 대체합니다. 정착지·원정·물류·건설·성격 시스템을 feature module 계약(`id/dependsOn/createSystems/...`)으로 등록합니다.
- 정규화 WorldState(layering 문서 6장의 entity table 구조)가 **sim 내부 저장소**가 됩니다. M0의 `normalizeLegacySnapshot`은 읽기 전용 변환이었지만, 이 단계부터는 시스템이 직접 entity table을 읽고 씁니다.
- Phase7 자원 시드를 manifest 데이터 기반으로 이동합니다 (M0 호환 아티팩트 은퇴).

### 완료 조건

- 조합 루트로 구성한 런타임이 기존 `DungeonSimPhase8`과 동일한 스모크 테스트를 통과합니다 (병렬 실행으로 비교 검증).
- `normalizeLegacySnapshot` 변환 비용이 제거됩니다 (snapshot이 곧 내부 상태의 직렬화).
- 저장·로드 경계(layering 문서 11장)가 entity table 기준으로 구현 가능해집니다.

### 호환 계층

- `LegacyPhaseRuntimeAdapter`는 절차적 시나리오 4종을 위해 유지됩니다. 파사드 뒤에서 어댑터와 ModularRuntime이 병존합니다.

### 검증

- 기존 스모크 테스트 전체를 조합 루트 런타임으로 재실행하는 이중 실행 테스트
- snapshot 계약 테스트 (`assertWorldSnapshot`) 가 두 런타임에서 동일하게 통과

---

## 6. M4 — Phase* 체인 은퇴

### 범위

- `DungeonSim` → `DungeonSimPhase8` 상속 체인, `ObserveScreenPhase*`, `DungeonRendererPhase*`, `AssetRegistryPhase*` 를 삭제하거나 조합 루트 기반 구현으로 대체합니다.
- 절차적 시나리오 4종을 콘텐츠 manifest로 이식하거나 은퇴시킵니다.
- `tests/phase*-smoke.mjs`를 기능 모듈 단위 스모크로 재편합니다.

### 완료 조건

layering 문서 15장의 완료 상태와 동일합니다. 새 캠페인 추가가 다음 파일 작업만으로 끝나야 합니다.

```text
content/campaigns/new-campaign/campaign.manifest.json
content/campaigns/new-campaign/zones/*.json
content/assets/asset-catalog.json 신규 bundle 등록
assets/ authored 파일 추가
```

시뮬레이션 시스템이나 화면 클래스를 수정하지 않고 새 캠페인이 실행되면 마이그레이션이 종료됩니다.

### 호환 계층

없음. 이 단계에서 `src/compat/`은 비워지거나 삭제됩니다.

### 검증

- 콘텐츠만으로 추가한 검증용 미니 캠페인(6방 fixture)이 코드 수정 없이 실행되는지 확인하는 스모크
- 전체 기능 모듈 스모크 통과

---

## 7. 고아·중복 코드 정리 일정

| 파일 | 상태 | 조치 시점 |
| --- | --- | --- |
| `src/data/enrichScenario.js` | 임포터 없음 (죽은 코드) | M2에서 삭제 |
| `src/data/applyPhase8PropLayout.js` | 임포터 없음 (죽은 코드) | M2에서 삭제 |
| `src/data/applyPhase2Facilities.js` | 캠페인 경로에서 은퇴, 절차적 시나리오용 유지 | M1 (부분), M4 (완전) |
| `src/sim/DungeonSimPhase*.js` 체인 | 동작 보존을 위해 유지 | M4에서 은퇴 |
| `src/compat/*` | M0에서 신설되는 임시 계층 | M4에서 삭제 |

삭제는 항상 "임포터 없음"을 정적으로 확인하고, 해당 라운드의 스모크 테스트 전체가 통과한 커밋에서만 수행합니다.
