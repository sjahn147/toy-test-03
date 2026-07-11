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

- 방 63개: `{id, code(A01..M63), zoneId, size{w,d}, kind(레거시 enum), tags, propBundles, stateVariants, danger, spawnWeight}`. ID 규칙은 `content/README.md` 준수 (`room.sleeping-citadel.<zone-slug>.<slug>`).
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
