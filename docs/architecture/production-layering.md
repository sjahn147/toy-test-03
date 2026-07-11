# Production layering and integration architecture

## 1. 목적

현재 프로젝트는 짧은 기간 동안 많은 시스템을 검증하기 위해 다음 형태로 성장했습니다.

```text
DungeonSim
→ DungeonSimPhase1
→ DungeonSimPhase2
→ ...
→ DungeonSimPhase8
```

렌더러와 어셋 레지스트리도 같은 방식으로 확장됐습니다. 이 구조는 각 단계의 기능을 보존하면서 빠르게 실험하기에는 유효했지만, 장기적으로는 다음 문제가 있습니다.

- 기능의 소유권이 파일명에서 드러나지 않습니다.
- 화면이 여러 시스템의 내부 상태를 직접 읽습니다.
- 콘텐츠 데이터와 코드가 섞여 있습니다.
- 절차적 어셋 정의가 렌더링 코드에 하드코딩되어 있습니다.
- 새 기능을 추가할 때 상속 체인이 계속 길어질 위험이 있습니다.
- 캠페인 콘텐츠를 여러 작업자가 병렬 제작하기 어렵습니다.

이 문서는 전체 마이그레이션을 즉시 실행하지 않으면서도, 지금부터 새 코드와 콘텐츠가 향해야 할 최종 구조를 정의합니다.

---

## 2. 최종 의존성 방향

```text
content/                      authored game data
assets/                       binary runtime assets
        ↓
src/content/                  loaders, validators, compilers
        ↓
src/domain/                   normalized world state and contracts
        ↓
src/systems/                  simulation systems
        ↓
src/application/              runtime orchestration and event flow
        ↓
src/presentation/             selectors and UI view models
        ↓
src/ui/                       DOM/UI surfaces
src/render/                   Three.js scene adapters
```

의존성은 아래 방향으로만 흐릅니다.

- `systems`는 `render`와 `ui`를 알지 못합니다.
- `render`는 시뮬레이션 객체를 수정하지 않습니다.
- `ui`는 시스템 인스턴스를 직접 순회하지 않고 view-model을 읽습니다.
- `content` 데이터는 Three.js 클래스나 DOM을 포함하지 않습니다.
- `assets`는 실제 파일을 저장하며, 파일 선택 규칙은 catalog가 담당합니다.

---

## 3. 디렉터리 계약

### 3.1 `content/`

사람이 작성하고 버전 관리하는 **게임 콘텐츠 원본**입니다.

```text
content/
  campaigns/
    sleeping-citadel/
      campaign.manifest.json
      zones/
      encounters/
      stories/
  assets/
    asset-catalog.json
  ui/
    surface-manifest.json
  schemas/
```

포함할 내용:

- 캠페인, 구역, 방, 연결, 비밀통로
- 방의 태그와 기능
- 배치할 prop bundle ID
- 자원, 세력, encounter hook
- 스토리 조각과 상태 변화
- UI surface와 selector 요구사항
- 어셋 ID와 제작 상태

포함하지 않을 내용:

- Three.js geometry 생성 코드
- DOM 문자열
- 시스템 인스턴스
- 런타임 캐시

### 3.2 `assets/`

브라우저가 로드하는 **바이너리 또는 외부 제작 산출물**입니다.

```text
assets/
  models/
    environment/
    props/
    characters/
    equipment/
    creatures/
  textures/
  materials/
  audio/
  ui/
  licenses/
  manifest.json
```

여기에 들어갈 파일:

- `.glb`, `.gltf`
- `.png`, `.webp`, `.jpg`
- `.ogg`, `.mp3`, `.wav`
- 셰이더 소스와 LUT
- 라이선스 문서

절차적 geometry 코드는 여기에 넣지 않습니다. 대신 `content/assets/asset-catalog.json`이 authored asset과 procedural fallback을 같은 ID 아래 연결합니다.

### 3.3 `src/`

런타임 코드입니다. 최종 목표 구조는 다음과 같습니다.

```text
src/
  application/
    GameRuntime.js
    GameRuntimeFactory.js
    FeatureComposer.js
    WorldEventBus.js
  content/
    ContentRegistry.js
    ScenarioCompiler.js
    ContentValidator.js
    migrations/
  domain/
    WorldState.js
    entityTypes.js
    contracts/
  systems/
    movement/
    combat/
    ecology/
    settlement/
    expedition/
    logistics/
    construction/
    personality/
  presentation/
    selectors/
    viewModels/
  ui/
    shell/
    surfaces/
    components/
  render/
    DungeonScene.js
    entityRenderers/
    AssetResolver.js
    procedural/
  compat/
    LegacyPhaseRuntimeAdapter.js
```

이 구조는 즉시 전환하는 목표가 아니라, 새 작업이 향해야 할 경계입니다.

---

## 4. 조합 루트

새로운 기능은 상속 체인 대신 조합 루트에서 등록합니다.

```js
const runtime = new GameRuntimeFactory()
  .withContent(campaign)
  .use(MovementModule)
  .use(CombatModule)
  .use(EcologyModule)
  .use(SettlementModule)
  .use(LogisticsModule)
  .use(ConstructionModule)
  .use(PersonalityModule)
  .build();
```

### Feature module 계약

```js
export const SettlementModule = {
  id: 'settlement',
  dependsOn: ['territory', 'occupancy'],
  createSystems(context) {},
  createSelectors(context) {},
  createRenderAdapters(context) {},
  validateContent(registry) {},
  migrateLegacyState(state) {}
};
```

새 시스템은 다음을 명시해야 합니다.

- 모듈 ID
- 의존 모듈
- 소유하는 entity/component
- 발행하는 event
- 필요한 content tag
- 제공하는 selector
- renderer가 필요한 경우 render descriptor

---

## 5. 현재 `Phase*` 체인의 취급

### 원칙

- 기존 체인은 동작 보존을 위해 당분간 유지합니다.
- 새로운 `Phase9`, `Phase10` 파일은 만들지 않습니다.
- 현재 최신 진입점은 하나의 `LegacyPhaseRuntimeAdapter` 뒤로 감춥니다.
- 기능별 시스템 파일은 유지하되, simulation subclass가 아니라 composer가 호출하도록 이동합니다.

### 호환 계층

```text
App
→ ProductionObserveScreen
→ GameRuntimeFacade
   ├─ LegacyPhaseRuntimeAdapter   현재 동작
   └─ ModularRuntime              점진적 대체
```

`GameRuntimeFacade`는 UI와 renderer에 동일한 인터페이스를 제공합니다.

```ts
interface GameRuntimeFacade {
  update(dt: number): void;
  getSnapshot(): WorldSnapshot;
  getViewModel(context: UiContext): UiViewModel;
  dispatch(command: ObserverCommand): void;
  subscribe(listener: WorldEventListener): () => void;
}
```

이 계층이 생기면 내부 구현을 바꾸더라도 UI와 캠페인 콘텐츠를 다시 작성하지 않아도 됩니다.

---

## 6. 정규화된 WorldState

현재 snapshot은 여러 시스템의 배열을 한 객체에 덧붙이는 형태입니다. 최종 상태는 entity table 중심으로 정규화합니다.

```js
{
  clock: {},
  entities: {
    agents: {},
    rooms: {},
    connections: {},
    props: {},
    settlements: {},
    factions: {},
    parties: {},
    cargo: {},
    structures: {},
    projectiles: {},
    effects: {}
  },
  indexes: {
    agentsByRoom: {},
    propsByRoom: {},
    settlementsByFaction: {},
    routesByFaction: {}
  },
  events: []
}
```

### 장점

- UI selector가 필요한 정보만 읽을 수 있습니다.
- renderer가 변경된 entity만 갱신할 수 있습니다.
- 캠페인 저장과 로드가 쉬워집니다.
- 디버깅 시 객체 참조 대신 ID로 추적할 수 있습니다.
- 여러 작업자가 시스템을 병렬 개발하기 쉬워집니다.

---

## 7. 콘텐츠 컴파일 파이프라인

캠페인 JSON을 그대로 simulation에 넘기지 않습니다.

```text
campaign.manifest.json
→ ContentRegistry
→ schema validation
→ reference resolution
→ ScenarioCompiler
→ compiled scenario
→ runtime
```

### `ContentRegistry`

- 모든 ID를 등록합니다.
- 중복 ID를 거부합니다.
- zone, room, prop bundle, asset bundle 참조를 해석합니다.
- 콘텐츠 버전을 확인합니다.

### `ScenarioCompiler`

- room blueprint를 실제 좌표와 크기로 변환합니다.
- port와 connection을 생성합니다.
- prop bundle을 room placement로 펼칩니다.
- 초기 세력, 서식지, 자원을 배치합니다.
- 비밀통로는 잠긴 connection으로 컴파일합니다.
- 캠페인 상태별 variant를 준비합니다.

### `ContentValidator`

최소 검사:

- 모든 room ID 고유
- connection이 존재하는 방만 참조
- 입구가 최소 1개 존재
- 고립된 방 없음, 의도된 비밀방은 예외 태그 필요
- settlement 후보 방의 최소 면적 충족
- 대형 몬스터 경로의 문 폭 충족
- prop footprint가 walkable cell을 모두 막지 않음
- 자원 노드와 소비 세력이 최소 한 경로로 연결
- boss room에 퇴로 또는 명시적 봉쇄 정책 존재

---

## 8. 어셋 해석 계층

### 안정적인 asset ID

콘텐츠는 파일 경로가 아니라 ID를 참조합니다.

```json
{
  "assetBundle": "inn.common-room.tier3"
}
```

`AssetResolver`는 다음 순서로 해석합니다.

```text
1. authored GLB / texture asset
2. procedural composite asset
3. primitive emergency fallback
4. missing-asset diagnostic marker
```

### asset catalog entry

```json
{
  "id": "inn.common-room.tier3",
  "kind": "diorama",
  "status": "planned",
  "authored": {
    "model": "assets/models/props/inn/common-room.glb"
  },
  "proceduralFallback": {
    "factory": "InnAssetFactory",
    "recipe": "commonRoomTier3"
  },
  "footprint": { "radius": 2.4 },
  "sockets": ["service", "seating", "storage", "light"]
}
```

### 절차적 어셋의 위치

현재 `AssetFactory`들은 공식 fallback으로 유지하지만 최종적으로 다음 위치로 이동합니다.

```text
src/render/procedural/environment/
src/render/procedural/characters/
src/render/procedural/props/
src/render/procedural/effects/
```

한 factory가 여러 도메인을 동시에 만들지 않도록 asset family 단위로 나눕니다.

---

## 9. UI와 runtime 사이의 계약

UI는 다음과 같은 selector를 사용합니다.

```js
selectGlobalResourceBar(state, observerContext)
selectFactionNavigator(state)
selectSelectionInspector(state, selectedEntityId)
selectEventTimeline(state, filters)
selectOverlayData(state, overlayType)
selectCameraRoster(state, filters)
```

UI가 해서는 안 되는 일:

- `sim.agents.find(...)` 직접 호출
- settlement system의 `Map` 직접 접근
- 내부 system method 호출
- HTML 문자열 안에서 게임 규칙 계산
- renderer mesh를 통해 entity 상태 추론

### UiViewModel

```js
{
  topBar: {},
  factionNavigator: [],
  selection: {},
  timeline: [],
  overlays: {},
  alerts: [],
  cameraRoster: []
}
```

UI는 이 모델을 렌더링하고 observer command만 dispatch합니다.

---

## 10. 이벤트 계약

시뮬레이션 이벤트는 텍스트 로그와 구조화 데이터를 함께 가져야 합니다.

```js
{
  id,
  time,
  type: 'settlement.destroyed',
  severity: 'major',
  actorIds: [],
  targetIds: [],
  roomId,
  factionIds: [],
  tags: [],
  localizationKey,
  params: {},
  fallbackText
}
```

주요 event namespace:

```text
agent.*
combat.*
ecology.*
party.*
settlement.*
territory.*
logistics.*
construction.*
campaign.*
discovery.*
```

이 계약은 이벤트 타임라인, 세션 리포트, 알림, 저장 파일이 같은 데이터를 사용하게 합니다.

---

## 11. 저장·로드 경계

프로덕션 캠페인에서는 시뮬레이션 상태를 저장할 수 있어야 합니다.

저장 대상:

- 캠페인 ID와 content version
- clock
- entity component state
- 발견된 방과 비밀통로
- 거점과 구조물 상태
- 파티, 장비, 관계, 기억
- 자원과 물류
- random seed와 sequence counter

저장하지 않는 대상:

- Three.js mesh
- geometry/material cache
- DOM 상태
- 임시 UI hover
- 파생 selector 결과

---

## 12. 성능 계약

대형 캠페인 목표:

- 45~65개 방
- 80~140개 활성 agent
- 10~20개 settlement
- 20~50개 cargo/loot/projectile/effect entity
- 모바일에서는 30fps 이상을 목표

필수 전략:

- fixed-step simulation과 render interpolation 분리
- 화면 밖 agent의 낮은 갱신 빈도
- selector memoization
- geometry/material 공유
- authored GLB clone cache
- effect pool
- UI 전체 재렌더링 금지
- overlay는 인스턴싱 또는 단일 buffer 사용

---

## 13. 새 기능 추가 규칙

새 기능을 추가할 때 다음 질문에 답해야 합니다.

1. 이 기능이 소유하는 domain state는 무엇인가요?
2. 어떤 event를 발행하나요?
3. 어떤 content ID나 tag가 필요한가요?
4. 다른 시스템과의 의존성은 무엇인가요?
5. UI에는 어떤 selector로 노출되나요?
6. renderer에는 어떤 descriptor가 필요한가요?
7. 저장 파일에 포함되나요?
8. 기존 procedural fallback은 무엇인가요?
9. 대형 캠페인에서 성능 상한은 무엇인가요?
10. 자동 검증이나 smoke test는 무엇인가요?

새로운 기능을 `ObserveScreen` HTML에 직접 넣거나 `DungeonSimPhase*`를 하나 더 만드는 방식은 금지합니다.

---

## 14. Architecture Decision Records

향후 중요한 결정은 `docs/architecture/decisions/`에 ADR로 추가합니다.

권장 첫 ADR:

- ADR-001: content와 assets 분리
- ADR-002: procedural asset을 fallback으로 유지
- ADR-003: phase inheritance를 composition으로 대체
- ADR-004: normalized world state
- ADR-005: UI selector/view-model 경계
- ADR-006: campaign content versioning

---

## 15. 완료 상태의 모습

최종적으로 캠페인 하나를 추가하는 작업은 다음 파일 작업으로 대부분 완료되어야 합니다.

```text
content/campaigns/new-campaign/campaign.manifest.json
content/campaigns/new-campaign/zones/*.json
content/assets/asset-catalog.json에 신규 bundle 등록
assets/에 필요한 authored 파일 추가
```

시뮬레이션 시스템이나 화면 클래스를 수정하지 않고도 새 캠페인이 실행되는 것이 이 아키텍처의 완료 조건입니다.
