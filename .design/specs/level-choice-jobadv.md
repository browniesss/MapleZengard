# Spec — level-choice-jobadv (시스템 #4: 레벨 / 선택지 / 전직)

> 기준 문서: `.design/ARCHITECTURE.md` (플랫폼 확정 사항·공통 제약 준수, 변경 불가)
> 요구사항 단일 진실: 기획서 PDF p.9, p.12, p.14, p.16
> 본 문서는 구현 직전 단계 스펙이다. 이 단계에서는 구현 파일(.mlua/.model/.ui)을 생성하지 않는다.
> 이름/이벤트/모델 id의 최종 확정은 `MASTER_PLAN.md`가 단일 진실 (ARCHITECTURE.md §5) — 본 스펙의 식별자는 그 후보안이다.

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (페이지 인용) | 구현 항목 |
|---|---|---|
| R1 | "스테이지 입장 시 Lv.1부터 시작, 스테이지 종료 시 초기화" (p.14) | `GrowthLogic:InitForStage()` — 유저별 성장 상태를 Lv.1로 생성, `StageEndedEvent` 수신 시 전체 파기 |
| R2 | "누적 계정 레벨 없음 (RPG처럼 레벨 누적 개념 X), 매 스테이지가 항상 새로운 시작" (p.14) | 성장 상태는 서버 메모리(@Logic 내 테이블)에만 존재. `_DataStorageService` 저장 안 함 (내실은 시스템 #6 소관) |
| R3 | "레벨업 시 스킬 포인트 획득 및 선택지 등장. 레벨업은 몬스터 처치 경험치 기반" (p.14, p.9) | `MonsterKilledEvent` 수신 → `AddExp` → 임계 도달 시 레벨업 → 스킬 포인트 +1 → 선택지 추첨/노출 |
| R4 | "최초 스테이지 진입 시: 2개 중 1개 선택" (p.14), "직업 선택 및 직업에 맞는 1차 공격 스킬 선택 (2가지 중 1가지)" (p.9) | 스테이지 시작 직후 1차 스킬 2종 고정 카드 노출 (확률 추첨 아님) |
| R5 | "이후 레벨업마다 3개 선택지 중 1개 선택" (p.14, p.9) | 기본 슬롯 수 3의 선택지 추첨 (§5.1) |
| R6 | "선택지 구성은 스킬 90% 확률, 장비 10% 확률로 노출" (p.14, p.9), "기본 선택지에서 10% 확률로 등장" (p.16) | 슬롯별 가중 추첨 skill 0.90 / equip 0.10 (§4 T3) |
| R7 | "이전에 등장한 스킬 재등장 및 패시브 스킬도 선택지로 등장" (p.14), "각 직업군마다 가지고 있는 패시브 스킬은 선택지에서 선택 가능한 스킬로 등장" (p.12) | 후보 풀에서 '이번 노출 내 중복'만 제외. 과거 노출/보유 스킬은 만렙(Lv.3) 전까지 재등장. 패시브 스킬 풀 포함 |
| R8 | "선택지 3회 노출 시, 전직 가능 상태 활성화" (p.14) | `choiceExposureCount` 카운터, 임계 3 (§4 T5) |
| R9 | "전직 재료: 몬스터 처치 시 획득한 전리품을 활용" (p.14), "캐릭터 전직 재료로서 활용" (p.16) | 전직 시 `_LootLogic:SpendLoot()` 호출 (전리품 지갑 소유는 시스템 #6) |
| R10 | "전리품 부족 시 전직이 지연 (단 스킬 포인트는 유지)" (p.14) | 전직 가능 상태는 유지된 채 보류. 스킬 포인트/레벨/선택지 흐름은 정상 진행 |
| R11 | "스테이지 내에서 최대 4차 전직까지 구현 예정" (p.14) | `MAX_JOB_TIER = 4`, 직업 루트 테이블 (§4 T6) |
| R12 | "이후 2차 전직 스킬을 고를 경우, 해당 스킬을 사용하는 2차 전직 루트가 활성화. 3차 스킬 또한 전직 루트에 맞게 등장. 자동적으로 전직 루트는 고정: 마법사(1차) ⇒ 불독(2차) ⇒ 불독(3차) / 마법사(1차) ⇒ 썬콜(2차) ⇒ 썬콜(3차)" (p.12) | 분기 직업(마법사)은 2차 스킬 첫 픽 시점에 `routeBranch` 고정 → 이후 후보 풀을 해당 분기로 필터 (§5.3) |
| R13 | "전리품을 통해 선택지를 3개 → 5개로 확장이 가능" (p.16) | `RequestExpandChoices` — 전리품 소모, 슬롯 수 3→5 (스테이지 내 영구) |
| R14 | "5개로 확장 시 장비 등장 확률도 같이 상승. 또한 원하는 선택지를 고를 확률도 증가" (p.16) | 확장 시 슬롯별 장비 가중치 상승 (§4 T3). '원하는 선택지 확률 증가'는 슬롯 수 증가의 자연 결과 — 별도 로직 없음 |
| R15 | "스테이지가 종료되면 장비는 사라지는 개념" (p.16) | 장비 적용/파기는 시스템 #6 소관. 본 시스템은 장비 카드 추첨·픽 전달만 담당 |
| R16 | "‘젠’을 통해 발생한 몬스터 처치 시 일정 확률로 획득" (p.16) | 전리품 드랍은 시스템 #6/#7 소관 — 본 시스템은 `_LootLogic` 잔액 조회/소모만 |

**[설계 결정] 목록** (기획서 미명시 — 프로토타입 관점에서 확정, 질문 없이 진행):

| ID | 결정 | 근거 |
|---|---|---|
| D1 | 경험치 곡선: `ExpToNext(L) = 4 + 2*(L-1)`, 레벨 캡 20 | 20젠 × 젠당 평균 처치 수 기준으로 스테이지당 8~12회 레벨업이 나오도록 한 1차 곡선. 상수라 튜닝 쉬움 |
| D2 | 스킬 90/10 확률은 **슬롯별 독립 추첨** + 노출당 장비 카드 상한 (3슬롯: 1, 5슬롯: 2) | p.16 "기본 선택지에서 10% 확률로 등장"과 p.14 "구성은 90%/10%"를 동시에 만족시키는 가장 단순한 해석 |
| D3 | 5개 확장 시 슬롯별 장비 확률 10% → 20% | p.16 "장비 등장 확률도 같이 상승"의 구체값 미명시 → 2배로 확정 |
| D4 | 선택지 확장 비용: 전리품 5개, 스테이지 내 1회 구매로 영구 적용 | p.16에 비용/지속 미명시 |
| D5 | 전직 비용: 2차 3개 / 3차 5개 / 4차 8개 (전리품) | p.14에 수량 미명시. 전리품 드랍률(시스템 #6 잠정 20%)과 20젠 분량 기준 |
| D6 | `choiceExposureCount`는 **전직 성공 시 0으로 리셋** — 즉 "각 차수 전직마다 선택지 3회 노출 필요" | p.14는 1회 조건만 명시. 4차까지 단계적 진행이 되려면 차수별 리셋이 자연스러움 |
| D7 | 전직은 자동 실행이 아니라 **버튼 요청식** (조건 충족 시 HUD/팝업에 활성 표시) | p.14 "전직 가능 상태 활성화" 문구 = 상태이지 즉시 실행이 아님 |
| D8 | 분기 미고정 상태의 마법사에게는 2차 스킬 후보로 **모든 분기(불독/썬콜/비숍)의 2차 스킬**이 등장 가능, 첫 픽이 루트를 고정 | p.12의 "2차 스킬을 고를 경우 해당 루트 활성화"의 직접 구현 |
| D9 | 마법사 분기는 불독/썬콜을 프로토타입 1순위로 구현, 비숍은 데이터 테이블에만 존재 (p.12에 명시되어 있으므로 데이터는 유지) | 프로토타입 범위 절충 |
| D10 | 전사/도적/궁수 2~4차 직업명: 메이플 정식 루트 차용 — 궁수: 아처→사수→저격수→신궁(지시 사항), 전사: 검사→파이터→크루세이더→히어로, 도적: 로그→어쌔신→허밋→나이트로드 | p.12에 1차 스킬만 명시, 상위 차수명 미명시 |
| D11 | 2~4차 스킬 id/효과의 실데이터는 시스템 #3(skills-and-fusion) 스펙이 소유. 본 시스템은 `tier`/`branch`/`isPassive` 메타만 사용 | 소유권 분리 |
| D12 | 스킬 후보 풀이 비는 경우(전부 Lv.3 만렙) 해당 슬롯은 장비 카드로 대체, 장비 풀마저 불가하면 메소 보너스 필러 카드 | 엣지 케이스 §7-E3 |
| D13 | 동시/연쇄 레벨업 시 선택지 팝업은 **큐잉**되어 1개씩 순차 노출 | 엣지 케이스 §7-E1 |
| D14 | 선택지 노출 중 게임 진행(젠/전투)은 멈추지 않음 — 카드 선택은 비차단 | p.9 플로우(자동 전투)와 충돌 없는 가장 단순한 모델 |
| D15 | 멀티유저(협업 월드) 대비 모든 성장 상태는 `userId` 키 테이블로 관리 | ARCHITECTURE §4-8 서버 권위 |
| D16 | 몬스터별 경험치 잠정값(주황버섯 2 / 진화 3 / 스톤골렘 4 / 분열체 1 / 보스 0)은 시스템 #7 스펙이 최종 소유 — `MonsterKilledEvent.exp` 필드로 전달받음 | 소유권 분리 |
| D17 | 리롤(BM, 3회)은 시스템 #6 소관 — 본 시스템은 `RequestReroll` 진입점만 제공하고 횟수 검증은 `_BMLogic`에 위임 | ARCHITECTURE §2-6 |

---

## 2. 상태 모델 (서버 권위, per-user)

```
GrowthState (per userId, 서버 @Logic 내부 테이블 — 스테이지 한정 수명)
├─ level: integer = 1
├─ exp: integer = 0
├─ skillPoints: integer = 0            -- 레벨업 +1, 스킬 픽 시 -1 (R10: 전직 지연과 무관하게 유지)
├─ jobKey: string                      -- "warrior"|"archer"|"mage"|"thief" (스테이지 시작 시 확정)
├─ jobTier: integer = 1                -- 1~4
├─ routeBranch: string = ""            -- 마법사: ""(미고정)|"firepoison"|"icelightning"|"bishop"
├─ choiceExposureCount: integer = 0    -- 전직 성공 시 0 리셋 (D6)
├─ choiceSlotCount: integer = 3        -- 확장 시 5 (D4)
├─ pendingChoices: queue<ChoiceSet>    -- 연쇄 레벨업 큐 (D13)
└─ activeChoiceSet: ChoiceSet | nil    -- 현재 노출 중인 카드 세트

ChoiceSet
├─ setId: integer                      -- 서버 발급 일련번호 (이중 픽 방지)
└─ cards: array<Card>                  -- Card = { kind: "skill"|"equip"|"filler", id: string }
```

---

## 3. 플로우

```
StageStart ─ ZengardGameLogic가 _GrowthLogic:InitForStage(userId, jobKey) 호출
   └→ 1차 스킬 2종 고정 카드 노출 (R4, setId 발급, exposureCount는 증가 안 함*)
MonsterKilledEvent(killerUserId, exp) ─→ AddExp ─→ while exp >= ExpToNext(level):
   level += 1, skillPoints += 1, LevelUpEvent 발신, ChoiceSet 추첨 → 큐 적재
큐 선두 ChoiceSet → 대상 클라이언트 RPC ShowChoiceSet → 유저 픽
   픽(skill) → _SkillLogic:ApplySkillPick (skillPoints -= 1, 마법사 2차 첫 픽이면 routeBranch 고정)
   픽(equip) → _EquipLogic:ApplyEquipPick
   → ChoiceResolvedEvent 발신, exposureCount += 1, 다음 큐 노출
exposureCount >= 3 && jobTier < 4 → 전직 가능 표시(@Sync)
   유저 RequestJobAdvance → _LootLogic:SpendLoot(cost) 성공 시 jobTier += 1,
   exposureCount = 0, JobAdvancedEvent 발신 / 실패 시 보류 상태 유지 (R10)
유저 RequestExpandChoices → SpendLoot(5) 성공 시 slotCount = 5 (R13)
StageEndedEvent → 전 유저 GrowthState 파기, 미해소 큐/카드 폐기 (R1)
```

\* **[설계 결정 D18]** 최초 진입 2지선다는 "레벨업 선택지"가 아니므로 `choiceExposureCount`에 불포함. p.14의 "선택지 3회 노출"은 레벨업 선택지 기준으로 해석.

---

## 4. 데이터 테이블 (GrowthConfig)

기획서 수치는 그대로, 미명시는 [D#] 결정값.

**T1. 레벨/경험치** — [D1]

| 상수 | 값 | 출처 |
|---|---|---|
| `START_LEVEL` | 1 | p.14 |
| `LEVEL_CAP` | 20 | [D1] |
| `EXP_TO_NEXT(L)` | `4 + 2*(L-1)` | [D1] |
| 잉여 경험치 | 이월 (multi-level while 루프) | [D13] |

**T2. 몬스터 경험치 (잠정 — 최종 소유: monsters-boss 스펙)** — [D16]

| 몬스터 | EXP |
|---|---|
| 주황버섯 | 2 |
| 진화 주황버섯 | 3 |
| 스톤골렘 | 4 |
| 골렘 분열체 | 1 |
| 보스 머쉬맘 | 0 (클리어 보상으로 대체) |

**T3. 선택지 확률**

| 상수 | 값 | 출처 |
|---|---|---|
| `BASE_SLOT_COUNT` | 3 | p.14 |
| `EXPANDED_SLOT_COUNT` | 5 | p.16 |
| `SKILL_WEIGHT_BASE / EQUIP_WEIGHT_BASE` | 0.90 / 0.10 | p.14, p.9, p.16 |
| `SKILL_WEIGHT_EXPANDED / EQUIP_WEIGHT_EXPANDED` | 0.80 / 0.20 | [D3] |
| `EQUIP_CARD_CAP` (노출당) | 3슬롯: 1, 5슬롯: 2 | [D2] |
| `FIRST_ENTRY_CARD_COUNT` | 2 (1차 스킬 고정) | p.14, p.9 |
| 스킬 만렙 (풀 제외 기준) | Lv.3 | ARCHITECTURE §2-3 (p.11) |

**T4. 전리품 소비 (지갑 소유: 시스템 #6)**

| 용도 | 비용 | 출처 |
|---|---|---|
| 2차 전직 | 3 | [D5] |
| 3차 전직 | 5 | [D5] |
| 4차 전직 | 8 | [D5] |
| 선택지 확장 (3→5, 스테이지 내 1회) | 5 | [D4] |

**T5. 전직 조건**

| 상수 | 값 | 출처 |
|---|---|---|
| `ADV_EXPOSURE_THRESHOLD` | 선택지 3회 노출 | p.14 |
| `MAX_JOB_TIER` | 4 | p.14 |
| 노출 카운터 리셋 | 전직 성공 시 0 | [D6] |
| 전리품 부족 시 | 전직 보류, 스킬 포인트 유지 | p.14 |

**T6. 직업 루트 / 1차 스킬 (p.12 + [D10])**

| jobKey | 1차 스킬 (2지선다, p.12) | 1차→2차→3차→4차 |
|---|---|---|
| `warrior` | 파워 스트라이크 / 슬래시 블러스트 | 검사→파이터→크루세이더→히어로 [D10] |
| `archer` | 애로우 블로우 / 더블샷 | 아처→사수→저격수→신궁 |
| `mage` | 에너지 볼트 / 매직 클로 | 마법사→{불독\|썬콜\|비숍}→(분기 유지)→(분기 유지) (p.12, 비숍은 데이터만 [D9]) |
| `thief` | 더블 스텝 / 럭키 세븐 | 로그→어쌔신→허밋→나이트로드 [D10] |

**T7. 마법사 분기 고정 규칙 (p.12)**

| 2차 스킬 첫 픽 | routeBranch 고정 | 1차 스킬 유지 |
|---|---|---|
| 파이어 애로우 | `firepoison` (불독) | 에너지 볼트 유지 |
| 썬더 볼트 | `icelightning` (썬콜) | 매직 클로 유지 |
| 블레스 | `bishop` (비숍) | 에너지 볼트 유지 |

스킬 개별 데이터(id/데미지/패시브 효과)는 시스템 #3 스펙 소유 [D11]. 본 시스템이 요구하는 스킬 메타 스키마: `{ skillId, jobKey, tier, branch, isPassive, currentLevel, maxLevel }`.

---

## 5. 핵심 알고리즘 의사코드

### 5.1 선택지 추첨 `DrawChoiceSet(state)`

```
function DrawChoiceSet(state):
    n = state.choiceSlotCount                      -- 3 or 5
    equipW = (n == 5) and EQUIP_WEIGHT_EXPANDED or EQUIP_WEIGHT_BASE
    equipCap = (n == 5) and 2 or 1                 -- [D2]
    cards = [], equipCount = 0
    skillPool = BuildSkillPool(state)              -- §5.3
    for slot in 1..n:
        roll = RandomDouble()
        if roll < equipW and equipCount < equipCap:
            card = { kind="equip", id=_EquipLogic:RollEquipCandidate(state.userId) }
            equipCount += 1
        else:
            if skillPool is empty:
                -- [D12] 폴백: 장비 → 그것도 막히면 필러
                if equipCount < equipCap: card = equip 카드; equipCount += 1
                else: card = { kind="filler", id="meso_bonus_small" }
            else:
                card = { kind="skill", id=PopUniformRandom(skillPool) }
                                                   -- 같은 세트 내 중복 제거 (R7: 세트 간 재등장은 허용)
        cards.append(card)
    return ChoiceSet{ setId=NextSetId(), cards=cards }
```

### 5.2 경험치/레벨업 처리 `AddExp(userId, amount)`

```
function AddExp(userId, amount):                   -- ServerOnly
    state = states[userId]; if not state: return
    if state.level >= LEVEL_CAP: return
    state.exp += amount
    while state.exp >= EXP_TO_NEXT(state.level) and state.level < LEVEL_CAP:
        state.exp -= EXP_TO_NEXT(state.level)
        state.level += 1
        state.skillPoints += 1
        emit LevelUpEvent{ userId, newLevel=state.level }
        state.pendingChoices.push(DrawChoiceSet(state))   -- [D13] 연쇄 레벨업 큐잉
    TryShowNextChoiceSet(state)                    -- activeChoiceSet 없을 때만 dequeue → Client RPC
```

### 5.3 스킬 후보 풀 `BuildSkillPool(state)`

```
function BuildSkillPool(state):
    pool = []
    for skill in _SkillLogic:GetSkillCatalog(state.jobKey):
        if skill.tier > state.jobTier: continue            -- 미전직 차수 제외
        if skill.tier >= 2 and state.routeBranch ~= ""
           and skill.branch ~= state.routeBranch: continue -- 분기 고정 후 타 분기 제외 (R12)
        if skill.currentLevel >= skill.maxLevel: continue  -- Lv.3 만렙 제외
        pool.append(skill.skillId)                         -- 보유/과거 등장 여부는 제외 사유 아님 (R7)
    return pool
-- 주: 분기 미고정 마법사(jobTier>=2, routeBranch=="")는 모든 분기 2차 스킬이 풀에 들어감 [D8]
```

### 5.4 픽 처리 `ResolvePick(senderUserId, setId, slotIndex)`

```
@ExecSpace("Server") RequestPick(setId, slotIndex):
    state = states[senderUserId]
    if not state.activeChoiceSet or state.activeChoiceSet.setId ~= setId: return  -- 이중/유령 픽 차단
    card = state.activeChoiceSet.cards[slotIndex]; if not card: return
    if card.kind == "skill":
        ok = _SkillLogic:ApplySkillPick(senderUserId, card.id)   -- 내부에서 skillPoints -= 1
        if ok and IsTier2FirstPick(state, card.id):
            state.routeBranch = BranchOf(card.id)                -- T7 (R12)
    elif card.kind == "equip": _EquipLogic:ApplyEquipPick(senderUserId, card.id)
    else: _CurrencyLogic 메소 지급 (filler)
    state.choiceExposureCount += 1
    emit ChoiceResolvedEvent{ userId=senderUserId, kind=card.kind, id=card.id }
    state.activeChoiceSet = nil
    TryShowNextChoiceSet(state)
    SyncAdvanceAvailability(state)                 -- exposure>=3 && tier<4 → @Sync 플래그 갱신
```

### 5.5 전직 `RequestJobAdvance()`

```
@ExecSpace("Server") RequestJobAdvance():
    state = states[senderUserId]
    if state.jobTier >= MAX_JOB_TIER: return
    if state.choiceExposureCount < ADV_EXPOSURE_THRESHOLD: return
    cost = ADV_COST[state.jobTier + 1]             -- T4
    if not _LootLogic:SpendLoot(senderUserId, cost):
        NotifyAdvanceDeferred(senderUserId)        -- R10: 보류 — 상태/포인트 유지, UI 안내만
        return
    state.jobTier += 1
    state.choiceExposureCount = 0                  -- [D6]
    emit JobAdvancedEvent{ userId=senderUserId, jobKey=state.jobKey,
                           newTier=state.jobTier, branch=state.routeBranch }
```

### 5.6 선택지 확장 `RequestExpandChoices()`

```
@ExecSpace("Server") RequestExpandChoices():
    state = states[senderUserId]
    if state.choiceSlotCount >= EXPANDED_SLOT_COUNT: return
    if not _LootLogic:SpendLoot(senderUserId, EXPAND_COST): return  -- 5개 [D4]
    state.choiceSlotCount = EXPANDED_SLOT_COUNT    -- 스테이지 내 영구, 이후 추첨부터 적용
```

---

## 6. 파일 매니페스트 (이번 단계에서는 생성하지 않음 — 구현 페이즈 산출물)

ARCHITECTURE §3 경로 규칙 준수. `.mlua`는 `RootDesk/MyDesk/Zengard/Growth/`, `.ui`는 UIBuilder 경유.

| 파일 | 종류 | ExecSpace 요지 | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Growth/GrowthConfig.mlua` | `@Logic` | 어노테이션 없음(양측 로컬 조회) | §4 데이터 테이블 전체(T1~T7) 상수/조회 함수. 로직 없음 |
| `RootDesk/MyDesk/Zengard/Growth/GrowthLogic.mlua` | `@Logic` | 상태 변이는 전부 `ServerOnly`; 클라 요청은 `Server`(RequestPick/RequestJobAdvance/RequestExpandChoices/RequestReroll); UI 통지는 `Client` RPC(ShowChoiceSet/NotifyAdvanceDeferred, 호출부 마지막 인자 userId 타게팅) | per-user GrowthState 관리, §5 알고리즘 전부, 이벤트 발신/수신. 핵심 체크포인트 `log()` (InitForStage/레벨업/픽/전직/확장 — ARCHITECTURE §4-9) |
| `RootDesk/MyDesk/Zengard/Growth/Events/LevelUpEvent.mlua` | `@Event` | — | `userId: string, newLevel: integer` |
| `RootDesk/MyDesk/Zengard/Growth/Events/ChoiceResolvedEvent.mlua` | `@Event` | — | `userId: string, kind: string, id: string` |
| `RootDesk/MyDesk/Zengard/Growth/Events/JobAdvancedEvent.mlua` | `@Event` | — | `userId: string, jobKey: string, newTier: integer, branch: string` |
| `RootDesk/MyDesk/Zengard/UI/ChoicePopupController.mlua` | `@Component` (ChoicePopup UI 루트 엔티티 부착) | 전부 `ClientOnly` + 버튼 핸들러. 서버 호출은 `_GrowthLogic:RequestPick(...)` 등 `Server` RPC 경유 | 카드 5슬롯 렌더(3장 모드 시 2슬롯 숨김), 카드 아이콘/이름/레벨 뱃지 바인딩, 확장/전직 버튼 상태, 픽 큐 표시. UUID 직접 주입 바인딩 |
| `ui/ChoicePopup.ui` | `.ui` (UIBuilder 경유만) | — | 선택지 카드 팝업: 카드 슬롯 ×5, 전직 버튼+진행 뱃지(노출 n/3), 확장 버튼(전리품 비용 표기), 리롤 버튼(잔여 횟수는 #6 데이터) |

- **`.model`: 없음.** 본 시스템은 로직+UI만으로 구성된다 (장비/스킬 실체는 #3·#6, 몬스터는 #7 소유).
- `GrowthLogic`은 `@Logic`이므로 `self.Entity` 없음, `OnMapEnter` 미발화 — 스테이지 경계는 `InitForStage` API + `StageEndedEvent`로만 처리 (msw-scripting SKILL §3.2 준수).
- `SyncTable` 프로퍼티는 기본값 리터럴 금지, per-user 상태는 `_T` 또는 일반 테이블 프로퍼티(서버 전용)로 보관하고 클라 노출값만 `Client` RPC/`@Sync`로 전달.

---

## 7. API / 이벤트 계약

### 7.1 노출 (본 시스템 → 외부)

| 시그니처 | ExecSpace | 소비자 |
|---|---|---|
| `_GrowthLogic:InitForStage(string userId, string jobKey)` | ServerOnly | ZengardGameLogic (스테이지 시작 시) |
| `_GrowthLogic:AddExp(string userId, integer amount)` | ServerOnly | 이벤트 미사용 시스템용 보조 진입점 |
| `_GrowthLogic:GetLevel(string userId) → integer` | ServerOnly | HUD/#7 (몬스터 스케일링 필요 시) |
| `_GrowthLogic:GetJobTier(string userId) → integer, string branch` | ServerOnly | #5 companion ("2차 전직 기준" 판정), #3 |
| `_GrowthLogic:RequestPick(integer setId, integer slotIndex)` | Server | ChoicePopupController |
| `_GrowthLogic:RequestJobAdvance()` | Server | ChoicePopupController/HUD |
| `_GrowthLogic:RequestExpandChoices()` | Server | ChoicePopupController |
| `_GrowthLogic:RequestReroll(integer setId)` | Server | ChoicePopupController (검증은 `_BMLogic` 위임 [D17]) |
| 발신 이벤트 `LevelUpEvent` | 서버 | #8 HUD 연출, #7(필요 시) |
| 발신 이벤트 `ChoiceResolvedEvent` | 서버 | #3(스킬 반영 확인), #8 |
| 발신 이벤트 `JobAdvancedEvent` | 서버 | #5 companion(합류 트리거 "전직 후"), #2(아바타/공격 갱신), #8 |
| Client RPC `ShowChoiceSet(table cards, integer setId)` / `NotifyAdvanceDeferred()` | Client (userId 타게팅) | ChoicePopupController |

### 7.2 의존 (외부 → 본 시스템이 요구하는 계약)

| 계약 | 소유 시스템 |
|---|---|
| `MonsterKilledEvent { killerUserId: string, monsterKey: string, exp: integer }` 수신 — `exp` 필드 필수 | #7 monsters-boss (+#1 board-and-wave) |
| `StageEndedEvent` 수신 (성장 상태 파기) | ZengardGameLogic (#1/#8) |
| `_SkillLogic:GetSkillCatalog(jobKey) → table` (스키마: §4 끝) / `ApplySkillPick(userId, skillId) → boolean` | #3 skills-and-fusion |
| `_LootLogic:GetLootCount(userId) → integer` / `SpendLoot(userId, n) → boolean` (원자적 차감) | #6 loot-equip-growth-bm |
| `_EquipLogic:RollEquipCandidate(userId) → string` / `ApplyEquipPick(userId, equipId)` | #6 |
| `_BMLogic:TryConsumeReroll(userId) → boolean` (리롤 3회 한도) | #6 |
| `ChoicePopupGroup` UI 그룹 표시/숨김 규약 | #8 ui-modes-stages |

크로스 바운더리 파라미터는 `string/integer/number/boolean/table` 한정 (enum 금지 — msw-scripting SKILL §6). 카드 목록은 `table`로 전달.

---

## 8. 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| E1 | **동시/연쇄 처치로 다중 레벨업** (한 프레임에 exp 대량 유입) | §5.2 while 루프로 잉여 이월 + ChoiceSet 큐잉, 팝업은 1개씩 순차 [D13]. 픽은 `setId` 검증으로 유령 픽 차단 |
| E2 | **선택지 미해소 중 스테이지 종료/실패** | `StageEndedEvent`에서 큐·activeChoiceSet 즉시 폐기, 클라에 팝업 강제 닫기 RPC |
| E3 | **스킬 풀 고갈** (전부 Lv.3) | 장비 카드 폴백 → 장비 캡 초과 시 메소 필러 [D12] |
| E4 | **전직 가능 + 전리품 부족** | 전직 보류 알림만, exposureCount/skillPoints 유지 (p.14) — 이후 전리품 획득 시 버튼 재활성 |
| E5 | **확장과 전직을 같은 잔액으로 동시 요청** | 서버 단일 스레드 직렬 처리 + `SpendLoot` 원자적 차감 → 후속 요청은 자연 실패 (이중 소비 불가) |
| E6 | **분기 미고정 마법사의 한 세트에 불독+썬콜 카드 동시 노출** | 허용 — 픽 1장이 루트 고정, 같은 세트의 타 분기 카드는 픽 즉시 세트가 닫히므로 무효 |
| E7 | **레벨 캡(20) 도달** | exp 무시, 선택지 미발생 — HUD에 MAX 표기 |
| E8 | **maxed 직전 스킬의 카드가 큐에 이미 추첨돼 있는데 앞 세트에서 같은 스킬을 픽해 만렙 도달** | 픽 시점 `ApplySkillPick`이 false 반환 → 해당 카드 무효 처리 + 필러 보상. 또는 노출 직전 재검증(dequeue 시 풀 조건 재확인) — 구현은 후자 우선 |
| E9 | **유저 이탈(접속 종료)** | 해당 userId 상태 파기. 프로토타입에서는 재접속 복원 없음 (R2와 일관) |
| E10 | **첫 진입 2지선다를 안 고르고 첫 젠 시작** | 허용(비차단 [D14]) — 단 스킬 미보유로 공격 불가하므로 HUD가 픽 유도 강조. 레벨업 선택지는 첫 픽 해소 후 노출 (큐가 보장) |
| E11 | **리롤과 픽 경합** | `RequestReroll(setId)`도 setId 검증 — 픽으로 이미 닫힌 세트의 리롤은 무시 |
| E12 | **filler 메소 지급 시 통화 시스템 부재** | `_CurrencyLogic` 미구현 시 log만 남기고 무시 (프로토타입 허용 범위, #6과 협의) |

---

## 9. 필요 리소스 (RUID는 구현 페이즈에서 `msw-search` 절차로 검색 — ARCHITECTURE §4-5)

| 용도 | 종류 | 검색 키워드 후보 |
|---|---|---|
| 선택지 카드 프레임/배경 | sprite | "card", "카드", "frame", "panel", "패널" |
| 스킬 아이콘 — 전사 | sprite | "파워 스트라이크", "슬래시", "sword", "검기" |
| 스킬 아이콘 — 궁수 | sprite | "애로우", "arrow", "더블샷", "활" |
| 스킬 아이콘 — 마법사 (분기 포함) | sprite | "에너지 볼트", "매직 클로", "파이어 애로우", "썬더 볼트", "블레스", "fire", "thunder", "holy" |
| 스킬 아이콘 — 도적 | sprite | "럭키 세븐", "표창", "dagger", "단검" |
| 장비 카드 아이콘 | sprite | "equipment", "장비", "weapon", "armor" |
| 전리품 아이콘 (비용 표기용) | sprite | "전리품", "loot", "소재", "材料", "drop item" |
| 레벨업 이펙트 | animationclip | "levelup", "레벨업", "light pillar", "빛 기둥" |
| 전직 이펙트 | animationclip | "전직", "advancement", "aura", "glow" |
| 레벨업 사운드 | sound | "levelup", "레벨업", "jingle" |
| 전직 사운드 | sound | "fanfare", "팡파레", "성공" |
| 카드 선택/등장 사운드 | sound | "click", "버튼", "card flip", "pop" |

검색 실패 항목은 구현 노트에 "RUID 필요" 마킹 (ARCHITECTURE §4-5).

---

## 10. 검증 포인트 (Phase 4 인계)

- 로그 체크포인트: `InitForStage`, `LevelUp(level)`, `ChoiceOffered(setId, n장)`, `Pick(kind,id)`, `RouteLocked(branch)`, `JobAdvanced(tier)`, `AdvanceDeferred`, `Expanded(5)` — 전부 `log()`로 출력.
- 시나리오: ①첫 진입 2지선다 → ②처치 누적 레벨업 → 3카드(90/10) → ③노출 3회 → 전직 활성 → 전리품 부족 보류 → 충족 후 전직 → ④마법사 2차 스킬 픽 → 분기 고정 → 타 분기 미등장 확인 → ⑤확장 3→5 + 장비 확률 상승 → ⑥스테이지 종료 → Lv.1 재시작.
