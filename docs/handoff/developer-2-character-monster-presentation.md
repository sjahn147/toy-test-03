# Developer #2 handoff — character and monster presentation

## 1. 문서 목적

이 문서는 **개발자 #2**가 담당한 캐릭터·몬스터 miniature 모델링, 리깅, 애니메이션, 전투·사망 presentation 작업을 다음 작업자에게 인계하기 위한 기준 문서입니다.

현재 상태는 다음과 같이 요약합니다.

> 캐릭터·몬스터의 절차적 모델, 종별 리그, 무기별 전투 동작, 피격·다운·사망 presentation은 기능적으로 연결되었다. 다만 프레임 독립 애니메이션, 실제 화면 회귀 검증, projectile, 종별 사망 연출, LOD·성능 관리와 일부 기존 CI 실패 정리가 남아 있다.

이 문서는 작업 이력만 기록하지 않습니다. 담당 영역, 수정 경계, 완료 항목, 알려진 기술 부채, 후속 작업 순서와 acceptance 기준을 함께 정의합니다.

---

## 2. 담당자와 담당 영역

### 담당자

- **개발자 번호:** Developer #2
- **주 담당:** 캐릭터·몬스터 miniature presentation

### 주 담당 범위

- 절차적 캐릭터·몬스터 모델링
- body profile과 개체 variation
- humanoid·skeleton·creature rig
- 장비 socket과 miniature recipe
- 보행·대기·피격·회복·공격·다운·사망 애니메이션
- 전투 effect와 시각 동작 동기화
- contact shadow와 장비 secondary motion
- miniature 전용 smoke contract
- 캐릭터 gallery, screenshot regression, draw-call·animation 성능 예산

### 연관 workstream

기존 `docs/handoff/workstream-plan.md` 기준으로 다음 영역과 교차합니다.

- **W6 Environment art & room kits:** authored character asset이 추가될 경우 asset catalog와 fallback 관계 협의
- **W10 Audio/VFX & chronicle:** 공격·피격·사망 cue와 effect contract 협의
- **W12 QA, tooling & performance:** screenshot regression, animation budget, draw-call budget, soak test

### 수정 가능 영역

```text
src/engine/*Miniature*.js
src/miniatures/
src/render/                 # 프로덕션 구조로 이전할 때
src/presentation/           # pose/event view-model로 이전할 때
tests/miniature-*.mjs
.github/workflows/miniature-*.yml
docs/handoff/
docs/modular-miniatures.md
content/assets/asset-catalog.json  # authored asset 계약을 추가할 때만
```

### 단독 변경을 피해야 하는 영역

다음은 Developer #2가 시각 presentation 목적만으로 임의 변경하지 않습니다.

- 전투 피해량과 명중 계산
- Agent AI 의사결정
- 생태·정착지·경제 규칙
- 캠페인 방 구조와 연결
- 저장 스키마
- UI selector 계약

전투·사망 이벤트에 시각 metadata가 필요하면 simulation 담당자와 event contract를 먼저 합의합니다.

---

## 3. 완료된 작업

## 3.1 모델링 기반

### 체형 profile

다음 body profile을 추가했습니다.

- masculine
- feminine
- neutral

resolver 우선순위는 다음과 같습니다.

```text
agent.bodyType
→ agent.presentation
→ agent.gender
→ recipe.bodyType
→ neutral
```

개체 ID 기반 deterministic variation으로 다음 값을 다르게 만듭니다.

- 키
- 어깨와 몸통 폭
- 몸통 길이
- 팔다리 길이
- 얼굴 편향
- 비대칭 정도

### 인간형 계층 리그

다음 관절 계층을 구현했습니다.

- pelvis
- spine
- chest
- neck
- head
- shoulders
- upper arms
- elbows
- forearms
- hands
- thighs
- knees
- shins
- feet

얼굴은 cranium, jaw, nose, brow, eyes를 조립한 절차적 구조입니다.

### 스켈레톤 해부학

스켈레톤은 일반 인간형 몸체에 뼈 색을 입힌 모델이 아니라 다음 해부학 요소로 별도 구성했습니다.

- iliac pelvis
- sacrum
- vertebrae
- sternum
- ribs
- clavicle
- skull and jaw
- eye sockets
- humerus
- paired forearm bones
- fingers
- femur
- patella
- paired shin bones
- toes

### 고블린·오거·오크

- 고블린: 비대칭 귀, 송곳니, wart, 얼굴 편향
- 오거: 확장된 어깨와 머리, 대형 몽둥이 체형
- 오크: 전용 recipe와 skeleton family, 굵은 턱, 송곳니, 비대칭 brow·scar, 견갑, 상투

오크는 이전에 공식 agent role이었지만 miniature recipe가 없어 goblin fallback으로 표시될 수 있었습니다. 현재는 별도 모델과 `axe-shield` weapon style을 사용합니다.

---

## 3.2 비인간 몬스터

### 슬라임

- translucent body lobes
- contact skirt
- internal core
- deterministic bubbles
- squash and stretch
- body-slam stretch

### 미믹

- 목재 chest body
- metal bands
- lid pivot
- gum and jaw
- tongue
- 14 teeth
- 4 articulated legs

### 거미

- abdomen, thorax, head 분리
- 8개 다리 각각 hip·knee 관절
- 4개 전면 눈
- 좌우 독립 송곳니
- 교차 보행 위상
- 공격 시 앞다리·송곳니 전진

### 레이스

- 다리 없는 spectral body
- hood와 glowing face
- 독립 소매와 발톱
- trailing cloth tatters
- 상하 부유
- 느린 rotation drift

### 균류인간

- 균사 줄기 몸체
- 별도 mushroom cap 관절
- gills
- 비대칭 팔
- 작은 자실체
- spore sac
- 공격 준비 중 포자낭 팽창

### 스터지

- 타원형 몸체와 별도 머리
- 흡혈 proboscis
- 좌우 독립 날개
- 이동·대기에 따른 날갯짓 속도 차이
- 공격 시 주둥이 신장

---

## 3.3 장비와 무기별 동작

### 장비

- curved procedural longbow
- bowstring
- nocked arrow
- heavy axe
- kite shield

### weapon style 계약

애니메이션은 역할명만 보지 않고 `recipe.weaponStyle`을 사용합니다.

현재 주요 style:

- sword-shield
- dual-dagger
- bow
- staff-focus
- mace-book
- axe-shield
- heavy-club
- sword
- club
- body-slam
- bite
- fangs
- spectral-claws
- spores
- proboscis

### 구현된 전투 동작

- 공격 공통 단계: `windup → strike → recovery`
- 활: 왼팔 고정, 오른팔 draw, 흉곽 회전, release 구간 화살 숨김
- 지팡이+focus: 양팔 속도·각도를 다르게 적용한 casting pose
- 철퇴+책: 책 팔은 방어적으로 유지하고 철퇴 팔만 타격
- 도끼+방패: 방패는 전면 유지, 도끼 팔은 큰 windup과 torso rotation
- 대형 몽둥이: 양팔 준비 후 느리고 큰 하강 타격

---

## 3.4 presentation polish

### 접지 그림자

모든 miniature에 procedural contact shadow를 추가했습니다.

- 지상형과 flying/spectral opacity 차이
- 공중 높이에 따른 opacity 감소
- 피격 시 spread 증가
- corpse 진행에 따른 fade

### 장비 secondary motion

다음 부품이 몸체보다 늦게 반응하도록 구성했습니다.

- cape
- quiver
- spellbook
- relic pack
- hood
- wizard hat
- orc topknot

### 상태 animation

- walk
- idle
- hit reaction
- heal reaction
- attack
- downed
- corpse fall and settle

### 사망 presentation

- simulation의 `alive: false`는 그대로 유지
- Phase8 renderer에서 최근 사망 agent만 임시 visual copy로 투영
- 기본 linger: 2.4초
- 쓰러짐, 소폭 침하, 축소, contact shadow fade 후 제거

---

## 3.5 전투 이벤트 동기화

`CombatPresentationBridge`를 추가해 기존 피해 계산을 변경하지 않고 presentation metadata를 보강했습니다.

- `attack`·`heal` effect에 `sourceAgentId` 추가
- death 발생 시 `deathAt`과 `corpseLinger` 기록
- animator가 `sourceAgentId` effect를 읽어 실제 피해 발생 시점에 strike frame 적용

현재 구현은 `DungeonSim.prototype`을 감싸는 compatibility bridge입니다. 영구 구조가 아니라 아래 후속 작업에서 정식 event schema로 흡수해야 합니다.

---

## 4. 관련 병합 이력

### PR #5

초기 articulated miniature와 스켈레톤·슬라임·미믹 기반 작업.

### PR #7

**Add exotic creature rigs and weapon-specific animation**

- 거미·레이스·균류인간·스터지
- 장궁과 화살
- weapon style animation
- `Invalid left-hand side in assignment` 수정

병합 커밋:

```text
657ef56f4019ef144132622d624ebe5582111071
```

### PR #14

**Integrate Phase 3 miniatures with combat and death presentation**

- 오크 전용 모델과 장비
- contact shadow
- secondary motion
- downed·corpse
- attack effect source synchronization

병합 커밋:

```text
2b2c3aa0c54aea4007f8e3db4590af5ca27e8d9b
```

기존 stacked PR #11은 PR #14로 대체하고 종료했습니다.

---

## 5. 해결한 주요 오류

브라우저의 다음 오류를 수정했습니다.

```text
Uncaught SyntaxError: Invalid left-hand side in assignment
```

원인:

```js
this.screenEl?.dataset.mobileSurface = surface;
```

Optional chaining 결과는 assignment target이 될 수 없습니다.

수정:

```js
if (this.screenEl) {
  this.screenEl.dataset.mobileSurface = surface;
}
```

`StrategyObserverShell.js`를 miniature workflow의 `node --check` 대상에 포함해 같은 parse error의 재발을 막았습니다.

---

## 6. 현재 알려진 기술 부채와 개선 과제

## P0 — 즉시 안정화

### 6.1 기본 animator damping 오류

현재 `MiniatureAnimator`에는 다음 계산이 남아 있습니다.

```js
const alpha = 1 - Math.exp(-Math.min(24, dt > 0 ? 15 : 1));
```

`dt`가 지수에 곱해지지 않아 대부분의 프레임에서 alpha가 거의 1이 됩니다. 그 결과 intended damping보다 관절이 즉시 목표 자세에 붙고, 움직임이 뻣뻣하거나 튈 수 있습니다.

수정 목표:

```js
const alpha = 1 - Math.exp(-15 * dt);
```

Acceptance:

- 30fps, 60fps, 144fps에서 attack·walk recovery 체감 속도가 유사함
- frame skip 후 관절이 폭발적으로 튀지 않음
- dt=0 처리 명확화

### 6.2 advanced animator의 고정 alpha 제거

`AdvancedMiniatureAnimator`는 `alpha = 0.24`를 사용합니다. 프레임률에 따라 체감 속도가 달라집니다.

조치:

- renderer 또는 animator 내부에서 dt 계산
- 모든 damping을 `1 - exp(-speed * dt)` 형태로 통일
- base animator와 advanced animator가 동일 delta contract 사용

---

## P1 — 실제 화면 검증

### 6.3 miniature gallery scene

고정 상태를 재현하는 전용 gallery가 필요합니다.

필수 fixture:

- 모든 humanoid role 정면·측면
- 모든 monster idle
- walk midpoint
- windup
- strike
- recovery
- hit
- heal
- downed
- death 0초, 1초, 2.3초
- 20개체 밀집 전투

### 6.4 screenshot regression

현재 smoke test는 source contract와 문법만 검증하며 다음 문제를 잡지 못합니다.

- 손과 무기 socket 불일치
- 방패·갑옷 clipping
- 여성형 body에서 장비 관통
- 오크 견갑이 머리를 가리는 문제
- 거미 다리의 지면 관통
- corpse의 벽 관통
- 잘못된 화살 release frame
- 원거리 silhouette 붕괴

권장 viewport:

- 1440×900
- 1024×768
- 390×844

Acceptance:

- baseline screenshot과 허용 threshold 정의
- 각 role과 state를 안정적인 seed·time으로 캡처
- CI artifact로 diff 이미지 보존

---

## P1 — 구조 안정화

### 6.5 prototype monkey patch 제거

현재 `CombatPresentationBridge`는 다음 메서드를 감쌉니다.

- `DungeonSim.prototype.resolve`
- `DungeonSim.prototype.emitEffect`
- `DungeonSim.prototype.onDeath`

이는 compatibility 단계에서는 유용하지만 다음 위험이 있습니다.

- 다른 extension과 patch 순서 충돌
- hot reload 또는 다중 bundle에서 중복 설치
- simulation과 presentation 경계 불명확

목표 event schema:

```js
emitEffect('attack', {
  agentId: target.id,
  sourceAgentId: attacker.id,
  createdAt: time,
  duration
});
```

사망 event에도 다음 값을 정식으로 포함합니다.

```text
agentId
deathAt
sourceAgentId
cause
presentationHint
```

이 작업은 simulation 담당자와 공동으로 진행합니다.

### 6.6 pose graph로 통합

현재 구조는 기본 animator가 role별 pose를 적용한 뒤 advanced animator가 weapon style pose를 다시 덧씌웁니다.

이 구조의 문제:

- 같은 관절에 두 레이어가 순차적으로 목표값 설정
- 적용 순서에 따라 결과 변경
- 신규 장비 추가 시 수정 지점이 불명확

목표 구조:

```text
locomotion pose
+ weapon pose
+ hit/heal reaction
+ status pose
+ death pose
= final joint targets
→ one damping pass
```

Acceptance:

- 관절당 한 번만 최종 target에 damping
- role과 weapon style 책임 분리
- fixture를 통해 state 조합 재현 가능

---

## P2 — 시각 완성도

### 6.7 실제 projectile

현재 궁수는 strike 중 손의 화살을 숨길 뿐 공간을 날아가는 projectile은 없습니다.

추가 대상:

- bow hand 또는 muzzle socket
- target까지 직선·포물선 이동
- target 소멸 시 fallback destination
- impact effect와 시간 일치
- projectile pooling

마법사도 staff·focus pose는 있으나 projectile 또는 beam이 없습니다.

### 6.8 종별 사망 animation

현재 모든 종은 공통적인 측면 낙하를 사용합니다.

목표:

- 인간·오크: 무릎 붕괴 후 측면 낙하
- 스켈레톤: 뼈 관절 붕괴 또는 부분 분리
- 슬라임: 바닥 확산과 opacity 감소
- 레이스: 위쪽으로 분해·증발
- 균류인간: 포자 방출 후 갓 접힘
- 미믹: 열린 lid 상태로 경직
- 거미: 다리가 몸 안쪽으로 말림
- 스터지: 회전 추락

### 6.9 얼굴·복장 variation

추가 후보:

- 피부색 범위
- 눈 크기·간격
- 코 형태
- 턱 폭
- 헤어·수염
- 흉터 위치
- 갑옷 손상
- 옷 색조
- 장비 손잡이·금속 색 변형

같은 role 여러 개가 동시에 등장할 때 복제 인상을 줄이는 것이 목표입니다.

---

## P2 — 성능

### 6.10 LOD와 draw-call 예산

현재 모델은 작은 primitive와 독립 mesh를 많이 사용합니다.

비용이 큰 예:

- 스켈레톤 갈비뼈와 손가락
- 거미 8개 다리 다단 관절
- 오크 얼굴과 견갑 세부
- miniature별 contact shadow
- 독립 material과 object traversal

필요 작업:

- 원거리 얼굴·손가락·갈비뼈 비활성화
- material 공유
- geometry cache 확인
- contact shadow instancing
- 동일 종 batching 또는 `InstancedMesh` 검토
- frustum 밖 animation update 생략
- 거리별 animation tick 감소

권장 예산은 gallery·stress scene을 만든 후 실측으로 결정합니다.

최소 측정값:

- active miniature 수
- Three.js calls
- triangles
- geometries
- textures
- animation update time
- render frame time

---

## P2 — 저장소 품질

### 6.11 기존 실패 CI 분류

Developer #2 작업 병합 당시 다음 workflow가 별도로 실패 중이었습니다.

- Phase 3 Smoke
- Phase 7 Territory Smoke
- Phase 8 Settlement Smoke
- Phase 8C Logistics Spatial Smoke

miniature 전용 smoke와 관련 기반 검사는 성공했습니다. 그러나 `main`에 지속적인 red check가 있으면 이후 신규 회귀와 기존 실패를 구분하기 어렵습니다.

각 실패를 다음으로 분류합니다.

- 실제 product regression
- 현재 설계와 맞지 않는 outdated assertion
- flaky test
- fixture 부재
- unrelated cross-track dependency

이 작업은 각 workflow 소유자와 공동 처리하며, Developer #2는 miniature 변경이 원인인지 여부와 animation/render 관련 부분을 담당합니다.

---

## 7. 후속 개발 권장 순서

1. `MiniatureAnimator`의 dt damping 오류 수정
2. advanced animator까지 frame-independent smoothing 통일
3. miniature gallery scene 구축
4. screenshot visual regression 추가
5. 종별 death animation
6. 화살·마법 projectile 구현
7. prototype bridge를 정식 event metadata로 교체
8. pose graph로 animator 통합
9. LOD·draw call·animation 성능 측정과 budget 설정
10. 기존 실패 CI 원인 분류 및 정리

모델 종류를 추가하는 작업보다 **1–4번 안정화와 검증을 먼저 수행**합니다.

---

## 8. 주요 파일 지도

```text
src/engine/MiniatureBodyProfiles.js
  body type resolver와 deterministic variation

src/engine/HumanoidMiniatureRig.js
  인간형 관절 계층과 고블린·오거 장식

src/engine/SkeletonMiniatureRig.js
  스켈레톤 전용 해부학 리그

src/engine/CreatureMiniatureBuilders.js
  슬라임과 미믹

src/engine/ExoticMiniatureBuilders.js
  거미, 레이스, 균류인간, 스터지

src/engine/MiniatureWeaponBuilders.js
  장궁과 화살

src/engine/MiniaturePhase3Equipment.js
  오크 도끼와 kite shield

src/engine/OrcMiniaturePolish.js
  오크 얼굴, 견갑, 상투

src/engine/MiniaturePresentationPolish.js
  contact shadow와 secondary-motion handle

src/engine/MiniatureAnimator.js
  기본 locomotion, hit, heal, role pose

src/engine/AdvancedMiniatureAnimator.js
  weapon style, exotic creature, downed, corpse presentation

src/engine/CombatPresentationBridge.js
  attack source와 death metadata compatibility bridge

src/engine/PolishedMiniatureFactory.js
  recipe별 builder routing과 equipment assembly

src/engine/DungeonRendererPhase8.js
  visual agent projection, animation update, corpse linger

src/miniatures/recipes.js
  role별 body, skeleton, weapon style, parts

src/miniatures/partCatalog.js
  socket별 part builder 계약

tests/miniature-polish-smoke.mjs
  miniature source contract와 regression guard

.github/workflows/miniature-polish-smoke.yml
  JavaScript syntax와 miniature contract CI
```

---

## 9. 검증 방법

### 기본 검사

```bash
npm run test:miniatures
```

### 문법 검사

workflow가 다음 파일을 포함해야 합니다.

```text
PolishedMiniatureFactory.js
MiniatureBodyProfiles.js
HumanoidMiniatureRig.js
SkeletonMiniatureRig.js
CreatureMiniatureBuilders.js
ExoticMiniatureBuilders.js
MiniatureWeaponBuilders.js
MiniaturePhase3Equipment.js
OrcMiniaturePolish.js
MiniaturePresentationPolish.js
MiniatureAnimator.js
AdvancedMiniatureAnimator.js
CombatPresentationBridge.js
DungeonRendererPhase8.js
recipes.js
partCatalog.js
StrategyObserverShell.js
miniature-polish-smoke.mjs
```

### 수동 확인

```bash
python -m http.server 8000
```

브라우저에서 다음을 확인합니다.

- 콘솔 parse/runtime error 없음
- 각 role의 손과 장비 정렬
- 공격 frame과 hit effect 일치
- 화살 release 시 손에 화살이 남지 않음
- 사망 후 2.4초 동안 corpse가 보이고 제거됨
- flying·spectral shadow가 지상형보다 약함
- 동일 role 여러 개체가 같은 seed처럼 보이지 않음

---

## 10. 인계 시 주의사항

- `PolishedMiniatureFactory.js`는 과거 작업 중 파일이 중간에서 잘린 이력이 있습니다. 전체 파일 교체 후 반드시 `node --check`를 실행합니다.
- factory·recipes·partCatalog는 함께 변경합니다. 하나만 갱신하면 runtime builder lookup이 깨질 수 있습니다.
- miniature root scale과 model baseScale을 혼동하지 않습니다. corpse scaling과 breathing scaling이 서로 덮어쓰지 않도록 분리합니다.
- `alive: false`를 presentation 때문에 다시 simulation state에서 true로 바꾸지 않습니다. renderer의 visual copy만 사용합니다.
- 새 monster role을 추가할 때 `AgentAI` role 목록, recipe, skeleton builder, animator, tests를 함께 대조합니다.
- authored GLB가 들어오더라도 절차적 miniature는 삭제하지 않습니다. 공식 fallback으로 유지합니다.
- 새 기능을 `Phase9` 같은 새 상속 계층으로 추가하지 않습니다. named module과 composition을 사용합니다.

---

## 11. Developer #2 완료 정의

Developer #2의 캐릭터·몬스터 presentation 영역은 다음 조건을 만족할 때 프로덕션 수준으로 완료된 것으로 봅니다.

- 모든 공식 role에 명시적 recipe 또는 의도된 fallback이 있음
- 30·60·144fps에서 animation timing이 안정적임
- 공격과 impact effect가 실제 event timestamp로 동기화됨
- 각 종의 death silhouette가 구분됨
- gallery의 모든 상태가 screenshot regression으로 보호됨
- 20개체 이상 stress scene에서 합의된 frame budget을 충족함
- authored asset과 procedural fallback이 같은 stable asset ID를 사용함
- miniature 관련 CI가 green이며 기존 red workflow와 원인 범위가 분리됨
- simulation 규칙과 Three.js presentation 사이에 prototype patch가 남아 있지 않음
