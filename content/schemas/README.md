# Content schemas

`content/schemas/`는 authored 콘텐츠 JSON의 **구조 계약**을 저장합니다.

```text
campaign.schema.json            content/campaigns/<campaign>/campaign.manifest.json
asset-catalog.schema.json       content/assets/asset-catalog.json
```

`campaign.schema.json`은 Sleeping Citadel 캠페인 콘텐츠를 저작한 작업자가 만든 완전한
JSON Schema(draft 2020-12, `$ref`/`$defs`/`oneOf`/`prefixItems` 포함)입니다. 아래 "누가
소비하나요" 절의 자체 워커는 이 키워드들을 해석하지 않으므로, 실질적인 구조 검증은
`src/content/ContentValidator.js`의 수기 도메인 체크가 담당합니다. `asset-catalog.schema.json`은
이 프로젝트가 직접 작성한, 자체 워커 전용의 단순 스키마입니다.

## 누가 소비하나요

이 프로젝트에는 빌드 단계와 npm 의존성이 없으므로 ajv 같은 외부 밸리데이터를 쓰지 않습니다. 대신 `src/content/ContentValidator.js`가 이 파일들을 런타임·테스트 시점에 직접 읽어 검사합니다.

```text
campaign.manifest.json
→ ContentRegistry
→ ContentValidator (이 스키마 + 도메인 규칙)
→ ScenarioCompiler
```

자체 밸리데이터(`validateAgainstSchema`)는 draft-07 문법 중 **단순한 부분집합**만 해석합니다.

- `type`, `required`, `properties`, `items`, `enum`
- `description` (문서용, 검사에는 사용하지 않음)

`pattern`, `oneOf`, `$ref`, `prefixItems` 같은 키워드는 워커가 무시합니다 — `campaign.schema.json`처럼
이런 키워드로 표현된 하위 제약은 스키마 검사에서 통과된 것으로 보이지 않게, `src/content/ContentValidator.js`의
수기 도메인 검사(ID 고유성, connection endpoint 존재, 그래프 연결성, kind별 최소 크기, faction 런타임
바인딩 존재 등)가 실제 계약을 담당합니다. `campaign.manifest.json`의 factions[]에는 lair/species 정보가
없으므로 그 부분은 `src/content/legacyMappings.js`의 `FACTION_RUNTIME_BINDINGS`/`WILDLIFE_BINDINGS`가
공급하며, `validateCampaign`은 manifest뿐 아니라 이 바인딩 테이블도 함께 검사합니다.

## schemaVersion 진화 규칙

스키마와 manifest는 `schemaVersion`을 공유합니다.

- 필드 추가처럼 **하위 호환** 변경은 schemaVersion을 유지하고 스키마의 `properties`만 확장합니다.
- 필드 이름 변경, required 추가, enum 축소처럼 **호환이 깨지는** 변경은 schemaVersion을 올리고, `src/content/migrations/`에 이전 버전 마이그레이션을 추가한 뒤 manifest를 함께 갱신합니다.
- 콘텐츠 값만 바뀌면 manifest의 `contentVersion`만 올립니다 (`content/README.md` 참고).

스키마를 수정하면 `node tests/content-pipeline-smoke.mjs`로 기존 manifest가 여전히 통과하는지 확인합니다.
