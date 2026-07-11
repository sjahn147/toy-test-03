# 콘텐츠 어셋 인벤토리와 제작 명세

## 1. 목적

현재 프로젝트의 시각 요소는 대부분 Three.js primitive를 조립하는 절차적 factory로 구현돼 있습니다. 이는 외부 파일 없이 동작하는 fallback으로 유효하지만, 프로덕션 콘텐츠를 제작하려면 다음 세 층을 명확히 구분해야 합니다.

```text
Authored asset       실제 GLB·텍스처·오디오
Procedural composite 현재 AssetFactory가 생성하는 정식 fallback
Primitive emergency  누락을 표시하는 최소 진단 모델
```

이 문서는 현재 재사용 가능한 자산, 품질을 높여야 할 자산, 새로 제작해야 할 캠페인 자산을 제작 단위로 분류합니다.

---

# 2. 상태 분류

- **REUSE:** 현재 품질로도 캠페인 제작에 사용할 수 있습니다.
- **UPGRADE:** 구조는 재사용하지만 메시·재질·애니메이션 품질을 높여야 합니다.
- **AUTHOR:** authored GLB 또는 텍스처 제작이 필요합니다.
- **FALLBACK:** 절차적 버전을 유지하되 기본 노출 대상은 아닙니다.
- **CONTENT:** 별도 모델보다 배치 recipe·variant 데이터가 핵심입니다.

우선순위:

- **P0:** 캠페인 vertical slice에 필수.
- **P1:** 첫 정식 캠페인 완성에 필수.
- **P2:** 다양성과 반복 플레이 품질을 높임.
- **P3:** polish 단계.

---

# 3. 현재 재사용 가능한 시스템 자산

## 3.1 던전 구조 kit

| Asset family | 상태 | 현재 기능 | 다음 단계 |
|---|---|---|---|
| room floor slab | UPGRADE / P0 | 방 크기별 바닥, 종류별 색상 | 석재·목재·금속·수면 material variant |
| segmented wall | UPGRADE / P0 | 포트가 있는 벽 분절 | 모서리·균열·기둥·높이 variant |
| door frame | UPGRADE / P0 | 포트 좌표와 정렬 | 문짝, 잠금, 파괴 상태, 세력 장식 |
| corridor floor | UPGRADE / P0 | 직교 통로와 경계석 | 폭·재질·배수로·붕괴 variant |
| room marker | FALLBACK | 방 기능 링 | 프로덕션에서는 overlay가 담당 |
| connection topology | REUSE | port-to-port 계약 | authored geometry도 동일 좌표 계약 사용 |

### 필요한 authored 구조 kit

1. `kit.stone-common`
   - 바닥 타일 6종
   - 직선 벽 4종
   - 코너 4종
   - 문틀 3종
   - 균열·이끼 decal
2. `kit.residential`
   - 회벽, 목재 보, 생활 공간 바닥
3. `kit.flooded`
   - 수로, 수문, 물가 경계, 젖은 재질
4. `kit.industrial`
   - 금속 발판, 기어 벽, 파이프, 작업장 문
5. `kit.ossuary`
   - 뼈 선반, 장례 아치, 납골 벽
6. `kit.fungal`
   - 유기 바닥, 균사 벽, 발광 포자
7. `kit.spider`
   - 실크 표면, 고치 벽, 점착 통로
8. `kit.royal`
   - 대리석, 왕실 문장, 높은 기둥, 카펫
9. `kit.laboratory`
   - 관, 유리 수조, 룬 문, 금속 프레임
10. `kit.sanctum`
    - 거대 룬 바닥, 심장 관, 최종 성소 구조

---

## 3.2 시설 디오라마

현재 `FacilityAssetFactory` 계열은 여러 primitive를 결합해 다음 시설을 표현합니다.

| 시설 | 상태 | 재사용 범위 | authored 필요 |
|---|---|---|---|
| expedition gate | UPGRADE / P0 | A03, 캠프 관문 | 대형 문짝, 윈치, 방어 상태 |
| water fountain | UPGRADE / P0 | A01, B08, I44 | 물 셰이더, 수조 variant |
| rest site | CONTENT / P0 | 안전지대·캠프 | 의자·벤치·러그 다양성 |
| field camp | REUSE / P0 | 임시 거점 | 천막·침낭·보급 variant 추가 |
| merchant stall | UPGRADE / P1 | 입구·시장·여관 | 상인 진열물과 canopy authored kit |
| goddess statue | AUTHOR / P1 | A01, 성역 | 대표 hero asset 필요 |
| settlement habitat | UPGRADE / P1 | 몬스터 거점 표시 | 종별 silhouette 강화 |
| supply depot | REUSE / P0 | 모든 세력 물류 | faction skin과 손상 상태 |
| gatehouse | UPGRADE / P1 | 공성 관문 | 파괴 가능한 세그먼트 필요 |
| siege workshop | UPGRADE / P1 | 공성 제작 | 움직이는 공성 팔과 공구 |
| ambush post | REUSE / P1 | 매복 지점 | 세력별 위장재 variant |

---

## 3.3 미니어처와 장비

### 현재 계약

- 공통 소켓: root, pelvis, chest, head, headTop, handL, handR, shoulderL, shoulderR, back, waistFront, waistBack, baseFx.
- 역할 레시피와 장비 슬롯이 이미 분리돼 있습니다.
- authored character가 들어와도 소켓 이름과 role recipe는 유지합니다.

### 현재 재사용 가능한 역할

- Fighter, Rogue, Cleric, Wizard, Archer
- Goblin, Skeleton, Ogre, Slime, Mimic
- Spider, Rat
- Zombie, Orc, Myconid, Stirge, Carrion, Kobold, Wraith, Parasite

### 품질 단계

| 계열 | 상태 | 우선순위 | 필요 작업 |
|---|---|---:|---|
| 모험가 5역할 | UPGRADE | P0 | 얼굴·실루엣·장비 조합 다양화 |
| 고블린·코볼트 | UPGRADE | P1 | 체형·귀·도구 variant |
| 해골·좀비·레이스 | UPGRADE | P1 | 뼈 파츠, 사망 상태, 사령광 |
| 거미·스터지·기생충 | AUTHOR | P1 | 비인간 리그·천장 행동 표현 |
| 오크·오우거 | UPGRADE | P1 | 대형 장비, 공성 애니메이션 |
| 슬라임·균류 | UPGRADE | P2 | 변형·투명·포자 셰이더 |
| 미믹 | AUTHOR | P2 | 닫힘·개방·보행 애니메이션 |

### 장비 authored 우선 목록

- 무기: 검 4, 단검 3, 도끼 3, 활 3, 지팡이 4, 철퇴 3, 창 2.
- 보조: 원형 방패 3, 버클러 2, 성서 2, 오브 3.
- 머리: 투구 5, 후드 4, 마법 모자 3, 성직 관 2.
- 몸통: 가죽 4, 사슬 3, 판금 3, 로브 5, 거미줄·뼈·슬라임 특수 3.
- 액세서리: 부적 8, 전리품 6, 물약 belt 4.

장비는 개별 GLB보다 가능하면 같은 skeleton과 material atlas를 공유합니다.

---

# 4. 생태계 자산 인벤토리

## 4.1 서식지

| ID | 현재 | 상태 | 캠페인 사용 |
|---|---|---|---|
| habitat.goblin-hearth | procedural | UPGRADE | D19, 위성 굴 |
| habitat.ossuary | procedural | UPGRADE | E23, 전초 묘지 |
| habitat.spider-brood | procedural | AUTHOR | G33, G35 |
| habitat.slime-pool | procedural | UPGRADE | C11, K51 |
| habitat.rat-warren | procedural | REUSE | B06, C12, H37 |
| habitat.ogre-butcher | procedural | UPGRADE | J48, 외곽 굴 |
| habitat.plague-mortuary | procedural | UPGRADE | E22, 연구소 |
| habitat.orc-war-camp | procedural | UPGRADE | J46–J50 |
| habitat.fungal-colony | procedural | AUTHOR | F26–F30 |
| habitat.blood-roost | procedural | AUTHOR | G34, 높은 천장 방 |
| habitat.carrion-pit | procedural | UPGRADE | 시체 처리장 |
| habitat.kobold-trapworks | procedural | UPGRADE | D18, C14 |
| habitat.cursed-chapel | procedural | AUTHOR | E22, L59 |
| habitat.parasite-cistern | procedural | AUTHOR | K52 |

## 4.2 월드 상태 자산

- corpse bundle: 종별 소형·중형·대형, 뼈화·부패 단계.
- cocoon bundle: 빈 고치, 살아 있는 숙주, 부화 직전.
- infection marker: 피부·장비 위에 붙는 decal 또는 socket effect.
- territory marker: UI overlay가 기본이며 월드에는 작은 faction banner만 유지.
- spawn omen: 알, 기포, 뼈 더미, 포자낭, 사령 결정.
- food and biomass: 고기, 곡물, 썩은 유기물, 혈액 저장낭.
- cargo: 상자, 자루, 물통, 뼈 묶음, 폐철 운반대.

이들은 현재 절차적 자산을 계속 fallback으로 사용하되, 동일한 `asset ID` 아래 variant를 추가합니다.

---

# 5. 캠페인 구역별 신규 디오라마

## A. 안전지대

- `waystation.plaza.core` — P0 AUTHOR
- `waystation.registry.office` — P1 AUTHOR
- `gate.citadel.outer` — P0 AUTHOR
- `waystation.baggage.store` — P1 CONTENT/UPGRADE
- `stairs.citadel.descent` — P1 AUTHOR

## B. 주거구

- `residential.dormitory.ruined`
- `residential.kitchen.common`
- `residential.laundry.cistern`
- `residential.court.tenement`
- `chapel.household.small`

가구 kit가 핵심이며 동일 소품을 원래 상태·모험가 복원·고블린 점령에 재배치합니다.

## C. 침수 저장구역

- 저수조와 수문은 물 셰이더가 필요합니다.
- 배수 엔진은 회전 가능한 기어와 밸브를 포함합니다.
- 와인통·곡물통·포대는 H구역 여관과 재사용합니다.

## D. 산업 회랑

- 작업대, 폐철, 함정 부품, 시장 canopy, 화약통.
- 파괴 가능한 화약통과 연쇄 폭발 상태는 P1입니다.

## E. 납골 성당

- 납골 선반 modular kit.
- 장례 제단과 장례 종.
- 사령 우물 hero diorama.
- 이름 없는 석관 boss prop.

## F. 균류 정원

- 거대 버섯 8종.
- 포자 emitter, 균사 바닥, 생체량 주머니.
- 균사 핵 hero asset.
- 화재·고갈·복원 material state.

## G. 거미 군락

- 실크 ramp와 벽면 고치.
- 살아 있는 숙주 고치 3체형.
- 알집 cluster.
- 수직 우물과 실크 다리.
- 여왕 둥지·여왕 실루엣 P1 AUTHOR.

## H. 오래된 여관

여관은 캠페인 핵심이며 단일 프롭이 아니라 5개 방을 공유하는 **multi-room asset family**입니다.

### H36 Common Room

필수 authored 파츠:

- 4m 길이 바 카운터 modular segment.
- 술 선반과 병 12종.
- 대형 벽난로, 굴뚝, 장작, 불꽃 소켓.
- 원형·사각 식탁 4종.
- 의자·벤치 6종.
- 샹들리에와 벽등.
- 작은 공연 무대와 악기.
- 계단·난간.
- 여관 간판과 faction banner 소켓.
- 방어 셔터와 바리케이드 소켓.

### H37 Kitchen

- 대형 오븐·화덕.
- 조리대와 chopping socket.
- 냄비·팬·국자·칼·그릇.
- 식품 선반·향신료·빵·고기.
- 물통과 세척대.
- 연통·환기구.
- 슬라임 오염 overlay.

### H38 Guestrooms

- 객실문 4 variant.
- 침대 frame 3종과 담요 6 palette.
- 협탁·상자·벽등.
- 커튼·카펫.
- 파손·약탈·점유 상태.
- 거미 침투용 천장 socket.

### H39 Ale Cellar

- 술통 4종과 rack.
- 냉각 수로.
- 식량 저장 선반.
- 양조 탱크.
- 밀수 비밀문.
- 쥐굴 socket.

### H40 Secret Office

- 관리 책상.
- 장부·지도·봉인 도장.
- 금고.
- 감시 구멍.
- 비밀 무기함.
- 시장·세관·연구소로 이어지는 지도 벽.

### 여관 복원 단계

모든 파츠는 다음 상태를 지원합니다.

1. ruined — 잔해, 그을음, 파손.
2. camp — 청소된 일부 공간과 임시 천막.
3. outpost — 수리된 벽난로·침상·저장고.
4. inn — 완전한 바·주방·객실·간판.
5. fortified inn — 셔터, 목책, 경비대, 보급창고.
6. sacked — 약탈, 화재, 부서진 가구, capacity 감소.

여관 asset family는 **P0 설계, P1 authored 제작**입니다. vertical slice에서는 H36과 H37을 먼저 완성합니다.

## I. 중앙시장

- 초대형 교차홀의 중앙 표식.
- 세관 창구와 대형 저울.
- 경매대·진열 case.
- 중립 우물.
- 밀수통로 modular kit.

## J. 오크 병영

- 훈련 말뚝·북·깃발.
- 대형 무기 rack.
- 고기 저장·도살 kit.
- 투기장 관중석·포로문.
- 족장 왕좌 hero prop.

## K. 연구소

- 증류기와 시약 kit.
- 배양 수조 6 variant.
- 마법 거울·관측 콘솔.
- 소환 룬과 균열 effect.
- 방폭문·경고등.

## L. 왕실 구역

- 기사상·왕실 문장·카펫.
- 금고문·보석 case.
- 연회장 식탁·샹들리에.
- 검은 왕좌 hero prop.
- 왕실 침대와 의료 장치.

## M. 최종 성소

- 13구역 문장 봉인문.
- 원형 성소 바닥과 제단 13종.
- 심장 탱크·생체 관·왕 기억 형상.
- 최종 보스 상태별 파츠.

---

# 6. UI 자산

프로덕션 UI에는 다음이 필요합니다.

## P0

- 자원 아이콘: 식량, 물, 의약품, 자재, 부, deathEnergy, biomass.
- 상태 아이콘: 전투, 공성, 봉쇄, 감염, 숙주, 다운, 부활, 과밀.
- 세력 문장 8종 이상.
- overlay icon: 영토, 보급, 위험, 생태, 감염, 비밀통로.
- 카메라 아이콘: 고정, 자유, 추적, 대상 잠금.
- 이벤트 등급: 정보, 경고, 위기, 서사적 사건.

## P1

- 클래스 초상 icon 15종 이상.
- 장비 희귀도 frame.
- 방 기능 icon.
- 건설 tier icon.
- 캠페인 zone emblem 13종.

UI는 raster atlas보다 SVG 또는 고해상도 WebP source를 권장하되, 런타임은 CSS mask 또는 texture atlas로 묶을 수 있습니다.

---

# 7. 오디오 자산

## 환경 loop

- 안전지대 바람·등불.
- 주거구 목재 삐걱임.
- 침수 구역 물방울·펌프.
- 산업 회랑 기어·금속.
- 납골 성당 낮은 종·속삭임.
- 균류 포자·습한 맥동.
- 거미 실크 마찰.
- 여관 벽난로·잔·대화.
- 중앙시장 군중 variant.
- 오크 북·함성.
- 연구소 유리·전류.
- 왕실 구역 먼 메아리.
- 심장실 생체 박동.

## one-shot

- 문 개방·파괴.
- 보급 배송·약탈.
- 건설 완료·구조물 붕괴.
- 장비 장착·파손.
- 부활.
- faction capture.
- 여관 업그레이드.
- 비밀통로 발견.

---

# 8. 기술 규격

## 모델

- 기본 형식: GLB 2.0.
- 좌표: Y-up, meter scale.
- 원점: 바닥 중심 또는 명시된 socket origin.
- static prop은 가능하면 단일 material atlas.
- 반복 소품은 instancing 가능해야 합니다.
- 파괴형 구조물은 3–6개 분리 가능한 chunk.
- LOD0/LOD1 또는 단순 geometry fallback 준비.

## 텍스처

- 모바일 기준 512–1024, hero asset 2048 허용.
- BaseColor, Normal, ORM을 기본으로 합니다.
- 투명 효과는 overdraw를 제한합니다.
- 구역별 palette는 material variant로 관리합니다.

## 충돌·점유

모든 큰 프롭은 다음 메타데이터를 가집니다.

```json
{
  "footprint": {
    "shape": "circle|box|cells",
    "radius": 1.2,
    "width": 2.4,
    "depth": 1.8
  },
  "clearance": {
    "door": 1.5,
    "largeUnit": true
  }
}
```

## 소켓

권장 소켓:

- `interaction`
- `storage`
- `service`
- `seating`
- `sleeping`
- `light`
- `damage`
- `factionBanner`
- `spawn`
- `secretDoor`

---

# 9. 파일 배치

```text
assets/
  models/
    environment/
      stone-common/
      residential/
      flooded/
      industrial/
      ossuary/
      fungal/
      spider/
      inn/
      market/
      orc/
      laboratory/
      royal/
      sanctum/
    props/
    characters/
    equipment/
    creatures/
  textures/
  audio/
  ui/
  licenses/

content/assets/asset-catalog.json
```

실제 파일 경로는 콘텐츠가 직접 참조하지 않습니다. 콘텐츠는 안정적인 asset ID만 사용합니다.

---

# 10. 제작 우선순위

## Vertical slice P0

1. 공통 석재 구조 kit.
2. H36 여관 접객실.
3. H37 여관 주방.
4. I41 중앙 교차홀.
5. A01 안전 광장.
6. 고블린 시장과 언데드 납골당 핵심 프롭.
7. UI 상단 바·세력 문장·상태 아이콘.

## Campaign P1

1. 나머지 여관 3방.
2. 균류·거미 hero asset.
3. 오크 투기장·족장실.
4. 연구소 배양조·소환실.
5. 왕실·최종 성소.
6. 구역별 ambient audio.

## Polish P2–P3

- 소품 variant 확대.
- 파괴 debris.
- 날씨·먼지·포자·물 효과.
- 캐릭터 얼굴·복장 variation.
- 서사적 cutaway와 camera beat.

---

# 11. 완료 정의

어셋 family는 다음을 만족해야 `ready`로 변경합니다.

- asset catalog entry 존재.
- authored 파일 또는 procedural fallback 존재.
- footprint와 socket 메타데이터 존재.
- 기본·손상·파괴 또는 복원 상태가 정의됨.
- 모바일에서 허용 가능한 draw call과 texture budget.
- 방 recipe에서 배치 검증.
- 라이선스 파일 또는 프로젝트 소유권 기록.
- 누락 시 진단 marker가 표시됨.
