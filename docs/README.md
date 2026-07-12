# Production documentation index

이 디렉터리는 현재 프로토타입을 프로덕션형 던전 생태 시뮬레이션으로 확장하기 위한 기준 문서 모음입니다.

## 현재 상태와 부채

- [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md)
  - 최신 `main` 커밋 기준 완료 기능과 실제 잔여 부채의 구분
  - 캠페인 맵, 열린 PR 통합, 시뮬레이션·프레젠테이션, 아키텍처, QA, 성능 부채
  - 우선순위, 담당 트래커, 완료 조건과 권장 실행 순서

새 작업을 시작하기 전에 이 문서의 검증 기준 SHA와 해당 부채 ID를 확인합니다.

## 문서의 우선순위

다음 문서는 이후 구현의 기준이 되는 **authoritative design documents**입니다.

1. [`architecture/production-layering.md`](architecture/production-layering.md)
   - 런타임, 콘텐츠, 어셋, UI 경계
   - 기존 `Phase*` 체인의 점진적 마이그레이션
   - 새 기능을 추가할 때 지켜야 할 의존성 방향
2. [`ui/strategy-ui-surface.md`](ui/strategy-ui-surface.md)
   - 전략 시뮬레이션형 화면 구조
   - 상단 자원 바, 세력 탐색기, 선택 패널, 이벤트 타임라인, 오버레이
   - 데스크톱·모바일·카메라 상호작용
3. [`campaigns/sleeping-citadel-overview.md`](campaigns/sleeping-citadel-overview.md)
   - 대형 캠페인의 세계관, 세력, 구역, 진행 구조
4. [`campaigns/sleeping-citadel-room-bible.md`](campaigns/sleeping-citadel-room-bible.md)
   - 63개 방의 시각 콘셉트, 기능, 생태 상호작용, 소품과 상태 변화
5. [`assets/content-asset-inventory.md`](assets/content-asset-inventory.md)
   - 현재 재사용 가능한 절차적 어셋
   - 신규 제작이 필요한 디오라마와 UI·오디오 자산
   - 특히 여관과 캠페인 전용 자산의 제작 범위
6. [`migration/production-content-migration.md`](migration/production-content-migration.md)
   - 빅뱅 리팩터 없이 데이터 중심 구조로 이동하는 순서
   - 호환 계층과 완료 조건
7. [`handoff/workstream-plan.md`](handoff/workstream-plan.md)
   - 병렬로 나눌 수 있는 작업 스트림
   - 의존성, 산출물, 인수 조건
8. [`handoff/developer-2-character-monster-presentation.md`](handoff/developer-2-character-monster-presentation.md)
   - Developer #2 캐릭터·몬스터 miniature presentation 담당 범위
   - 완료된 모델링·리깅·전투·사망 presentation
   - 알려진 기술 부채, 후속 우선순위와 acceptance 기준
9. [`handoff/developer-3-campaign-landmarks.md`](handoff/developer-3-campaign-landmarks.md)
   - Developer #3 캠페인 랜드마크 책임 범위와 완료 매트릭스
   - 남은 절차적 hero/zone-completion asset의 PR·배선·배치 상태
   - 최종 캠페인 맵 placement/wiring audit 완료 조건

## 기계 판독 가능한 설계 자료

문서와 함께 다음 `content/` 자료가 런타임 콘텐츠 계약을 정의합니다.

- [`../content/campaigns/sleeping-citadel/campaign.manifest.json`](../content/campaigns/sleeping-citadel/campaign.manifest.json)
- [`../content/assets/asset-catalog.json`](../content/assets/asset-catalog.json)
- [`../content/ui/surface-manifest.json`](../content/ui/surface-manifest.json)
- [`../content/schemas/campaign.schema.json`](../content/schemas/campaign.schema.json)
- [`../content/schemas/asset-catalog.schema.json`](../content/schemas/asset-catalog.schema.json)
- [`../content/schemas/ui-surface.schema.json`](../content/schemas/ui-surface.schema.json)
- [`../content/README.md`](../content/README.md)

Sleeping Citadel manifest와 asset catalog는 현재 `ScenarioCompiler`가 레거시 시나리오 shape로 결정론적으로 컴파일합니다. 다만 manifest에 없는 런타임 바인딩과 공간 규칙을 `legacyMappings` 및 호환 계층이 보강하고 있으므로, 완전한 데이터 중심 런타임으로의 마이그레이션은 아직 진행 중입니다. UI surface manifest와 일부 authored asset 경로 역시 아직 모든 런타임 화면에서 직접 소비되지는 않습니다.

## 계약 검증

콘텐츠를 변경한 뒤 다음 명령을 실행합니다.

```bash
npm run validate:production-content
```

검증 범위:

- JSON과 `$schema` 파일 참조
- 63개 방·13개 구역·초기 진입점
- 일반·조건부·비밀 연결의 방 참조와 그래프 도달성
- 구역별 방 목록과 방의 `zoneId` 일치
- 초기 세력 위치
- 모든 방의 landmark bundle과 모든 zone kit가 asset catalog에 존재하는지
- asset template·authored path·여관 vertical slice coverage
- UI surface ID, region, selector, command, selection type, 접근성 최소값

동일 검사는 `.github/workflows/production-content-contract.yml`에서 콘텐츠·문서 변경 시 실행됩니다.

## 기존 기술 문서

다음 문서는 현재 구현의 세부 계약을 설명하며 계속 유효합니다.

- [`modular-miniatures.md`](modular-miniatures.md): 모듈형 미니어처 소켓과 파츠
- [`port-corridor-system.md`](port-corridor-system.md): 방 포트, 문, 통로, 연속 이동
- [`production-roadmap.md`](production-roadmap.md): 초기 프로덕션 방향과 역사적 로드맵
- [`asset-licensing.md`](asset-licensing.md): 존재하는 경우 외부 어셋 라이선스 관리

## 현재 코드베이스를 읽는 순서

애플리케이션 작업자는 안정 facade에서 시작하고, 필요한 경우에만 호환 구현으로 내려갑니다.

```text
App
→ StrategyObserverScreen
→ DungeonSimulation
→ 개별 시스템(정착지, 원정, 물류, 건설·공성, 확장, 캠프 생활, 작업 활동)
→ StrategyDungeonRenderer
→ StrategyAssetRegistry
→ Phase* compatibility internals
→ 절차적 factory와 authored asset resolver
```

`Phase*` 파일 이름은 구현 역사에 따른 호환 구조입니다. 새 기능은 새로운 `Phase9`, `Phase10` 계층으로 추가하지 않고 명시적인 기능 모듈과 안정 조합 루트로 추가합니다.

## 인계 원칙

- 설계 의도와 런타임 동작이 충돌하면 실제 `main` 동작과 `TECHNICAL_DEBT.md`의 검증 SHA를 먼저 확인합니다.
- 캠페인 방이나 어셋을 추가할 때는 먼저 `content/` manifest를 갱신합니다.
- manifest, schema, 설계 문서는 같은 변경에서 함께 유지합니다.
- 시뮬레이션 시스템은 Three.js 객체를 직접 참조하지 않습니다.
- UI는 시뮬레이션 내부 객체를 직접 순회하지 않고 selector/view-model을 통해 읽도록 이동합니다.
- 절차적 어셋은 삭제 대상이 아니라 GLB·텍스처가 없을 때 사용하는 공식 fallback입니다.
- 실제 바이너리 파일은 `assets/`에 두고 라이선스와 원본 출처를 함께 기록합니다.
