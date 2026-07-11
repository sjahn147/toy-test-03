# Content schemas

`content/schemas/`는 authored 콘텐츠 JSON의 **구조 계약**을 저장합니다.

```text
campaign.manifest.schema.json   content/campaigns/<campaign>/campaign.manifest.json
asset-catalog.schema.json       content/assets/asset-catalog.json
```

## 누가 소비하나요

이 프로젝트에는 빌드 단계와 npm 의존성이 없으므로 ajv 같은 외부 밸리데이터를 쓰지 않습니다. 대신 `src/content/ContentValidator.js`가 이 파일들을 런타임·테스트 시점에 직접 읽어 검사합니다.

```text
campaign.manifest.json
→ ContentRegistry
→ ContentValidator (이 스키마 + 도메인 규칙)
→ ScenarioCompiler
```

자체 밸리데이터가 소비하기 때문에 스키마는 draft-07 문법 중 **단순한 부분집합**만 사용합니다.

- `type`, `required`, `properties`, `items`, `enum`
- `description` (문서용, 검사에는 사용하지 않음)

`pattern`, `oneOf`, `$ref` 같은 키워드는 밸리데이터가 지원할 때까지 추가하지 않습니다. 스키마로 표현할 수 없는 규칙(ID 고유성, connection endpoint 존재, 그래프 연결성 등)은 ContentValidator의 도메인 검사가 담당합니다.

## schemaVersion 진화 규칙

스키마와 manifest는 `schemaVersion`을 공유합니다.

- 필드 추가처럼 **하위 호환** 변경은 schemaVersion을 유지하고 스키마의 `properties`만 확장합니다.
- 필드 이름 변경, required 추가, enum 축소처럼 **호환이 깨지는** 변경은 schemaVersion을 올리고, `src/content/migrations/`에 이전 버전 마이그레이션을 추가한 뒤 manifest를 함께 갱신합니다.
- 콘텐츠 값만 바뀌면 manifest의 `contentVersion`만 올립니다 (`content/README.md` 참고).

스키마를 수정하면 `node tests/content-pipeline-smoke.mjs`로 기존 manifest가 여전히 통과하는지 확인합니다.
