# Runtime binary assets

`assets/`는 브라우저가 실제로 로드하는 **바이너리 제작물**의 위치입니다. 지금까지의 Three.js 절차적 geometry 코드는 이 디렉터리에 옮기지 않습니다. 절차적 factory는 `src/`에 남아 authored 파일이 없거나 로드에 실패했을 때 사용하는 공식 fallback입니다.

## 디렉터리 계약

```text
assets/
  models/
    environment/
      common/
      zones/
    props/
      facilities/
      settlements/
      habitats/
      inn/
      campaign/
    characters/
    creatures/
    equipment/
  textures/
    environment/
    characters/
    effects/
  materials/
  audio/
    ambience/
    events/
    ui/
  ui/
  licenses/
```

Git은 빈 디렉터리를 보존하지 않으므로 현재는 이 README만 존재할 수 있습니다. 실제 제작물이 추가되면 위 구조를 따릅니다.

## 해석 순서

콘텐츠는 파일 경로가 아니라 `content/assets/asset-catalog.json`의 안정적인 ID를 참조합니다.

```text
campaign room landmarkBundle
→ asset catalog ID
→ authored GLB / image / audio
→ procedural composite fallback
→ primitive diagnostic marker
```

예시:

```text
inn.old-lantern.common-room
→ assets/models/props/inn/old-lantern-common-room.glb
→ InnAssetFactory.commonRoom
→ diagnostic.landmark
```

## authored asset 규칙

- 기본 모델 형식은 GLB 2.0입니다.
- 좌표계는 Y-up, meter scale입니다.
- 원점은 바닥 중심 또는 catalog에 선언된 socket origin입니다.
- 반복 가능한 소품은 instancing을 고려합니다.
- 파괴 가능한 구조물은 3–6개의 분리 가능한 chunk를 권장합니다.
- 동적 상호작용 프롭은 `interaction`, `storage`, `service`, `seating`, `sleeping`, `light`, `damage`, `factionBanner`, `spawn`, `secretDoor` 소켓 중 필요한 항목을 제공합니다.
- room port와 대형 개체 통로를 침범하지 않도록 footprint metadata를 제공합니다.
- authored 파일을 추가해도 procedural fallback을 삭제하지 않습니다.

## 라이선스

외부 어셋은 반드시 다음을 함께 추가합니다.

```text
assets/licenses/<pack-id>/LICENSE.txt
assets/licenses/<pack-id>/SOURCE.md
```

`SOURCE.md`에는 원본 URL, 제작자, 다운로드 날짜, 수정 여부, 적용 범위를 기록합니다. hotlinking은 허용하지 않으며 프로젝트가 배포하는 파일은 저장소 또는 정식 asset delivery 경로에 vendoring합니다.

## 제작 우선순위

P0 vertical slice:

1. 공통 석재 room kit
2. A01 등불 광장과 A03 성채 대문
3. H36 Old Lantern 접객실
4. H37 주방
5. I41 중앙 교차시장
6. 납골당 핵심 kit
7. 프로덕션 UI icon atlas

P1 campaign:

- 여관 나머지 세 방과 복원·파괴 variant
- 침수·균류·거미·오크·연구소·왕실 zone kit
- hero diorama와 구역 ambient audio

전체 목록과 수량, 상태, 기술 규격은 `docs/assets/content-asset-inventory.md`를 따릅니다.
