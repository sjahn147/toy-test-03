export const KOREAN_CHRONICLE_CATALOG = Object.freeze({
  'campaign.observation.started': entry([
    '{scenario:을} 유리 아래에 놓았다. 아래쪽은 계속 살아 있는 것으로 항의했다.',
    '{scenario} 위로 유리가 내려왔다. 그 아래의 사정은 그대로였다.'
  ]),
  'campaign.observer.noise': entry([
    '{room} 근처의 유리를 작은 신이 두드렸다. 주민들은 서로를 의심했다.',
    '세계 바깥에서 {room:을} 두드렸다. 세계는 설명하지 않았다.'
  ]),
  'campaign.observer.coin': entry([
    '{room}에 동전 하나가 떨어졌다. 멈추기도 전에 {actor:은} 사연을 붙였다.',
    '하늘이 {room}에 동전 하나를 보탰다. {actor:은} 즉시 의도를 추정했다.'
  ]),

  'party.expedition.escaped': entry([
    '{actor:은} 금화 {gold}개를 들고 탈출했다. 다음에는 더 나쁜 친구들을 데려올 생각이다.',
    '{actor:은} 금화 {gold}개와 수정된 무용담을 챙겨 나갔다. 교훈은 두고 갔다.'
  ], [
    '{actor} 퇴장. 회수 금화: {gold}.'
  ]),
  'party.return.scheduled': entry([
    '지상에서는 벌써 이야기가 단순해지고 있었다.',
    '위쪽 어딘가에서 생존자가 정확성을 포기할 만한 대목에 도달했다.'
  ]),
  'party.member.returned': entry([
    '{actor:이} 레벨 {level}에 올라 돌아왔다. 안심할 이유는 늘지 않았다.',
    '{actor:이} 더 강해져서 돌아왔다. 중요한 문제들은 그대로였다.'
  ]),
  'party.member.recruited': entry([
    '{actor:은} 부정확한 이야기를 듣고 합류했다.',
    '{actor:이} 새 장비와 남의 자신감을 들고 도착했다.'
  ]),
  'party.level.gained': entry([
    '{actor:은} 작고 끔찍한 교훈을 얻어 레벨 {level}에 올랐다.',
    '경험은 {actor:을} 개선했다. 경험의 내용까지 정당해진 것은 아니다.'
  ]),

  'agent.move.started': entry([
    '{actor:이} {room} 쪽 통로로 들어갔다.',
    '{actor:이} {room:으로} 향했다.'
  ], [
    '이동 경로: {fromRoom} → {room}'
  ]),
  'agent.move.arrived': entry([
    '{actor:이} {room}에 도착했다.',
    '{actor:이} {room}에 닿았다. 통로는 뒤에 남았다.'
  ], [
    '{fromRoom} 출발, {room} 도착.'
  ]),
  'agent.move.retreat': entry([
    '{actor:이} {room:으로} 물러났다. 생존이 마침내 논쟁에서 이겼다.',
    '{actor:은} 최근까지 살아 있는 자들이 택한 방향으로 빠졌다.'
  ]),
  'agent.move.rescue': entry([
    '{actor:은} 안전한 계획을 버리고 {target:을} 데리러 갔다.',
    '{actor:이} {target} 쪽으로 몸을 돌렸다. 의리는 비싼 길찾기다.'
  ]),
  'agent.move.revenge': entry([
    '{actor:은} {target:을} 기억하고 길을 골랐다.',
    '{actor:이} {target:을} 찾아 나섰다. 기억에 방향이 생겼다.'
  ]),
  'agent.move.explore': entry([
    '{actor:은} 익숙한 실수 대신 아직 보지 못한 방을 택했다.',
    '{actor:이} 지도가 아직 거짓말을 배우지 못한 곳으로 갔다.'
  ]),

  'system.route.invalid': entry([
    '{actor:은} {room:으로} 가는 유효한 길을 찾지 못했다.',
    '{actor:과} {room} 사이에는 통과 가능한 연결이 없었다.'
  ], [
    '경로 탐색 거부. 목적지={room}'
  ]),
  'system.route.oscillation': entry([
    '{actor:은} 막힌 통로를 되밟는 일을 멈췄다.',
    '왕복 이동 억제가 {actor:을} 제자리에 세웠다.'
  ], [
    '반복 A↔B 이동이 억제됨.'
  ]),
  'system.capacity.blocked': entry([
    '{site}에서는 {species:을} 더 만들 수 없었다. 자리나 안전이 부족했다.'
  ], [
    '{site} 생성 거부: 인구 {population}/{capacity}, 안전 지점 부족 또는 거점 비활성.'
  ]),
  'system.target.missing': entry([
    '{actor:에게} {action}에 쓸 유효한 대상이 없었다.',
    '요청한 대상은 이미 사용할 수 없었다.'
  ]),

  'combat.hit': entry([
    '{actor:이} {target:을} 공격했다. 피해량은 {amount}였다.',
    '{actor:의} 공격으로 {target:의} 체력이 {amount} 줄었다.'
  ], [
    '피해={amount}; 공격자={actor}; 대상={target}'
  ]),
  'combat.heal': entry([
    '{actor:이} {target:을} 치료했다. 체력이 {amount} 회복됐다.',
    '{target:의} 체력이 {actor:의} 치료로 {amount} 회복됐다.'
  ], [
    '회복={amount}; 시전자={actor}; 대상={target}'
  ]),
  'combat.started': entry([
    '{actor:과} {target:은} 지역 분쟁을 물리적으로 정리하기 시작했다.',
    '{actor:이} {target:에게} 닿자 방은 중립을 그만두었다.'
  ]),
  'combat.downed': entry([
    '{target:이} 쓰러졌다. 결론은 아직 아니다.',
    '{target:이} 바닥에 닿았다. 회수 가능성은 남아 있다.'
  ]),
  'combat.death': entry([
    '{target:은} 실험 참여를 중단했다.',
    '{target:은} 방에 남은 증거가 되었다.'
  ]),
  'combat.disengage.blocked': entry([
    '{actor:은} {target:을} 두고 나가려 했다. {target:은} 동의하지 않았다.',
    '{actor:은} 근접전에도 약관이 있다는 사실을 알게 되었다.'
  ]),
  'combat.disengage.moved': entry([
    '{actor:은} 피와 시간을 내고 {target:에게서} 떨어졌다.',
    '{actor:은} 교전에서 빠져나왔다. 교전은 소액의 수수료를 챙겼다.'
  ]),
  'combat.webbed': entry([
    '{target:이} 거미줄에 싸였다. 방에 임시 가구가 하나 늘었다.',
    '{actor:이} {target:을} 주변 구조물에 고정했다.'
  ]),
  'combat.trap.triggered': entry([
    '{actor:이} {trap:을} 건드렸다. 피해량은 {amount}였다. 작은 장치는 맡은 일을 했다.',
    '{trap:이} {actor:에게} 자기소개를 마쳤다. 피해량은 {amount}였다.'
  ]),
  'combat.trap.death': entry([
    '{actor:은} 주의 사항으로 전환되었다.',
    '{actor:은} 함정이 장식이 아니었음을 증명했다.'
  ]),

  'discovery.mimic.revealed': entry([
    '{actor:이} {object:을} 열었다. {mimic:도} 마주 열렸다.',
    '{object} 안에는 {mimic:이} 있었다. 입 안에 이빨이 있다는 의미에 가까웠다.'
  ]),
  'discovery.treasure.found': entry([
    '{actor:이} 수상한 금화 {gold}개를 찾았다.',
    '{actor:이} 금화 {gold}개를 회수했다. 무죄는 확인되지 않았다.'
  ]),
  'discovery.armory.weapon': entry([
    '{actor:은} 간신히 합법적으로 보이는 무기를 찾았다.',
    '무기고는 {actor:의} 전망을 개선하고 나머지의 전망을 낮췄다.'
  ]),
  'discovery.shrine.rest': entry([
    '{actor:은} {room}에서 쉬며 안도감을 운명으로 오해했다.',
    '{room:은} {actor:에게} 조용한 희망을 조금 내주었다. 아직 이자는 붙지 않았다.'
  ]),
  'discovery.treasure.rumor': entry([
    '{room}에서 새 소문이 상자 모양으로 굳었다.',
    '{room}에 상자가 생겼다. 사람들이 있다고 믿는 물건은 대개 이런 식이다.'
  ]),

  'ecology.predator.fed': entry([
    '{actor:이} 배를 채웠다. 던전은 맛을 기억했다.',
    '{actor:이} 잘 먹었다. 생태계는 기록을 남겼다.'
  ]),
  'ecology.birth.stirring': entry([
    '바닥돌 아래에서 무언가가 유산을 나누기 시작했다.',
    '돌바닥이 입을 더 만드는 사적인 산업에 착수했다.'
  ]),
  'ecology.spawn.single': entry([
    '{actor:이} {site}에서 기어 나와 곧바로 의견을 가졌다.',
    '{site}에서 {actor:이} 나왔다. 공간은 조금 덜 추상적이 되었다.'
  ]),
  'ecology.spawn.cluster': entry([
    '{site}에서 {speciesPlural} {count}개체가 더 나왔다. 동의를 구한 흔적은 없다.',
    '{speciesPlural} {count}개체가 {site}에서 나왔다. 서식지는 수용력을 권장 사항으로 읽었다.',
    '{site}의 개체 수가 {count} 늘었다. 사생활은 그보다 더 줄었다.'
  ]),
  'ecology.trap.rearmed': entry([
    '{trap:이} 조용한 악의를 품고 다시 준비되었다.',
    '{trap:이} 감독 없이 업무에 복귀했다.'
  ]),
  'ecology.habitat.full': entry([
    '{site}에서는 새끼보다 먼저 자리가 동났다.',
    '{site}에서는 굶주림보다 수용력이 더 까다로운 포식자였다.'
  ]),

  'settlement.threatened': entry([
    '{room}의 {site}에 위기가 닥쳤다. 벽이 먼저 알아챘다.',
    '{site}에서는 소유권도 임시 자재라는 사실이 드러나기 시작했다.'
  ]),
  'settlement.collapsing': entry([
    '{site:이} 무너지기 시작했다. 주민들은 집을 고철 단위로 세기 시작했다.',
    '{site:이} 안으로 접혔다. 집을 집이게 하던 구조물들이 주장을 포기했다.'
  ]),
  'settlement.ruined': entry([
    '{site:은} 폐허가 되었다. 주소만 남았다.',
    '{site:은} 집이기를 그만두고 사람들이 피하는 방향이 되었다.'
  ]),
  'settlement.rehomed': entry([
    '{actor:은} 이전의 집을 잃은 뒤 {site:을} 새 집으로 받아들였다.',
    '{actor:은} {site}에 정착했다. 피난처라는 말은 대개 도착한 뒤 붙는다.'
  ]),
  'settlement.displaced': entry([
    '{actor:은} {site}에서 밀려났다. 던전은 위로 대신 통로를 내주었다.',
    '{actor:은} {site:을} 잃고 지도를 물려받았다.'
  ]),
  'settlement.capacity': entry([
    '{site}에서는 주민보다 먼저 자리가 동났다.',
    '{site:은} 안전한 구석을 모두 채웠고, 안전하지 않은 의견도 몇 개 채웠다.'
  ]),

  'logistics.escort.move': entry([
    '{actor:이} {target:의} 화물을 호위하러 움직였다.',
    '{actor:이} 수송대의 속도에 맞췄다.'
  ], [
    '화물 {cargoId} 호위 위치 조정.'
  ]),
  'logistics.carry.move': entry([
    '{actor:이} {resource:을} {site:으로} 옮겼다.',
    '{resource:은} {actor:의} 감독 아래 계속 이동했다.'
  ], [
    '화물 {cargoId}, {site} 방향으로 이동.'
  ]),
  'logistics.delivered': entry([
    '{actor:이} {site}에 {resource} {amount}단위를 전달했다. 저녁이면 누군가 정책이라고 부를 것이다.',
    '{site}에 {resource} {amount}단위가 도착했다. 벽이 벽으로 남을 이유가 하나 늘었다.'
  ]),
  'logistics.dropped': entry([
    '{room}에 {resource:이} 떨어졌다. 소유권은 공개 질문이 되었다.',
    '{room}에서 {resource} 수송이 멈췄다. 지역의 청소부들이 일정을 고쳤다.'
  ]),
  'logistics.raided': entry([
    '{room}에서 {resource:의} 주인이 바뀌었다. 운송 보고서는 더 점잖은 동사를 썼다.',
    '수송대가 {room}에서 {resource:을} 잃었다. 다른 쪽은 수거라고 불렀다.'
  ]),
  'logistics.recovered': entry([
    '{actor:이} 버려진 {resource:을} 회수했다. 폐기물은 정치적 분류다.',
    '{resource:은} {actor:이라는} 새 운반자를 얻었다.'
  ]),

  'construction.started': entry([
    '{faction:이} {room}에 {structure:을} 짓기 시작했다. 방에는 의견을 묻지 않았다.',
    '{room}에서 {structure:이} 형태를 갖추기 시작했다. 나쁜 확신이 하나씩 쌓였다.'
  ]),
  'construction.completed': entry([
    '{room}의 {structure:이} 완성되었다. 지도에 의견이 하나 더 생겼다.',
    '{room}에 {structure:이} 들어섰다. 통과에는 협상이나 공구가 필요해졌다.'
  ]),
  'construction.work': entry([
    '{actor:이} {structure} 공사에 손을 보탰다.',
    '{actor:의} 노동이 {structure}에 더해졌다.'
  ], [
    '건설 기여도={amount}'
  ]),
  'siege.hit': entry([
    '{actor:이} {structure:을} 공격했다. 공성 피해량은 {amount}였다.',
    '{actor:의} 공격으로 {structure:의} 내구도가 {amount} 줄었다.'
  ], [
    '공성 피해={amount}; 구조물={structure}'
  ]),
  'siege.structure.destroyed': entry([
    '{faction:이} {room}의 {structure:을} 파괴했다. 길은 단순해졌고 앞일은 나빠졌다.',
    '{room}에서 {structure:이} 무너졌다. 근처의 모두가 그 틈을 물려받았다.'
  ]),
  'siege.phase.changed': entry([
    '{site} 공성전이 {phase} 단계로 들어갔다. 용어가 피해를 따라잡았다.',
    '{site}의 상황이 {phase:으로} 넘어갔다. 수비대의 문장은 이미 짧아지고 있었다.'
  ]),

  'personality.rescue': entry([
    '{actor:은} 더 안전한 계획을 버리고 {target:에게} 갔다.',
    '{actor:은} 남아 있던 상식보다 {target:을} 택했다.'
  ]),
  'personality.home.defense': entry([
    '{actor:은} 손상된 벽을 떠올리고 집 쪽으로 돌아섰다.',
    '{actor:은} {site:으로} 돌아갔다. 충성심이 목적지를 제공했다.'
  ]),
  'personality.aggression': entry([
    '{actor:은} 배회하는 대신 {target} 쪽으로 밀고 갔다.',
    '{actor:은} {target}에게서 목적을 찾았다. 양쪽 모두에게 유감스러운 일이다.'
  ]),
  'personality.revenge': entry([
    '{actor:은} 자신을 해친 이를 기억하고 길을 골랐다.',
    '{actor:의} 원한은 감정을 그만두고 일정표가 되었다.'
  ]),
  'personality.retreat': entry([
    '{actor:은} 던전을 한 바퀴 더 도는 대신 생존을 택했다.',
    '{actor:은} 용기가 서류가 되기 전에 집으로 갔다.'
  ]),
  'personality.explore': entry([
    '{actor:은} 익숙한 문 사이를 서성이는 대신 보지 못한 방을 골랐다.',
    '{actor:은} 불확실성을 택했다. 익숙함은 아직 장점을 보여주지 못했다.'
  ]),

  'hero.death': entry([
    '{actor:은} 완전히 패배했다. 진영은 다시 평범해져야 했다.',
    '{actor:이} 쓰러졌다. 칭호는 몇 초 동안 다음 몸을 찾았다.'
  ]),
  'hero.skill.started': entry([
    '{actor:이} {skill:을} 준비했다. 방에는 제대로 두려워할 시간이 주어졌다.',
    '{actor:이} {skill:을} 시작했다. 바닥도 실수의 형태를 알아보았다.'
  ]),
  'hero.skill.interrupted': entry([
    '{actor:의} {skill:이} 끊겼다. 힘은 다시 의도에 머물렀다.',
    '{skill:은} 모두를 망치기 전에 {actor:의} 손에서 먼저 실패했다.'
  ]),
  'hero.skill.resolved': entry([
    '{actor:의} {skill:이} 완성되었다. 방은 동의 없이 결과를 받아들였다.',
    '{skill:이} 작동했다. 결과가 차례로 도착하기 시작했다.'
  ]),
  'hero.deployable.created': entry([
    '{actor:이} {room}에 {object:을} 설치했다.',
    '{room:은} 잠시 {object:을} 갖게 되었다. 원한 적은 없다.'
  ], [
    '설치물 ID={objectId}; 종류={object}'
  ]),
  'hero.deployable.destroyed': entry([
    '{room}의 {object:이} 파괴되었다. 목적은 잠깐 더 남았다.',
    '{object:은} 계획보다 먼저 부서졌다.'
  ]),
  'hero.field.created': entry([
    '{actor:이} {room}의 조건을 바꿨다. 공기에도 편이 생겼다.',
    '{room:이} {field} 상태에 들어갔다. 중립 지대는 사라졌다.'
  ]),
  'hero.explosion': entry([
    '{room:은} {actor:의} 주장에 폭발적인 결론을 받았다.',
    '{actor:의} 폭약이 {room}에서 터졌다. 건축은 잠시 협상 가능해졌다.'
  ]),
  'hero.adaptation.changed': entry([
    '{actor:이} {adaptation} 형태로 적응했다. 방에서 가장 불안정한 재료는 정체성이었다.',
    '{actor:이} {adaptation} 형태가 되었다. 환경의 제안을 문자 그대로 받아들였다.'
  ]),
  'hero.physics.collision': entry([
    '{target:이} {room} 가장자리에 부딪혔다. 방은 자리를 지켰다.',
    '{target:이} 속도를 유지한 채 구조물을 만났다.'
  ], [
    '{room} 물리 경계 충돌.'
  ]),
  'hero.barrier.created': entry([
    '{actor:이} {room}의 길을 닫았다. 통행은 군사적 의견이 되었다.',
    '{room}에는 조금 전까지 출구였던 자리에 문이 생겼다.'
  ]),
  'hero.summon.created': entry([
    '{actor:이} {room}에 {summonPlural} {count}체를 불렀다. 죽음은 예비 명단을 갖고 있었다.',
    '{summonPlural} {count}체가 {actor:의} 부름에 응했다. 출석은 의무였다.'
  ]),

  'legacy.unknown': entry([
    '{text}'
  ], [
    '분류되지 않은 레거시 이벤트: {text}'
  ])
});

export function getKoreanChronicleEntry(key) {
  return KOREAN_CHRONICLE_CATALOG[key] ?? null;
}

function entry(variants, detailVariants = []) {
  return Object.freeze({
    variants: Object.freeze([...(Array.isArray(variants) ? variants : [variants])]),
    detailVariants: Object.freeze([...(Array.isArray(detailVariants) ? detailVariants : [detailVariants])])
  });
}
