# Authored content source of truth

`content/`는 캠페인, 방, UI 표면, 어셋 ID처럼 **사람이 설계하는 게임 콘텐츠**를 저장합니다.

현재 브라우저 런타임은 기존 JavaScript 시나리오와 procedural factory를 사용합니다. 이 디렉터리는 이후 `ContentRegistry`와 `ScenarioCompiler`가 읽을 데이터 계약을 먼저 확정하기 위해 추가되었습니다.

## `content/`와 `assets/`의 차이

```text
content/  JSON 기반 설계 데이터와 참조 ID
assets/   GLB, 이미지, 오디오, 셰이더, 라이선스 같은 실제 파일
src/      로더, 시스템, 렌더러, UI 코드
```

예를 들어 방은 `content/`에서 다음처럼 어셋 ID를 참조합니다.

```json
{
  "id": "inn-common-room",
  "propBundles": ["inn.common-room.ruined", "lighting.hearth.warm"]
}
```

실제 모델 파일은 asset catalog를 통해 해석합니다.

```text
inn.common-room.ruined
→ assets/models/props/inn/common-room-ruined.glb
→ 없으면 InnAssetFactory procedural fallback
```

## 디렉터리

```text
content/
  campaigns/
    sleeping-citadel/
      campaign.manifest.json
  assets/
    asset-catalog.json
  ui/
    surface-manifest.json
  schemas/
```

## ID 규칙

ID는 파일 경로가 아니라 안정적인 공개 계약입니다.

### 캠페인과 방

```text
campaign.sleeping-citadel
zone.sleeping-citadel.gate
room.sleeping-citadel.gate.safe-plaza
```

### 어셋

```text
roomkit.stone.ossuary
inn.common-room.tier3
lair.spider.queen-nest
ui.icon.settlement.blockaded
```

### 이벤트

```text
settlement.founded
settlement.upgraded
logistics.cargo-raided
campaign.secret-discovered
```

## 콘텐츠 버전

각 manifest는 다음을 포함합니다.

```json
{
  "schemaVersion": 1,
  "contentVersion": "0.1.0"
}
```

- `schemaVersion`: 구조가 변경될 때 증가합니다.
- `contentVersion`: 밸런스, 방 구성, 텍스트처럼 콘텐츠가 변경될 때 증가합니다.

저장 파일은 두 값을 함께 기록해야 합니다.

## authoring 원칙

- 방의 기능은 `tags`와 `systems`로 선언합니다.
- 시뮬레이션 규칙을 방 설명 텍스트에만 숨기지 않습니다.
- 실제 파일 경로는 campaign manifest에 직접 쓰지 않습니다.
- 모든 prop은 asset bundle ID를 사용합니다.
- 신규 방은 최소 크기, 출입 포트, 대형 개체 통과 여부를 명시합니다.
- secret connection은 일반 connection과 분리합니다.
- settlement 후보는 capacity와 upgrade potential을 명시합니다.
- 각 방은 최소 하나의 시각적 landmark와 하나의 ecosystem hook을 가집니다.

## 런타임 전환 전 상태

이 manifest들은 현재 **설계 및 인계용**입니다. 런타임 배선은 `docs/migration/production-content-migration.md`의 단계에 따라 진행합니다.

manifest를 추가했다는 이유만으로 현재 시나리오에서 자동 실행된다고 가정하지 않습니다.
