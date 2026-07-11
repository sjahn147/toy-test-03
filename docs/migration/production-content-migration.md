# Production content and runtime migration plan

## 1. 목적

이 문서는 현재 동작 중인 프로토타입을 중단하지 않고, 캠페인 콘텐츠·프로덕션 UI·실제 바이너리 어셋을 수용하는 구조로 옮기는 순서를 정의합니다.

핵심 원칙은 **빅뱅 리팩터 금지**입니다.

현재 `DungeonSimPhase*`, `DungeonRendererPhase*`, `AssetRegistryPhase*` 체인은 검증된 기능을 보존하는 호환 런타임으로 유지합니다. 신규 캠페인과 UI는 안정적인 façade와 데이터 계약 위에 먼저 올라가고, 내부 구현은 기능 단위로 교체합니다.

---

## 2. 현재 기준선

현재 최신 관찰 경로는 대략 다음과 같습니다.

```text
App
→ ObserveScreenPhase8
→ DungeonSimPhase8
   → 이동·점유·전투·장비·생태·영토·거점·원정·물류·건설·성격 시스템
→ DungeonRendererPhase8
→ AssetRegistryPhase8
→ procedural AssetFactory / MiniatureFactory
```

현재 구조의 장점:

- 브라우저에서 빌드 단계 없이 실행됩니다.
- 외부 GLB가 없어도 모든 기능을 확인할 수 있습니다.
- 기능별 smoke test가 존재합니다.
- 기존 시스템의 상호작용이 이미 풍부합니다.

현재 구조의 제약:

- `Phase*` 이름이 기능 소유권을 표현하지 못합니다.
- UI가 simulation 내부 객체를 직접 읽습니다.
- 콘텐츠 데이터가 JavaScript 시나리오·factory 코드에 섞여 있습니다.
- 실제 asset file과 procedural fallback의 해석 계층이 없습니다.
- 저장·로드와 캠페인 버전 마이그레이션 계약이 없습니다.
- 대형 맵을 한 사람이 JavaScript로 직접 작성하기 어렵습니다.

---

## 3. 마이그레이션 완료 상태

최종 경계는 다음과 같습니다.

```text
content/              사람이 작성하는 캠페인·방·어셋·UI manifest
assets/               GLB·텍스처·오디오·셰이더·라이선스
src/content/          로더·검증기·컴파일러
src/domain/           정규화된 상태와 계약
src/systems/          기능별 시뮬레이션
src/application/      런타임 조합과 이벤트 버스
src/presentation/     selector와 view-model
src/ui/               전략 UI 표면
src/render/           Three.js adapter와 AssetResolver
src/compat/           현재 Phase 런타임 호환 계층
```

UI와 renderer가 의존할 단일 계약:

```ts
interface GameRuntimeFacade {
  update(dt: number): void;
  getSnapshot(): WorldSnapshot;
  getViewModel(context: UiContext): UiViewModel;
  dispatch(command: ObserverCommand): void;
  subscribe(listener: WorldEventListener): () => void;
  destroy(): void;
}
```

현재 런타임과 미래 런타임이 모두 이 인터페이스를 만족해야 합니다.

---

## 4. 변경 금지 원칙

마이그레이션 중 다음을 금지합니다.

- 신규 `DungeonSimPhase9`, `DungeonRendererPhase9`, `AssetRegistryPhase9` 생성
- 캠페인 JSON에서 Three.js 클래스 생성
- UI 컴포넌트에서 `sim.agents`, `sim.props`, system `Map` 직접 순회
- 콘텐츠 파일에 실제 파일 경로 하드코딩
- GLB가 없다는 이유로 procedural fallback 삭제
- 한 번에 모든 시스템을 정규화된 state로 이동
- 테스트 없이 현재 entry point를 제거

---

# 5. 단계별 실행 계획

## Stage 0 — 문서·manifest 기준선 확정

### 산출물

- `docs/architecture/production-layering.md`
- `docs/ui/strategy-ui-surface.md`
- `docs/campaigns/sleeping-citadel-overview.md`
- `docs/campaigns/sleeping-citadel-room-bible.md`
- `docs/assets/content-asset-inventory.md`
- `content/campaigns/sleeping-citadel/campaign.manifest.json`
- `content/assets/asset-catalog.json`
- `content/ui/surface-manifest.json`

### 완료 조건

- 모든 공개 ID가 중복되지 않습니다.
- room bible과 campaign manifest의 방 수·ID가 일치합니다.
- asset catalog의 P0 ID가 room bible에서 참조되는 ID를 포함합니다.
- UI manifest의 selector·command 이름이 UI 문서와 일치합니다.

이 단계는 런타임에 영향을 주지 않습니다.

---

## Stage 1 — `GameRuntimeFacade` 도입

### 새 파일 목표

```text
src/application/GameRuntimeFacade.js
src/compat/LegacyPhaseRuntimeAdapter.js
src/application/WorldEventBus.js
```

### Legacy adapter 역할

```js
class LegacyPhaseRuntimeAdapter {
  constructor(sim) {}
  update(dt) { sim.update(dt); }
  getSnapshot() { return sim.snapshot(); }
  dispatch(command) { /* 기존 makeNoise, dropCoin, pause 등에 매핑 */ }
  subscribe(listener) { /* event hook */ }
}
```

### 배선

```text
ProductionObserveScreen
→ GameRuntimeFacade
→ LegacyPhaseRuntimeAdapter
→ DungeonSimPhase8
```

### 완료 조건

- 기존 화면과 동일하게 시뮬레이션이 실행됩니다.
- 화면은 더 이상 `DungeonSimPhase8`을 직접 생성하지 않습니다.
- pause, 속도, coin, noise, 선택 명령이 façade를 통과합니다.
- 기존 smoke test 전부 유지됩니다.

### 롤백

`App`에서 기존 ObserveScreen entry point로 한 줄 복귀할 수 있어야 합니다.

---

## Stage 2 — 이벤트 계약 정규화

현재 이벤트는 텍스트 중심입니다. 다음 구조로 확장합니다.

```js
{
  id,
  type: 'settlement.founded',
  category: 'settlement',
  severity: 'major',
  time,
  actorIds,
  targetIds,
  roomId,
  factionId,
  messageKey,
  messageArgs,
  legacyText
}
```

### 작업

- 기존 `sim.event(text, meta)`를 event adapter 뒤로 이동합니다.
- `legacyText`를 유지해 현재 로그가 계속 작동하게 합니다.
- timeline은 구조화 이벤트를 사용합니다.
- historic 이벤트는 campaign chronicle에 저장합니다.

### 완료 조건

- 기존 로그 문구가 사라지지 않습니다.
- category와 severity 필터가 동작합니다.
- 이벤트 클릭으로 관련 방·개체를 찾을 수 있습니다.

---

## Stage 3 — presentation selector 계층

### 새 구조

```text
src/presentation/selectors/
  globalBarSelectors.js
  factionSelectors.js
  partySelectors.js
  settlementSelectors.js
  roomSelectors.js
  agentSelectors.js
  timelineSelectors.js
  overlaySelectors.js
src/presentation/viewModels/
```

### 첫 selector 묶음

```text
selectGlobalBar
selectFactionList
selectPartyList
selectSettlementList
selectRoomList
selectAgentInspector
selectRoomInspector
selectSettlementInspector
selectTimelineEvents
selectCameraRoster
```

### 호환 방식

selector는 초기에는 legacy snapshot을 입력으로 받습니다. 내부 state 정규화는 나중에 진행합니다.

```js
const vm = selectAgentInspector(legacySnapshot, selectedId);
```

### 완료 조건

- 신규 UI는 simulation system 객체를 직접 참조하지 않습니다.
- selector에 대한 fixture test가 존재합니다.
- snapshot 필드가 없을 때 안전한 fallback을 반환합니다.

---

## Stage 4 — Production UI shell

### 새 구조

```text
src/ui/shell/StrategyShell.js
src/ui/surfaces/GlobalBar.js
src/ui/surfaces/Navigator.js
src/ui/surfaces/ContextInspector.js
src/ui/surfaces/EventTimeline.js
src/ui/surfaces/OverlayToolbar.js
src/ui/surfaces/CameraControls.js
```

### 전환 방법

1. 현재 viewport와 renderer는 그대로 둡니다.
2. 우측 HUD만 `ContextInspector`로 교체합니다.
3. 상단 바를 추가합니다.
4. 기존 로그를 timeline으로 이중 출력합니다.
5. 좌측 navigator와 overlay toolbar를 추가합니다.
6. 마지막에 기존 metric grid를 제거합니다.

### feature flag

```text
?ui=legacy
?ui=strategy
```

### 완료 조건

- 데스크톱에서 viewport가 화면의 55% 이상을 유지합니다.
- 모바일에서 bottom sheet가 닫혔을 때 viewport 높이가 55% 이상입니다.
- 키보드와 터치로 모든 주요 표면에 접근할 수 있습니다.
- 색만으로 상태를 구분하지 않습니다.

---

## Stage 5 — `ContentRegistry`와 schema validation

### 새 구조

```text
src/content/ContentRegistry.js
src/content/ContentValidator.js
src/content/schemas/
content/schemas/
```

### 첫 지원 manifest

- campaign
- asset catalog
- UI surface

### ContentRegistry 책임

- ID 등록과 중복 검사
- 참조 해석
- schema/content version 검사
- asset bundle 조회
- zone·room·connection 조회

### validator 필수 규칙

- 방 ID 고유
- connection 참조 유효
- 안전 입구 최소 1개
- 의도되지 않은 고립 방 없음
- settlement 후보 최소 면적
- 대형 개체 경로 최소 문 폭
- 모든 room에 landmark와 ecosystem hook 존재
- prop footprint가 walkable cell을 전부 차단하지 않음
- secret connection에 발견 조건 존재
- 모든 asset bundle ID가 catalog에 존재하거나 `allowMissingAsset` 명시

### 완료 조건

- CI에서 manifest validation이 실행됩니다.
- 오류 메시지가 JSON path와 콘텐츠 ID를 포함합니다.
- 런타임을 실행하지 않고 캠페인 콘텐츠를 검증할 수 있습니다.

---

## Stage 6 — `ScenarioCompiler` vertical slice

처음부터 63개 방 전체를 컴파일하지 않습니다.

### 첫 vertical slice

```text
A01 Lantern Plaza
A03 Sealed Gate
A05 Descent of Forty Lamps
B06 Broken Dormitory
B08 Laundry Cistern
H36 Old Lantern Common Room
H39 Underbarrel Cellar
```

이 slice는 다음을 검증합니다.

- 안전지대
- 대형 문
- 캠프 후보
- 물 자원
- 일반 connection
- 비밀 connection
- 여관 복원 후보
- 서로 다른 asset bundle

### compiler 결과

현재 scenario 형식과 호환되는 객체를 생성합니다.

```js
{
  id,
  rooms,
  links,
  agents,
  props,
  campaignMetadata
}
```

### 완료 조건

- compiled slice를 현재 legacy runtime에서 실행할 수 있습니다.
- 기존 `applyPhase*` decorator 없이 필요한 태그와 props가 생성됩니다.
- room bible ID가 runtime entity에 보존됩니다.

---

## Stage 7 — AssetResolver와 실제 `assets/` 사용

### 새 구조

```text
src/render/AssetResolver.js
src/render/AssetCatalogLoader.js
src/render/procedural/
assets/models/
assets/textures/
assets/audio/
```

### 해석 순서

```text
authored model
→ procedural composite
→ primitive emergency fallback
→ diagnostic marker
```

### 최초 authored asset 대상

1. 여관 common room tier 3
2. 여관 kitchen
3. 여관 guest wing
4. 성채 대문
5. 중앙시장 landmark
6. 보스 성소 중심 구조물

### 캐시 정책

- GLTF scene 원본 캐시
- instance clone 또는 SkeletonUtils clone
- material·texture 공유
- room unload가 생기기 전까지 campaign 단위 캐시
- 모바일에서 고해상도 texture 선택적 해제

### 완료 조건

- authored asset이 없어도 캠페인이 실행됩니다.
- asset 누락은 콘솔과 debug overlay에 표시됩니다.
- license metadata가 없는 외부 asset은 validator가 거부합니다.

---

## Stage 8 — 정규화된 WorldState 점진 도입

시스템 전체를 동시에 변경하지 않습니다.

### 권장 순서

1. rooms / connections
2. props / structures
3. settlements / factions
4. parties / cargo
5. agents
6. projectiles / effects

### dual-write 기간

한동안 legacy 배열과 normalized table을 함께 갱신합니다.

```text
Legacy state ← system update → Normalized projection
```

초기에는 projection만 사용하고, 이후 system storage를 이동합니다.

### 완료 조건

- selector가 normalized state를 우선 사용합니다.
- legacy snapshot과 주요 metric이 동일합니다.
- ID 기반 diff renderer가 변경 entity만 갱신합니다.

---

## Stage 9 — 기능 시스템 조합 전환

### 대상

```text
MovementSystem
CombatSystem
EquipmentSystem
EcosystemSystem
AdvancedEcologySystem
TerritorySystem
SettlementSystem
ExpeditionSystem
LogisticsSystem
ConstructionSiegeSystem
PersonalitySystem
```

### 전환 순서

각 시스템에 공통 lifecycle adapter를 둡니다.

```ts
interface RuntimeSystem {
  id: string;
  dependsOn: string[];
  initialize(context): void;
  beforeUpdate?(dt, context): void;
  update(dt, context): void;
  afterUpdate?(dt, context): void;
  handleCommand?(command, context): boolean;
  contributeSnapshot?(builder, context): void;
}
```

현재 Phase subclass의 override 순서를 문서화한 뒤 lifecycle order로 옮깁니다.

### 완료 조건

- `DungeonSimPhase*` 체인은 adapter 내부에서만 사용됩니다.
- 신규 기능은 module 등록으로 추가됩니다.
- update order가 테스트로 고정됩니다.

---

## Stage 10 — 63개 방 전체 캠페인 전환

### 전환 묶음

1. A–B: 입구·주거구
2. C–D: 침수 저장·산업 회랑
3. E–G: 납골·균류·거미 생태
4. H–I: 여관·중앙시장
5. J–K: 오크 병영·연구소
6. L–M: 왕실 심층·최종 성소

각 묶음은 다음을 포함합니다.

- room manifest
- connection
- prop bundle
- initial faction/ecology state
- story fragments
- state variants
- asset coverage report
- screenshot acceptance
- simulation soak test

### 완료 조건

- 모든 63개 방을 탐색할 수 있습니다.
- 모든 비밀통로가 발견 조건을 가집니다.
- 최소 5개 세력이 장기적으로 생존 가능합니다.
- 여관이 폐허에서 tier 3까지 발전할 수 있습니다.
- 중앙시장과 최소 한 거점에서 공성·봉쇄·물류가 발생합니다.
- 30분 soak test에서 치명적 오류와 영구 이동 교착이 없습니다.

---

# 6. 현재 파일의 기능별 이동 지도

| 현재 파일 | 목표 위치 |
|---|---|
| `src/sim/DungeonSimPhase8.js` | `src/compat/LegacyPhaseRuntimeAdapter.js` 뒤로 격리 |
| `src/sim/RoomOccupancySystem.js` | `src/systems/movement/RoomOccupancySystem.js` |
| `src/sim/CombatSystem.js` | `src/systems/combat/CombatSystem.js` |
| `src/sim/ProjectileSystem.js` | `src/systems/combat/ProjectileSystem.js` |
| `src/sim/EquipmentSystem.js` | `src/systems/equipment/EquipmentSystem.js` |
| `src/sim/EcosystemSystem.js` | `src/systems/ecology/EcosystemSystem.js` |
| `src/sim/AdvancedEcologySystem.js` | `src/systems/ecology/AdvancedEcologySystem.js` |
| `src/sim/TerritorySystem.js` | `src/systems/territory/TerritorySystem.js` |
| `src/sim/SettlementSystem.js` | `src/systems/settlement/SettlementSystem.js` |
| `src/sim/ExpeditionSystem.js` | `src/systems/expedition/ExpeditionSystem.js` |
| `src/sim/LogisticsSystem.js` | `src/systems/logistics/LogisticsSystem.js` |
| `src/sim/ConstructionSiegeSystem.js` | `src/systems/construction/ConstructionSiegeSystem.js` |
| `src/sim/PersonalitySystem.js` | `src/systems/personality/PersonalitySystem.js` |
| `src/engine/*AssetFactory.js` | `src/render/procedural/<family>/` |
| `src/engine/DungeonRendererPhase8.js` | `src/render/DungeonScene.js` + entity renderer |
| `src/screens/ObserveScreenPhase8.js` | `src/ui/shell/StrategyObserverScreen.js` |

파일 이동은 import 경로만 바꾸는 작업으로 취급하지 않습니다. 먼저 façade와 adapter를 추가한 뒤 수행합니다.

---

# 7. 저장·로드 버전 계약

캠페인 저장에는 다음을 포함합니다.

```js
{
  saveSchemaVersion,
  campaignId,
  campaignContentVersion,
  runtimeVersion,
  worldState,
  chronicle,
  uiState
}
```

### 저장 원칙

- Three.js 객체 저장 금지
- `Map`, `Set`은 배열 또는 plain object로 직렬화
- procedural asset mesh 상태 저장 금지
- entity ID와 component data만 저장
- undiscovered secret은 노출되지 않는 상태로 저장

### migration

```text
save v1 → migration 1→2 → migration 2→3 → current
```

각 migration은 순수 함수이며 fixture test를 가집니다.

---

# 8. 성능 예산

캠페인 목표:

- 활성 agent: 데스크톱 120, 모바일 60
- 동시 projectile/effect: 데스크톱 100, 모바일 45
- 화면 내 authored GLB draw call: 데스크톱 350 이하, 모바일 180 이하
- texture memory: 모바일 192MB 이하 목표
- UI selector recompute: 프레임당 전체 재계산 금지
- simulation update: 4× 속도에서 평균 12ms 이하 목표

필수 대응:

- instancing 가능한 prop family 분류
- room 단위 visibility/culling
- 먼 방의 animation tick 감소
- event timeline virtualization
- selector memoization
- 모바일 particle 수 감소

---

# 9. 검증 전략

## 9.1 콘텐츠 검증

- schema validation
- reference validation
- graph connectivity
- room capacity
- asset coverage
- secret discovery policy
- settlement viability

## 9.2 시스템 검증

기존 smoke test는 유지하고 기능별 contract test로 옮깁니다.

```text
movement interaction landing
combat projectile/downed
settlement capacity/return
expedition endurance/camp
logistics delivery/raid
construction/siege/blockade
personality/memory
```

## 9.3 통합 검증

- 5분 deterministic seed test
- 30분 soak test
- 모든 방 방문 test
- 모든 faction 최소 한 번 spawn test
- 여관 tier 0→3 progression test
- 공성으로 구조물 파괴 후 occupancy 해제 test
- save/load round trip

## 9.4 시각 검증

중요 방마다 기준 screenshot을 둡니다.

- 기본 상태
- 점령 상태
- 복원 상태
- 파괴·오염 상태
- 모바일 framing

---

# 10. 브랜치와 병합 원칙

병렬 작업자는 다음 경계를 지킵니다.

- 콘텐츠 작업자는 `content/`와 관련 문서를 주로 수정합니다.
- 어셋 작업자는 `assets/`, catalog entry, procedural fallback family를 수정합니다.
- UI 작업자는 selector contract와 `src/ui/`를 수정합니다.
- runtime 작업자는 façade, compiler, systems를 수정합니다.
- 한 PR에서 campaign content와 core simulation rewrite를 동시에 하지 않습니다.

모든 PR 설명에 다음을 포함합니다.

```text
Changed contracts
Content IDs added or changed
Asset IDs added or changed
Legacy behavior affected
Fallback behavior
Validation or tests
Screenshots if visual
```

---

# 11. 마이그레이션 우선순위

가장 먼저 실행할 작업 순서:

1. `GameRuntimeFacade`와 legacy adapter
2. selector/view-model 최소 세트
3. Production UI shell vertical slice
4. ContentRegistry와 manifest validator
5. A–B–H 구역 compiler slice
6. Inn authored/procedural asset bundle
7. 63개 방 묶음별 전환
8. normalized state와 modular system composer

이 순서는 사용자에게 보이는 품질을 일찍 개선하면서도 현재 시뮬레이션을 보존합니다.

---

# 12. Definition of Done

프로덕션 콘텐츠 마이그레이션은 다음 조건을 모두 만족할 때 완료입니다.

- UI와 renderer가 `GameRuntimeFacade`만 참조합니다.
- campaign manifest가 63개 방의 source of truth입니다.
- ContentValidator가 CI에서 실행됩니다.
- 실제 `assets/`와 procedural fallback이 같은 asset ID로 해석됩니다.
- 신규 기능이 Phase subclass 없이 등록됩니다.
- 전략 UI가 전역·세력·선택·사건 정보를 분리합니다.
- 여관과 중앙시장이 실제 동적 정착지로 작동합니다.
- save/load가 콘텐츠 버전과 함께 동작합니다.
- 모바일에서 핵심 관찰·선택·추적 기능을 사용할 수 있습니다.
- 현재 smoke test의 행동 보장이 기능별 contract test로 보존됩니다.


---

# 부록: M0 실제 구현 기록

아래는 위 단계 정의(M0–M4)와 별개로, 이번 프로덕션 아키텍처 라운드에서 멀티 에이전트 오케스트레이션으로
실제 완료된 M0 작업의 상세 기록입니다. 구체적인 파일 목록·완료 조건·검증 방법·호환 아티팩트 표는 여기,
전체 캠페인·UI 로드맵은 위 본문을 참고하세요.

# Production content migration plan

## 1. 목적

이 문서는 빅뱅 리팩터 없이 현재 `Phase*` 상속 체인 런타임을 데이터 중심 구조로 이동시키는 순서를 정의합니다. 목표 구조는 [`../architecture/production-layering.md`](../architecture/production-layering.md)가 정의하며, 이 문서는 그 구조에 **언제, 어떤 순서로, 어떤 호환 계층을 유지하면서** 도달하는지를 다룹니다.

기본 원칙:

- 각 단계는 기존 시나리오 4종과 `Phase*` 스모크 테스트를 깨지 않습니다.
- 새 경로는 기존 경로와 **병렬**로 추가하고, 검증이 끝난 뒤에만 기존 경로를 은퇴시킵니다.
- 호환 아티팩트(임시 셰임)는 숨기지 않고 이 문서에 명시적으로 기록합니다.
- 캠페인 콘텐츠 ID(`sleeping-citadel`, room bible 코드 `A01`..`M63`)는 모든 단계에서 안정 계약으로 유지합니다.

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
