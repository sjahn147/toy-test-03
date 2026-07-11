# Strategy simulation UI surface design

## 1. 목표

현재 관찰 화면은 우측 HUD에 개체 정보, 파티 자원, 거점, 물류, 공성, 성격, 이벤트 로그를 계속 추가해 왔습니다. 기능 검증에는 유효하지만 프로덕션 UI로는 다음 문제가 있습니다.

- 전역 정보와 선택 개체 정보가 같은 계층에 있습니다.
- 수십 개 metric이 같은 시각적 중요도로 표시됩니다.
- 방, 세력, 거점, 파티를 탐색하는 전용 표면이 없습니다.
- 이벤트가 단순 텍스트 로그로만 남습니다.
- 카메라·오버레이·선택 상태가 명시적인 UI state로 관리되지 않습니다.
- 모바일에서 지도 영역과 정보 패널이 서로 공간을 빼앗습니다.

최종 UI는 전통적인 전략 시뮬레이션의 정보 계층을 사용하되, 이 게임의 핵심인 **관찰과 이야기성**을 유지합니다.

---

## 2. 전체 화면 구조

### 데스크톱

```text
┌──────────────────── Global command & resource bar ────────────────────┐
│ time speed | observer faction | population | supply | alerts | menu   │
├───────────────┬───────────────────────────────────────┬───────────────┤
│               │                                       │               │
│ Faction /     │                                       │ Context       │
│ Party /       │              3D world                 │ Inspector     │
│ Settlement    │                                       │               │
│ Navigator     │                                       │               │
│               │                                       │               │
├───────────────┴───────────────────────────────────────┴───────────────┤
│ overlay toolbar                  event timeline / chronicle            │
└───────────────────────────────────────────────────────────────────────┘
```

### 기본 레이아웃 비율

- 상단 바: 48~56px
- 좌측 navigator: 260~320px, 접기 가능
- 우측 inspector: 320~400px, 접기 가능
- 하단 timeline: 110~180px, 확장 가능
- 중앙 viewport: 남은 전체 공간

모든 패널은 viewport 위에 불투명하게 덮기보다 반투명 레이어와 명확한 경계를 사용합니다.

---

## 3. 정보 계층

UI 정보는 다섯 계층으로 나눕니다.

### 3.1 전역

캠페인 전체 상태입니다.

- 시간과 속도
- 전체 개체 수
- 활성 세력 수
- 활성 거점 수
- 분쟁 방 수
- 활성 공성 수
- 주요 알림

### 3.2 관찰 세력

현재 비교 기준으로 선택한 세력의 상태입니다.

- 인구 / capacity
- 식량, 물, 자재, 의약품, 부
- 영토 수
- 보급 상태
- 운반 중 화물
- 위협받는 거점
- 외교 관계

관찰 세력을 변경해도 직접 조종권이 생기지는 않습니다. 표시 기준과 오버레이 색상만 바뀝니다.

### 3.3 컬렉션

동일 유형의 목록입니다.

- 세력
- 파티
- 거점
- 방
- 주요 개체
- 보급로
- 공성

### 3.4 선택 대상

한 개체, 방, 거점, 화물, 구조물, 파티의 상세 정보입니다.

### 3.5 사건

시간 순서의 세계 이벤트입니다.

- 전투
- 사망
- 점령
- 건설
- 붕괴
- 거래
- 발견
- 관계 변화
- 희귀 사건

---

## 4. 상단 Global Bar

### 4.1 왼쪽: 시간 제어

```text
[Pause] [1×] [2×] [4×]  Day 12 · 03:40
```

기능:

- 일시정지
- 속도 변경
- 정상 속도로 복귀
- 주요 이벤트 발생 시 자동 감속 옵션

### 4.2 중앙: 관찰 세력 자원

선택한 세력에 따라 표시합니다.

```text
Faction Crest  Red-Tusk Tribe
Population 18/24
Food 32
Materials 14
Supply 9
Territory 7
```

모험가 세력일 때는 다음을 표시합니다.

```text
Adventurers 11/16
Provisions 22
Water 19
Medicine 6
Wealth 41
Bases 2
```

### 4.3 오른쪽: 경보와 메뉴

- 공성
- 봉쇄
- 거점 붕괴
- 파티 전멸 위험
- 숙주화·감염 확산
- 중요 발견
- 설정
- 도움말

경보 아이콘은 숫자 badge를 갖고 클릭 시 관련 entity 목록을 엽니다.

---

## 5. 좌측 Navigator

탭 구조:

```text
[Factions] [Parties] [Settlements] [Rooms]
```

### 5.1 Factions

각 행:

- 문장
- 이름
- 인구 / capacity
- 영토 수
- 대표 자원
- 관계 상태
- 위협 아이콘

정렬:

- 중요도
- 인구
- 영토
- 현재 위협

### 5.2 Parties

각 행:

- 파티명
- 구성원 수
- 리더
- 현재 상태
- endurance
- 현재 목표
- base

상태:

```text
exploring
returning
camping
split
orphaned
besieging
settling
```

### 5.3 Settlements

각 행:

- 거점 이름과 tier
- 세력
- 인구 / capacity
- integrity
- control
- supply status
- upgrade readiness

### 5.4 Rooms

필터:

- 발견됨 / 미발견
- 소유 세력
- 방 유형
- 자원
- 위험도
- 비밀
- 거점 가능

방 클릭 시 카메라가 해당 방으로 이동하고 inspector가 방 모드로 바뀝니다.

---

## 6. 우측 Context Inspector

선택 유형마다 전용 view-model을 사용합니다.

### 6.1 Agent inspector

#### Header

- 초상 또는 미니어처 실루엣
- 이름
- 역할·클래스
- 레벨
- 세력
- 추적 버튼

#### Vital card

- HP
- 피로
- 배고픔
- 스트레스
- 상태 이상

#### Intent card

- 현재 행동
- 목표 entity
- 목표 방
- 행동 utility 상위 3개
- 최근 판단 이유

#### Social card

- 파티
- 리더
- 관계 상위 3명
- 원한
- 최근 기억

#### Equipment card

- 슬롯
- 장비
- 내구도
- 공격·방어 변화

#### Home card

- 서식지·거점
- attachment
- 현재 거리
- 귀환 성향

### 6.2 Room inspector

- 방 이름과 구역
- 발견 상태
- 크기와 usable capacity
- 소유권과 control
- 위험도
- 자원 노드
- 현재 개체
- 구조물
- 출입구와 비밀통로
- 환경 상태
- 스토리 조각
- 거점 발전 가능성

### 6.3 Settlement inspector

- 이름, tier, 상태
- faction
- 주민 / capacity / guest capacity
- integrity와 control
- 식량·물·의약품·자재·부
- comfort, security, recovery
- supply route
- 건물 목록과 내구도
- 현재 건설 작업
- upgrade 후보와 부족 자원
- 최근 공격

### 6.4 Party inspector

- 이름과 리더
- 멤버 roster
- cohesion
- objective
- expedition endurance
- provisions / water / medicine
- shared inventory
- current base
- retreat threshold
- split/orphan 상태

### 6.5 Cargo inspector

- 자원 종류와 양
- 원래 세력
- 현재 소유 세력
- source와 destination
- carrier와 escort
- route risk
- 배송 상태
- 최근 약탈 사건

### 6.6 Structure inspector

- 종류
- faction
- integrity
- 건설 진행도
- 방어·capacity·comfort bonus
- siege target priority

---

## 7. 하단 Event Timeline

기존 로그를 구조화된 chronicle로 대체합니다.

### 기본 형태

```text
03:11  [Combat]  Ogre A downed Berric Holt in the Bone Nave
03:18  [Logistics] Goblin cargo was raided in Low Crossing
03:24  [Settlement] The Old Inn advanced to tier 2
```

### 필터

- All
- Combat
- Ecology
- Party
- Settlement
- Logistics
- Discovery
- Relationship
- Major only

### 기능

- 이벤트 클릭 시 관련 방으로 카메라 이동
- actor와 target inspector 열기
- 중요 사건 pin
- 시간 범위 필터
- 세션 종료 시 chronicle export

### severity

```text
ambient
minor
major
critical
historic
```

`historic` 사건은 캠페인 연대기에 영구 기록됩니다.

---

## 8. 오버레이 Toolbar

중앙 viewport 하단 또는 좌측 하단에 배치합니다.

```text
[Normal] [Territory] [Supply] [Danger] [Population]
[Resources] [Infection] [Noise] [Secrets] [Path Intent]
```

### Territory

- 방 바닥을 세력색으로 표시
- contested 경계 애니메이션
- 거점 tier 아이콘

### Supply

- 보급로 선
- 안전도 색상
- 운반 중 화물
- 봉쇄된 노드
- 매복 지점

### Danger

- 적대 개체 밀도
- 함정
- 감염
- 공성
- 보스 영향권

### Population

- 방별 개체 수
- capacity 초과
- spawn pressure

### Resources

- 식량
- 물
- 자재
- death energy
- biomass

### Secrets

발견된 비밀문만 표시합니다. 미발견 비밀은 UI 데이터에도 노출하지 않습니다.

### Path Intent

선택 개체·파티의 현재 경로와 목표를 표시합니다.

---

## 9. 알림 체계

알림은 모든 이벤트를 띄우지 않습니다.

### Critical

- 거점 붕괴
- 파티 전멸 직전
- 보스 출현
- 여관 파괴
- 캠페인 핵심 방 점령

### Major

- 새 거점
- tier 상승
- 공성 시작
- 보급 봉쇄
- 비밀통로 발견
- 새 파티 결성

### Minor

- 장비 획득
- 일반 출생
- 일반 배송

사용자는 severity별 자동 일시정지와 카메라 이동을 설정할 수 있습니다.

---

## 10. 카메라 UI

### 모드

```text
Overview
Free
Follow
Cinematic Event
```

### Overview

- 맵 전체 중심
- 현재 overlay와 함께 전략 관찰
- navigator 클릭 시 부드러운 focus

### Free

#### 마우스

- 좌클릭 드래그: pan
- 우클릭 드래그: orbit
- 휠: zoom
- 더블클릭: entity focus

#### 터치

- 한 손가락 드래그: pan
- 두 손가락 핀치: zoom
- 두 손가락 회전: orbit
- 두 번 탭: focus
- 길게 누르기: 선택

### Follow

- 명시적인 `followTargetId`
- 선택 대상이 통로를 이동해도 계속 추적
- 사용자가 orbit과 zoom을 조정해도 target lock 유지
- roster에서 다음 대상 선택
- 사망 시 시체를 일정 시간 추적한 뒤 정책에 따라 전환

Follow policy:

```text
stay-on-corpse
switch-to-party-leader
switch-to-killer
stop-following
```

### Cinematic Event

중요 사건 알림에서만 일시적으로 사용합니다. 사용자가 움직이면 즉시 해제됩니다.

---

## 11. UI state

시뮬레이션과 분리된 UI state를 둡니다.

```js
{
  selectedEntityId,
  selectedEntityType,
  observerFactionId,
  navigatorTab,
  overlayType,
  timelineFilters,
  followTargetId,
  cameraMode,
  panelVisibility,
  alertPreferences
}
```

UI state는 저장 파일에 선택적으로 포함할 수 있지만 simulation 결과에는 영향을 주지 않습니다.

---

## 12. Selector 계약

```text
selectGlobalBar
selectObserverFactionSummary
selectFactionList
selectPartyList
selectSettlementList
selectRoomList
selectAgentInspector
selectRoomInspector
selectSettlementInspector
selectPartyInspector
selectCargoInspector
selectStructureInspector
selectTimelineEvents
selectOverlayDescriptor
selectFollowRoster
selectAlerts
```

각 selector는 plain object만 반환합니다. DOM과 Three.js 객체를 반환하지 않습니다.

---

## 13. 데스크톱 반응형 규칙

### 1440px 이상

- 좌우 패널 동시 표시
- timeline 기본 140px

### 1024~1439px

- 좌측 260px
- 우측 320px
- timeline 120px

### 768~1023px

- 한쪽 패널만 표시
- tab으로 navigator와 inspector 전환
- timeline 접힘 기본

---

## 14. 모바일 UI

모바일에서는 데스크톱 패널을 축소 복제하지 않습니다.

### 화면 구조

```text
compact top bar
3D viewport
floating overlay/camera buttons
bottom sheet
```

### bottom sheet 상태

- collapsed: 선택 대상 이름과 핵심 수치
- half: 핵심 inspector와 actions
- full: 전체 정보와 timeline

### 모바일 top bar

- pause/speed
- 경보
- 관찰 세력 자원 2~3개
- 메뉴

### 모바일 navigator

전체 화면 drawer로 표시합니다.

### 터치 목표

- 최소 44px
- 작은 개체 선택 시 raycast 보정 반경 적용
- 두 손가락 입력과 entity tap을 구분

---

## 15. 시각 언어

### 색상

- 배경: 어두운 청보라·석재색
- 정보 카드: 반투명 짙은 패널
- 금색: 선택·중요 자원
- 푸른색: 모험가와 안전
- 붉은색: 즉각적 위험
- 주황색: 보급 위협
- 보라색: 사령·저주
- 녹색: 생체·균류·독

세력색은 UI 의미색과 충돌하지 않도록 테두리나 문장에 사용합니다.

### 숫자 표현

- 전역 bar에는 정수와 짧은 단위
- 상세 inspector에는 정확한 값
- 비율은 bar와 숫자를 함께 표시
- 변동은 화살표와 delta로 표시

### 아이콘

모든 주요 시스템은 일관된 아이콘 family가 필요합니다.

- population
- capacity
- food
- water
- medicine
- materials
- wealth
- supply
- control
- integrity
- comfort
- security
- stress
- infection
- siege
- secret

---

## 16. 접근성

- 색상만으로 상태를 전달하지 않습니다.
- 모든 아이콘에 label과 tooltip을 둡니다.
- UI scale 80~140% 지원
- reduce motion 옵션
- 고대비 territory overlay
- 키보드 focus와 단축키
- 이벤트 타임라인 screen-reader label

권장 단축키:

```text
Space     pause
1/2/3/4   speed
F         follow selected
Esc       clear selection / close panel
T         territory overlay
S         supply overlay
D         danger overlay
R         reset camera
```

---

## 17. 구현 단위

### UI-01 Shell

- top bar
- left navigator
- right inspector
- bottom timeline
- panel state

### UI-02 View-model boundary

- selectors
- normalized IDs
- no direct system access

### UI-03 Selection surfaces

- agent
- room
- settlement
- party
- cargo
- structure

### UI-04 Overlays

- territory
- supply
- danger
- population
- resources
- secrets

### UI-05 Camera

- pan/orbit/zoom
- persistent follow
- roster
- event focus

### UI-06 Mobile

- compact bar
- bottom sheet
- drawer navigator

### UI-07 Chronicle

- structured timeline
- filter
- focus
- export

---

## 18. 완료 기준

프로덕션 UI는 다음 조건을 만족해야 합니다.

- 우측 패널 하나에 모든 metric을 쌓지 않습니다.
- 전역, 세력, 컬렉션, 선택 대상, 사건이 분리됩니다.
- 방·거점·파티·화물을 동일한 방식으로 선택할 수 있습니다.
- overlay가 simulation 내부 Map을 직접 읽지 않습니다.
- follow target이 명시적으로 유지됩니다.
- 모바일에서 viewport가 최소 화면 높이의 55%를 확보합니다.
- 주요 사건을 timeline에서 다시 찾아 카메라로 이동할 수 있습니다.
- 새로운 시스템은 selector와 manifest 등록만으로 UI에 surface를 추가할 수 있습니다.
