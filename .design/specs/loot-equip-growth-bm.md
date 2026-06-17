# Spec — loot-equip-growth-bm (장비 / 전리품 / 내실 / BM / 재화·영속 데이터)

> 시스템 #6 (ARCHITECTURE.md §2). 기획서 근거: p.14, 16, 17, 18 (+메소/레드메소 드랍은 p.19~20, ARCHITECTURE.md §2 #7 인용).
> 본 스펙은 구현 직전 단계 상세 설계다. 이 단계에서는 구현 파일을 만들지 않는다 (스펙 .md만).
> 이벤트/메서드 명세는 잠정안이며 최종 확정은 `MASTER_PLAN.md` (ARCHITECTURE.md §5).

---

## 1. 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (페이지) | 구현 항목 | 비고 |
|---|---|---|---|
| R1 | 선택지 구성: 스킬 90% / 장비 10% (p.14, p.16) | `EquipmentLogic:GetEquipmentAppearChance()` — ChoiceLogic(시스템 4)이 카드 추첨 시 조회 | 확률값의 소유는 본 시스템, 추첨 실행은 시스템 4 |
| R2 | 장비는 스테이지 종료 시 소멸 (p.16 "스테이지가 종료되면 장비는 사라지는 개념") | `StageEndedEvent` 수신 → `EquipmentLogic:ClearRunState()` | 런 상태는 DataStorage에 절대 저장하지 않음 |
| R3 | 장비 효율은 스킬보다 훨씬 높게 (p.14 "스킬보다 장비가 더 높은 밸류", p.16) | 장비 카드 밸류 +13%~+30% 상당 (스킬 1픽 기대 밸류 +8~10% 가정, 시스템 3 소유) | 카드 테이블 §3.1 |
| R4 | 장비 카드 데이터 — 예: 낡은 글라디우스 공격력 +13% (p.16 카드) | `EquipmentBalance` 카드 풀 8종 | +13% 외 카드 수치는 [설계 결정] (기획서 카드 이미지의 텍스트 추출 불가) |
| R5 | 전리품: 젠 몬스터 처치 시 일정 확률 획득 (p.16) | `LootLogic` — `MonsterKilledEvent` 수신 후 확률 롤 | 확률 20% [설계 결정], §3.2 |
| R6 | 전리품 용처 2가지: 전직 재료 / 선택지 확장 재료, 자유 선택 (p.14, p.16) | `LootLogic:TrySpendLoot(userId, amount, reason)` — 시스템 4(전직)와 본 시스템(확장)이 공용 호출 | 전직 비용 수치는 시스템 4와 공동 확정 |
| R7 | 전리품으로 선택지 3 → 5 확장 (p.16) | `LootLogic:TryExpandChoice(userId)` — 스테이지 내 영구 적용 | 비용 5개 [설계 결정] |
| R8 | 5개 확장 시 장비 등장 확률도 상승 (p.16) | 확장 시 장비 확률 10% → 15% [설계 결정] | "원하는 선택지를 고를 확률 증가"는 5지선다의 자연 효과 — 별도 구현 불요 |
| R9 | 내실: 계정 귀속, 기본 캐릭터 능력치 상승 (p.17) | `GrowthLogic` — 능력치 트랙 3종, DataStorage 영속 | §3.3 |
| R10 | 내실의 클리어 영향은 굉장히 낮게 (p.17 "운과 선택이 결과를 만드는 게임이 절대적 우선") | 풀강화 시 총 공격력 보너스 ≤ +7% 상한 설계 | §3.3 합산 상한 검증식 포함 |
| R11 | 스테이지 장비와 별도의 내실 '장비' 존재 (p.17) | `GrowthLogic` 내실 장비 3슬롯 (구매 + 강화) | §3.4 |
| R12 | 에너지: 최초 시작 / 다시하기 / 이어하기 소모 (p.18) | `EnergyLogic:TryConsumeEnergy(userId, reason)` | 시간 충전 파라미터는 [설계 결정] §3.5 |
| R13 | 배치/선택지 리롤 — 결과 무조건 랜덤, 스테이지당 3회 제한 (p.18) | `RerollLogic` — 공용 카운터 3회/스테이지 | 배치·선택지 합산 3회 [설계 결정] |
| R14 | 내실 BM: 능력치 강화 BM + 장비 구매·강화 BM (p.18) | GrowthPopup에서 메소/레드메소 소모로 강화·구매 | 실결제(world_item) 미구현, 재화로 시뮬레이션 [설계 결정] |
| R15 | 과도한 BM 지양, 플레이 보조 형태 (p.18) | BM은 전부 게임 내 재화로 동작, 클리어 직결 효과 없음 | R10과 동일한 상한 정책 |
| R16 | 메소/레드메소 드랍 (p.19~20, ARCHITECTURE §2 #7) | 일반 몬스터 → 메소(확률), 보스 → 메소 + 레드메소(확정) | §3.6 |
| R17 | 영속 데이터: 내실/에너지/메소/스테이지 진행도 (ARCHITECTURE §1) | `PlayerDataLogic` — UserDataStorage 단일 게이트웨이 | §6 스키마. 진행도 키는 시스템 8이 본 게이트웨이 API로 읽고 씀 |

**[설계 결정] 표기 원칙**: 기획서에 수치·세부 규칙이 명시되지 않은 항목은 프로토타입 관점에서 본 문서가 확정한다. 기획서 명시 수치(10%, 90%, 3회, 3→5 등)는 그대로 옮겼다.

---

## 2. 상태 소유권과 수명

| 상태 | 수명 | 소유 | 영속화 |
|---|---|---|---|
| 장비(획득 목록·합산 효과) | 스테이지 런 | `EquipmentLogic` (서버) | ❌ 스테이지 종료 시 소멸 (R2) |
| 전리품 수량 | 스테이지 런 | `LootLogic` (서버) | ❌ |
| 선택지 확장 여부 | 스테이지 런 | `LootLogic` (서버) | ❌ |
| 리롤 잔여 횟수 | 스테이지 런 | `RerollLogic` (서버) | ❌ |
| 에너지 (수량 + 마지막 충전 시각) | 계정 | `EnergyLogic` → `PlayerDataLogic` 경유 | ✅ |
| 메소 / 레드메소 | 계정 | `PlayerDataLogic` (서버) | ✅ |
| 내실 능력치 Lv / 내실 장비 | 계정 | `GrowthLogic` → `PlayerDataLogic` 경유 | ✅ |

- 게임 전체가 `map/map01.map` 단일 맵에서 진행되므로 (ARCHITECTURE §1) 모든 서버 상태는 `@Logic`으로 두고, 런 스코프 상태는 **이벤트 기반 명시적 리셋**(`StageStartedEvent` 수신 시 초기화, `StageEndedEvent` 수신 시 소멸)으로 관리한다. `OnMapEnter`는 `@Logic`에서 발화하지 않으므로 사용하지 않는다.
- 서버 권위 원칙(ARCHITECTURE §4-8): HP/재화/선택지 등 모든 판정은 서버 `@Logic`. 클라이언트는 표시와 요청만.

---

## 3. 데이터 테이블 (밸런스 상수)

모든 상수는 각 `*Balance` 스크립트에 단일 정의 — 매직 넘버 인라인 금지 (ARCHITECTURE §4-7).

### 3.1 장비 카드 풀 — `EquipmentBalance.CARDS`

| id | 표시명(한국어) | 효과 | 출처 |
|---|---|---|---|
| `eq_old_gladius` | 낡은 글라디우스 | `atkMul +0.13` (공격력 +13%) | 기획서 p.16 카드 |
| `eq_fruit_knife` | 과도 | `atkMul +0.08`, `atkSpeedMul +0.10` | [설계 결정] |
| `eq_maple_staff` | 단풍 지팡이 | `skillDmgMul +0.20` (스킬 데미지 +20%) | [설계 결정] |
| `eq_battle_bow` | 전투 활 | `rangeAdd +1` (공격 사거리 +1칸) | [설계 결정] |
| `eq_work_gloves` | 작업용 장갑 | `critChanceAdd +0.10` (크리티컬 확률 +10%p) | [설계 결정] |
| `eq_red_whip` | 붉은 채찍 | `targetAdd +1` (공격 대상 +1) | [설계 결정] |
| `eq_old_maple_book` | 낡은 단풍 서적 | `expGainMul +0.15` (경험치 획득 +15%) | [설계 결정] |
| `eq_lucky_charm` | 행운의 부적 | `lootDropAdd +0.10` (전리품 드랍률 +10%p) | [설계 결정] |

- 스킬 1픽 기대 밸류(+8~10%, 시스템 3 소유) 대비 장비 1픽은 +13~30% 상당 → R3 충족.
- 중복 획득 허용, 효과는 **합연산** [설계 결정] (예: 글라디우스 2개 = atkMul +0.26).
- 슬롯 제한 없음 [설계 결정] — 스테이지 한정 자원이고 10% 확률이라 런당 기대 획득 수가 낮음.

### 3.2 장비·전리품 확률 — `EquipmentBalance` / `LootBalance`

| 상수 | 값 | 출처 |
|---|---|---|
| `CHOICE_EQUIP_CHANCE_BASE` | `0.10` | p.14, p.16 (10%) |
| `CHOICE_EQUIP_CHANCE_EXPANDED` | `0.15` | p.16 "확장 시 장비 등장 확률도 상승" — 수치 [설계 결정] |
| `CHOICE_COUNT_BASE` | `3` | p.14 |
| `CHOICE_COUNT_EXPANDED` | `5` | p.16 |
| `LOOT_DROP_CHANCE_NORMAL` | `0.20` (처치당 1개) | p.16 "일정 확률" — 수치 [설계 결정] |
| `LOOT_DROP_COUNT_BOSS` | `3` (확정) | [설계 결정] |
| `CHOICE_EXPAND_LOOT_COST` | `5` | [설계 결정] |
| `JOB_ADV_LOOT_COST` | `{ 3, 5, 8 }` (1→2차, 2→3차, 3→4차) | p.14 "최대 4차 전직" — 비용 수치 [설계 결정], **시스템 4와 공동 확정 필요** |

### 3.3 내실 능력치 트랙 — `GrowthBalance.STATS`

| key | 표시명 | 효과/Lv | 최대 Lv | 강화 비용 (메소) |
|---|---|---|---|---|
| `atk` | 공격력 단련 | `atkMul +0.005` (+0.5%) | 10 | `floor(100 × 1.5^Lv)` |
| `exp` | 학습 능력 | `expGainMul +0.01` (+1%) | 10 | `floor(100 × 1.5^Lv)` |
| `loot` | 수집가의 눈 | `lootDropAdd +0.003` (+0.3%p) | 10 | `floor(100 × 1.5^Lv)` |

(전부 [설계 결정] — p.17은 "영향 굉장히 낮게"만 명시)

### 3.4 내실 장비 — `GrowthBalance.EQUIPS`

| slot | 표시명 | 구매가 (메소) | 효과/강화Lv | 최대 강화 Lv | 강화 비용 |
|---|---|---|---|---|---|
| `weapon` | 수련용 목검 | 1,000 | `atkMul +0.004` | 5 | 메소 `300 × Lv` (Lv4→5는 추가로 레드메소 1) |
| `armor` | 수련복 | 1,500 | `expGainMul +0.008` | 5 | 동일 |
| `charm` | 수련 명패 | 2,000 | `lootDropAdd +0.004` | 5 | 동일 |

(전부 [설계 결정] — p.17 "내실을 올릴 수 있는 '장비'가 별도로 존재", p.18 "장비를 구매 및 강화할 수 있는 BM")

**R10 상한 검증**: 내실 풀강 시 `atkMul` 총합 = 능력치 0.05 + 장비 0.02 = **+7%** ≤ 장비 카드 1장(+13%)보다 낮음 → "내실 < 런 내 운/선택" 원칙 충족.

### 3.5 에너지 — `BmBalance.ENERGY`

| 상수 | 값 | 출처 |
|---|---|---|
| `MAX` | `5` | [설계 결정] |
| `REFILL_INTERVAL_SEC` | `600` (10분당 1) | 시간 충전 — 충전 주기 [설계 결정] |
| `COST_STAGE_START` | `1` | p.18 "최초 시작" |
| `COST_RETRY` | `1` | p.18 "다시하기" |
| `COST_CONTINUE` | `1` | p.18 "이어하기" |
| `FULL_REFILL_RED_MESO_COST` | `1` (레드메소 1로 풀충전) | BM 보조 형태(p.18 R15) — [설계 결정] |

### 3.6 메소 / 레드메소 — `BmBalance.CURRENCY`

| 상수 | 값 | 출처 |
|---|---|---|
| `MESO_DROP_CHANCE_NORMAL` | `0.30`, 획득량 `1~3` | 드랍 자체는 p.19~20, 수치 [설계 결정] |
| `MESO_DROP_BOSS` | `20` (확정) | [설계 결정] |
| `RED_MESO_DROP_BOSS` | `1` (확정) | p.19~20 "레드메소 드랍(보스)" — 수량 [설계 결정] |
| `MESO_STAGE_CLEAR_BONUS` | `50` | [설계 결정] |

### 3.7 리롤 — `BmBalance.REROLL`

| 상수 | 값 | 출처 |
|---|---|---|
| `PER_STAGE_LIMIT` | `3` (배치+선택지 **합산**) | p.18 "스테이지 플레이당 3회로 제한" — 합산 해석은 [설계 결정] |
| 결과 | 무조건 재랜덤 (개선 보장 없음) | p.18 "좋아질 수도 나빠질 수도 있음" |

[설계 결정] 프로토타입에서 리롤권 추가 구매는 없음 (3회 하드캡). 실결제 BM 연동 지점만 §9 리스크에 명시.

---

## 4. 파일 매니페스트

### 4.1 `.mlua` — `RootDesk/MyDesk/Zengard/` 하위

| 파일 | 종류 | 주 ExecSpace | 책임 |
|---|---|---|---|
| `Zengard/Growth/PlayerDataLogic.mlua` | `@Logic` | ServerOnly (저장/로드/재화), Client (푸시 RPC) | **영속 데이터 단일 게이트웨이**. UserDataStorage 로드(유저 입장 시 `GetAndWait` 1회) → 인메모리 캐시 → dirty+debounce(30s) flush → 유저 퇴장 시 `SetAndWait`. 메소/레드메소 잔액·증감(`TrySpend*` 패턴). 타 시스템용 섹션 API(`GetSection`/`SetSection` — 스테이지 진행도는 시스템 8이 이걸로 접근) |
| `Zengard/Growth/GrowthLogic.mlua` | `@Logic` | ServerOnly (강화 판정), Server (클라 요청 수신) | 내실 능력치 강화, 내실 장비 구매/강화, 합산 배수 제공 `GetGrowthMultipliers(userId)` |
| `Zengard/Growth/GrowthBalance.mlua` | `@Logic` | (무지정 — 순수 데이터 조회) | §3.3, §3.4 상수 테이블 |
| `Zengard/Equipment/EquipmentLogic.mlua` | `@Logic` | ServerOnly | 장비 카드 추첨(`DrawEquipmentCard`), 지급(`GrantEquipment`), 런 합산 효과 `GetEquipStatMultipliers(userId)`, 장비 등장 확률 제공, `StageEndedEvent` 시 런 상태 소멸 |
| `Zengard/Equipment/EquipmentBalance.mlua` | `@Logic` | (무지정) | §3.1, §3.2 카드 풀·확률 상수 |
| `Zengard/Loot/LootLogic.mlua` | `@Logic` | ServerOnly (드랍/차감), Server (확장 요청) | `MonsterKilledEvent` 수신 → 전리품/메소 드랍 롤, 전리품 잔액, `TrySpendLoot`(전직·확장 공용), 선택지 3→5 확장 상태 |
| `Zengard/Bm/EnergyLogic.mlua` | `@Logic` | ServerOnly (충전/소모), Server (충전 구매 요청) | 시간 경과 lazy 충전 계산, `TryConsumeEnergy`, 레드메소 풀충전 |
| `Zengard/Bm/RerollLogic.mlua` | `@Logic` | ServerOnly (카운터), Server (리롤 요청) | 스테이지당 3회 카운터, 검증·차감 후 대상 시스템에 재추첨 위임 |
| `Zengard/Bm/BmBalance.mlua` | `@Logic` | (무지정) | §3.5~3.7 상수 테이블 |
| `Zengard/Growth/GrowthPopupController.mlua` | `@Component` (UI 루트 엔티티 부착) | ClientOnly (표시), 요청은 `_GrowthLogic`의 Server 메서드 호출 | GrowthPopup 표시/갱신, 강화·구매 버튼 핸들링 |
| `Zengard/Bm/MetaHudController.mlua` | `@Component` (UI 루트 엔티티 부착) | ClientOnly | 에너지 5칸 + 충전 타이머, 메소/레드메소 카운터, 스테이지 중 리롤 잔여 표시 |
| `Zengard/Loot/LootChangedEvent.mlua` | `@Event` | — | `userId:string, amount:integer, delta:integer, reason:string` |
| `Zengard/Loot/ChoiceExpandedEvent.mlua` | `@Event` | — | `userId:string` (시스템 4가 수신 → 선택지 5장 모드 전환) |
| `Zengard/Equipment/EquipmentGrantedEvent.mlua` | `@Event` | — | `userId:string, equipId:string` (시스템 2가 수신 → 데미지 배수 캐시 무효화) |
| `Zengard/Bm/RerollUsedEvent.mlua` | `@Event` | — | `userId:string, kind:string("placement"|"choice"), remaining:integer` |

- `@Logic` 접근명은 파일명 그대로: `_PlayerDataLogic`, `_GrowthLogic`, `_EquipmentLogic`, `_LootLogic`, `_EnergyLogic`, `_RerollLogic` (msw-scripting §3.2 — 접미사 생략 금지).
- 클라→서버 요청 메서드는 전부 `@ExecSpace("Server")` + `senderUserId` 검증. 서버→특정 클라 푸시는 `@ExecSpace("Client")` + 호출부 마지막 인자 UserId.
- 모든 핵심 체크포인트에 `log()` 삽입 (ARCHITECTURE §4-9): 데이터 로드/flush, 드랍 롤 결과, 장비 지급, 에너지 소모, 리롤 사용, 확장.

### 4.2 `.model` — `RootDesk/MyDesk/Models/` (ModelBuilder 경유만)

| 파일 | 책임 | 비고 |
|---|---|---|
| `Models/Effects/LootDropEffect.model` | 처치 위치에 뜨는 전리품 획득 연출 (Transform + SpriteRenderer, Body 없음) | 선택적 폴리시 — 미구현이어도 시스템 동작에 영향 없음 |
| `Models/Effects/MesoDropEffect.model` | 메소 획득 연출 (동일 구성) | 선택적 폴리시 |

### 4.3 `.ui` — `ui/` (UIBuilder 경유만)

| 파일 | UI 그룹 | 책임 |
|---|---|---|
| `ui/GrowthPopup.ui` | `GrowthGroup` (ARCHITECTURE §5 잠정) | 내실 팝업: 능력치 3트랙(현재 Lv/효과/비용/강화 버튼), 내실 장비 3슬롯(구매/강화), 보유 메소·레드메소 표시, 닫기 |
| `ui/MetaHud.ui` | `GameHUDGroup` 보조 (좌상단 고정) | 에너지 게이지(5칸)+다음 충전 mm:ss, 메소/레드메소 카운터, 리롤 잔여(스테이지 중에만 표시) |

- 리롤 **버튼** 자체는 본 시스템 UI에 두지 않는다: 배치 리롤 버튼은 게임 HUD(시스템 8), 선택지 리롤 버튼은 선택지 카드 팝업(시스템 4)에 배치하고, 둘 다 `_RerollLogic:RequestReroll(kind)`를 호출하는 계약으로 연결 (파일 소유권 충돌 회피, ARCHITECTURE §4-10).

---

## 5. API / 이벤트 계약

### 5.1 본 시스템이 노출하는 메서드 (서버)

```lua
-- _PlayerDataLogic
@ExecSpace("ServerOnly") method integer GetMeso(string userId)
@ExecSpace("ServerOnly") method integer GetRedMeso(string userId)
@ExecSpace("ServerOnly") method void AddCurrency(string userId, string kind, integer amount)   -- kind: "meso"|"redMeso"
@ExecSpace("ServerOnly") method boolean TrySpendCurrency(string userId, string kind, integer amount)
@ExecSpace("ServerOnly") method string GetSection(string userId, string sectionKey)            -- 직렬화된 섹션(예: 시스템 8의 "progress")
@ExecSpace("ServerOnly") method void SetSection(string userId, string sectionKey, string data) -- dirty 마킹 포함

-- _EnergyLogic
@ExecSpace("ServerOnly") method integer GetEnergy(string userId)                  -- lazy refill 반영값
@ExecSpace("ServerOnly") method boolean TryConsumeEnergy(string userId, string reason)  -- reason: "stage_start"|"retry"|"continue"
@ExecSpace("ServerOnly") method integer GetNextRefillRemainingSec(string userId)
@ExecSpace("Server")     method void RequestFullRefillByRedMeso()                 -- senderUserId 기준

-- _LootLogic
@ExecSpace("ServerOnly") method integer GetLootCount(string userId)
@ExecSpace("ServerOnly") method boolean TrySpendLoot(string userId, integer amount, string reason)  -- reason: "job_adv"|"choice_expand"
@ExecSpace("ServerOnly") method boolean IsChoiceExpanded(string userId)
@ExecSpace("Server")     method void RequestExpandChoice()                        -- senderUserId 기준

-- _EquipmentLogic
@ExecSpace("ServerOnly") method number  GetEquipmentAppearChance(string userId)   -- 0.10 또는 0.15
@ExecSpace("ServerOnly") method string  DrawEquipmentCard(string userId)          -- 카드 id 반환 (시스템 4의 선택지 구성 시 호출)
@ExecSpace("ServerOnly") method void    GrantEquipment(string userId, string equipId)  -- 선택 확정 시 호출
@ExecSpace("ServerOnly") method table   GetEquipStatMultipliers(string userId)
        -- { atkMul, atkSpeedMul, skillDmgMul, critChanceAdd, rangeAdd, targetAdd, expGainMul, lootDropAdd }
@ExecSpace("ServerOnly") method void    ClearRunState(string userId)

-- _GrowthLogic
@ExecSpace("ServerOnly") method table   GetGrowthMultipliers(string userId)       -- EquipStatMultipliers와 동일 키 셋(없는 키 0)
@ExecSpace("Server")     method void RequestUpgradeStat(string statKey)
@ExecSpace("Server")     method void RequestBuyGrowthEquip(string slotKey)
@ExecSpace("Server")     method void RequestEnhanceGrowthEquip(string slotKey)

-- _RerollLogic
@ExecSpace("ServerOnly") method integer GetRemainingRerolls(string userId)
@ExecSpace("Server")     method void RequestReroll(string kind)                   -- kind: "placement"|"choice"
```

### 5.2 의존하는 외부 계약 (MASTER_PLAN에서 최종 확정)

| 계약 | 방향 | 내용 |
|---|---|---|
| `MonsterKilledEvent` | 수신 | 필요 필드: `killerUserId:string`, `monsterId:string`, `isBoss:boolean`, `worldPos:Vector2` (드랍 연출용). 시스템 1/7 발신 |
| `StageStartedEvent` *(ZenStartedEvent와 별개의 런 시작 신호 — MASTER_PLAN에 추가 요청)* | 수신 | 런 스코프 리셋: 장비/전리품/확장/리롤. `ZengardGameLogic` 발신 |
| `StageEndedEvent` | 수신 | `result:string("clear"|"fail")` — 장비 소멸(R2), 클리어 보너스 메소 지급 |
| `_ZengardGameLogic` 상태 머신 | 호출됨 | 스테이지 시작/다시하기/이어하기 진입 직전에 `_EnergyLogic:TryConsumeEnergy()` 호출, `false`면 진입 차단 |
| 시스템 4 `ChoiceLogic` | 호출됨/호출 | 선택지 구성 시 `GetEquipmentAppearChance`·`DrawEquipmentCard`·`IsChoiceExpanded` 조회, 장비 선택 확정 시 `GrantEquipment`. 전직 시 `TrySpendLoot(userId, cost, "job_adv")` |
| 시스템 4 `ChoiceLogic:RerollCurrentChoices(userId)` | 호출 | 선택지 리롤 위임 (잠정 시그니처) |
| 시스템 1 `WaveLogic:ReshufflePlacement()` | 호출 | 배치 리롤 위임 (잠정 시그니처) |
| 시스템 2 데미지 계산 | 호출됨 | `finalAtk = baseAtk × skillMul × (1 + equip.atkMul) × (1 + growth.atkMul)` — `GetEquipStatMultipliers` + `GetGrowthMultipliers` 합산 소비 |
| `_UserService` 유저 입장/퇴장 | 수신 | 입장 시 `PlayerDataLogic` 로드, 퇴장 시 flush. 이벤트명(.d.mlua `UserEnterEvent`/`UserLeaveEvent` 상당)은 구현 시 `Environment/NativeScripts/Event/`에서 시그니처 확인 후 확정 |

### 5.3 클라이언트 동기화 (UI 바인딩)

`@Logic`은 유저별 `@TargetUserSync`를 쓸 수 없으므로 **서버 → 해당 클라 `@ExecSpace("Client")` RPC 푸시** 패턴을 쓴다 (호출부 마지막 인자 UserId):

```lua
-- PlayerDataLogic → MetaHudController가 수신
@ExecSpace("Client") method void SyncMetaStatus(integer meso, integer redMeso,
        integer energy, integer nextRefillSec, integer remainingRerolls, integer lootCount)
-- GrowthLogic → GrowthPopupController가 수신
@ExecSpace("Client") method void SyncGrowthState(string growthJson)   -- 능력치 Lv + 장비 상태 직렬화
```

- 푸시 트리거: 값 변경 시 + 클라가 `@ExecSpace("Server")` `RequestSync()`로 최초 1회 요청 (UI OnBeginPlay 타이밍 레이스 회피).
- UI 컨트롤러의 버튼 핸들러는 `ButtonClickEvent`를 **엔티티에서** `ConnectEvent` (Component가 아닌 Entity 대상, `OnEndPlay`에서 전부 disconnect).

---

## 6. 영속 데이터 스키마 (UserDataStorage)

- 스토리지: `_DataStorageService` UserDataStorage (유저 데이터를 Global에 두지 않음 — datastorage.md §4.5).
- 키: `"meta"` 단일 키, 값은 `_UtilLogic:TableToString` 직렬화. 예상 크기 ~300바이트 ≪ 4,000바이트(1크레딧).
- 스테이지 진행도는 별도 키 `"progress"` — 내용 스키마는 시스템 8 소유, 본 시스템은 `GetSection`/`SetSection` 게이트웨이만 제공 (빈도가 다른 데이터의 키 분리, datastorage.md §3).

```lua
-- key "meta" (v: 스키마 버전, 마이그레이션 대비)
{
  v = 1,
  meso = 0,
  redMeso = 0,
  energy = { amount = 5, lastRefillAt = 0 },   -- lastRefillAt: 서버 UTC epoch sec
  growth = {
    stats  = { atk = 0, exp = 0, loot = 0 },   -- 트랙별 Lv
    equips = {                                  -- own: 0/1, lv: 강화 Lv
      weapon = { own = 0, lv = 0 },
      armor  = { own = 0, lv = 0 },
      charm  = { own = 0, lv = 0 },
    },
  },
}
```

**호출 규율** (datastorage.md 5규칙 준수):
- 읽기: 유저 입장 시 `GetAndWait` 1회 → 이후 전부 인메모리 캐시. `errorCode == NotFound(1000002)`면 기본값 생성.
- 쓰기: 변경 시 dirty 마킹만 → 30초 debounce flush(`SetAsync`) + 유저 퇴장/월드 종료 시 `SetAndWait`. 무변경 저장 금지.
- `OnUpdate`/단주기 타이머에서 호출 금지. 에너지 충전은 저장 트리거가 아님(§7.3 lazy 계산 — 소모/구매 시에만 dirty).
- `errorCode` 분기 필수: `ResourceExhausted(1000005)` 시 flush 주기 강제 2배 백오프 + `log_warning`.
- 런 상태(장비/전리품/리롤/확장)는 **절대 저장하지 않는다.**

---

## 7. 핵심 알고리즘 의사코드

### 7.1 선택지 카드 추첨 (시스템 4가 호출하는 본 시스템 기여분)

```
-- ChoiceLogic(시스템 4) 측 의사코드, 본 시스템 API 사용 부분
function BuildChoiceCards(userId):
    count = _LootLogic:IsChoiceExpanded(userId) and 5 or 3        -- R7
    equipChance = _EquipmentLogic:GetEquipmentAppearChance(userId) -- 0.10 / 0.15 (R1, R8)
    cards = []
    for i = 1..count:
        if _UtilLogic:RandomDouble() < equipChance:
            cards[i] = { type = "equip", id = _EquipmentLogic:DrawEquipmentCard(userId) }
        else:
            cards[i] = { type = "skill", id = SkillPool:Draw(userId) }   -- 시스템 3/4 소유
    return cards
-- 슬롯별 독립 롤 [설계 결정]: "선택지 구성은 ... 10% 확률로 노출"(p.14)을 슬롯 단위 확률로 해석.
-- 장비 카드 추첨은 풀에서 균등 추첨, 동일 추첨 내 중복 회피(풀 8종 ≥ 5):
function _EquipmentLogic:DrawEquipmentCard(userId):
    pool = CARDS에서 이번 추첨에 이미 나온 id 제외
    return pool[_UtilLogic:RandomIntegerRange(1, #pool)].id
```

### 7.2 처치 드랍 롤 (전리품 + 메소)

```
on MonsterKilledEvent(e):     -- ServerOnly
    mul = _EquipmentLogic:GetEquipStatMultipliers(e.killerUserId)
    grow = _GrowthLogic:GetGrowthMultipliers(e.killerUserId)
    if e.isBoss:
        loot += LOOT_DROP_COUNT_BOSS                       -- 확정 3
        AddCurrency(meso, MESO_DROP_BOSS); AddCurrency(redMeso, RED_MESO_DROP_BOSS)  -- R16
    else:
        lootChance = LOOT_DROP_CHANCE_NORMAL + mul.lootDropAdd + grow.lootDropAdd
        if RandomDouble() < lootChance: loot += 1          -- R5
        if RandomDouble() < MESO_DROP_CHANCE_NORMAL:
            AddCurrency(meso, RandomIntegerRange(1, 3))
    SendEvent(LootChangedEvent); SyncMetaStatus(...)        -- 변경 시에만 푸시
```

### 7.3 에너지 lazy 충전 (저장소 폴링 없음)

```
function RefreshEnergy(userId):                -- 모든 Get/Consume 진입점에서 호출
    st = cache[userId].energy
    if st.amount >= MAX: st.lastRefillAt = now(); return   -- 풀충전 중엔 타이머 정지
    gained = floor((now() - st.lastRefillAt) / REFILL_INTERVAL_SEC)
    if gained > 0:
        st.amount = min(MAX, st.amount + gained)
        st.lastRefillAt += gained * REFILL_INTERVAL_SEC    -- 잔여 진행분 보존
        markDirty(userId)
function TryConsumeEnergy(userId, reason):
    RefreshEnergy(userId)
    if st.amount <= 0: return false                        -- 호출측이 진입 차단 + 충전 안내
    if st.amount == MAX: st.lastRefillAt = now()           -- 풀→비풀 전환 시 타이머 기점
    st.amount -= 1; markDirty(userId); push(); return true
-- now()는 서버 DateTime UTC 기준. 클라 시계는 절대 신뢰하지 않음.
```

### 7.4 리롤

```
function RequestReroll(kind):                  -- @ExecSpace("Server"), senderUserId 검증
    userId = senderUserId
    if runState[userId].rerolls <= 0: return   -- 클라 버튼은 이미 disable, 서버 이중 방어
    if kind == "choice" and not ChoiceLogic:HasOpenChoice(userId): return
    runState[userId].rerolls -= 1
    SendEvent(RerollUsedEvent{userId, kind, remaining})
    if kind == "placement": _WaveLogic:ReshufflePlacement()          -- 결과 무조건 랜덤 (R13)
    else: _ChoiceLogic:RerollCurrentChoices(userId)                  -- 새 카드도 7.1로 재추첨
```

### 7.5 선택지 확장 / 내실 강화 (TrySpend 패턴 공통)

```
function RequestExpandChoice():                -- @ExecSpace("Server")
    if IsChoiceExpanded(senderUserId): return
    if not TrySpendLoot(senderUserId, CHOICE_EXPAND_LOOT_COST, "choice_expand"): return
    expanded[senderUserId] = true
    SendEvent(ChoiceExpandedEvent{senderUserId})   -- 시스템 4가 다음 레벨업부터 5장 노출

function RequestUpgradeStat(statKey):          -- @ExecSpace("Server")
    lv = growth.stats[statKey]
    if lv >= MAX_LV: return
    cost = StatCost(statKey, lv)
    if not _PlayerDataLogic:TrySpendCurrency(senderUserId, "meso", cost): return
    growth.stats[statKey] = lv + 1; markDirty(); SyncGrowthState(...)
-- 검증→차감→적용을 한 서버 메서드 안에서 순차 수행. mlua 서버 스크립트는 단일 스레드
-- 이벤트 루프이므로 메서드 내 비-wait 구간은 원자적 — wait()를 차감/적용 사이에 두지 않는다.
```

---

## 8. 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| E1 | **동시 처치** — 같은 프레임에 `MonsterKilledEvent` 다발 | 서버 핸들러는 순차 실행. 드랍/잔액은 인메모리 캐시 증감만(킬당 DataStorage 호출 없음 — 크레딧 규칙). 푸시 RPC는 프레임당 1회로 디바운스 |
| E2 | **전리품 경합** — 전직과 선택지 확장을 연달아 시도, 잔액 부족 | `TrySpendLoot`가 검증→차감 원자 수행, 실패 시 `false`. UI는 결과 푸시로 재동기화 (선차감/낙관적 UI 금지) |
| E3 | **확장 직후 장비 풀 부족** — 5장 추첨에서 장비가 다수 등장 | 풀 8종 ≥ 5장이라 동일 추첨 내 중복 회피 가능. 그래도 부족하면 중복 허용으로 폴백 (7.1) |
| E4 | **보드 가득 참 상태에서 배치 리롤** | 리롤은 재배치만 하고 몬스터 수를 줄이지 않음 — 실패 조건(몬스터 수 임계치, 시스템 1 소유) 판정은 리롤과 무관하게 유지. 리롤 호출이 임계치 판정을 지연시키지 않도록 `ReshufflePlacement`는 동기 완료 계약 |
| E5 | **선택지 팝업 열림 중 선택지 리롤** | 기존 카드 버튼 핸들러를 disconnect 후 재구성(시스템 4 책임), 본 시스템은 카운터 차감만. 열린 선택지가 없으면 차감하지 않음 (7.4 가드) |
| E6 | **에너지 0에서 시작/이어하기** | `TryConsumeEnergy == false` → `ZengardGameLogic`이 진입 차단, MetaHud가 다음 충전 카운트다운 + 레드메소 충전 버튼 노출 |
| E7 | **충전 대기 중 월드 재접속 / 클라 시계 조작** | `lastRefillAt`은 서버 UTC epoch로 저장, 재접속 시 lazy 계산으로 정확 복원. 클라 시간은 표시용으로도 서버가 내려준 `nextRefillSec`만 사용 |
| E8 | **스테이지 비정상 종료** (접속 끊김, 강제 종료) | 장비/전리품/확장/리롤은 비영속이므로 자연 소멸 = 기획 의도(R2)와 일치. 퇴장 flush는 계정 데이터만 |
| E9 | **DataStorage 실패** | `NotFound` → 기본값 신규 생성. `TimedOut` → 다음 flush에 합산. `ResourceExhausted` → flush 백오프 2배 + `log_warning`, 인메모리 상태는 유지 (플레이 무중단) |
| E10 | **장비 중복 획득** | 합연산 누적 (§3.1). 표시는 "낡은 글라디우스 ×2"식 스택 카운트 |
| E11 | **리롤 3회 소진** | 서버 카운터가 단일 진실. 클라 버튼 disable은 `remainingRerolls` 푸시 기반, 서버 메서드에도 이중 가드 (7.4) |
| E12 | **스테이지 종료와 선택지 보류의 레이스** — 보스 처치 직후 미확정 선택지 | `StageEndedEvent` 수신 시 `ClearRunState`가 보류 장비 카드도 함께 무효화. 시스템 4의 선택지 팝업 강제 닫기와 순서 무관하게 안전 (이후 `GrantEquipment` 호출은 런 비활성 가드로 무시 + `log_warning`) |
| E13 | **다시하기/이어하기 시 런 상태** | 다시하기 = 새 런 → 전부 리셋(리롤 3회 복원 포함, "스테이지 플레이당" 해석 [설계 결정]). 이어하기 = 런 유지 → 리셋하지 않음 |
| E14 | **스키마 버전 상이** (`v` 불일치) | 로드 시 `v < 현재`면 필드별 기본값 채움 마이그레이션 후 dirty 마킹 |
| E15 | **메소 음수 방어** | 모든 차감은 `TrySpendCurrency` 경유 — 잔액 부족 시 `false`, 직접 감산 금지 |

---

## 9. 리소스 목록 (msw-search 검색 키워드)

검색 실패 시 해당 항목에 "RUID 필요" 마킹 후 진행 (ARCHITECTURE §4-5). `SpriteRUID` 빈 문자열 금지.

| 용도 | 종류 | 검색 키워드 |
|---|---|---|
| 메소 아이콘/드랍 연출 | sprite | `메소`, `meso`, `coin`, `gold coin` |
| 레드메소 아이콘 | sprite | `red meso`, `루비`, `ruby`, `red gem` |
| 에너지 아이콘 | sprite | `energy`, `번개`, `lightning bolt`, `포션` |
| 전리품 아이콘 | sprite | `전리품`, `loot`, `보따리`, `pouch`, `treasure` |
| 장비 카드 — 글라디우스 | sprite | `글라디우스`, `gladius`, `sword`, `한손검` |
| 장비 카드 — 기타 7종 | sprite | `과도`, `지팡이 staff`, `활 bow`, `장갑 glove`, `채찍 whip`, `책 book`, `부적 charm` |
| 카드 프레임/등급 배경 | sprite | `card frame`, `카드`, `panel border` |
| 리롤 아이콘 | sprite | `refresh`, `reroll`, `회전 화살표`, `dice` |
| 내실 팝업 배경/버튼 | sprite | UI 스타일 템플릿 우선 (msw-ui-system templates), 보조: `popup background`, `button` |
| 획득 사운드 | sound | `coin pickup`, `동전`, `획득`, `pickup` |
| 강화/구매 성공 사운드 | sound | `upgrade`, `success`, `purchase`, `레벨업` |
| 실패/거부 사운드 | sound | `error`, `deny`, `buzzer` |
| 리롤 사운드 | sound | `shuffle`, `card flip`, `whoosh` |

---

## 10. 리스크 / MASTER_PLAN 확정 요청 사항

1. **기획서 p.16 장비 카드 이미지의 수치 미추출** — "낡은 글라디우스 공격력 +13%" 외 카드의 원본 수치를 텍스트로 확인하지 못함. §3.1의 나머지 7종은 [설계 결정]. 기획서 카드 이미지가 추후 판독되면 해당 수치로 교체.
2. **이벤트 필드 계약** — `MonsterKilledEvent(killerUserId, isBoss, worldPos)`, `StageStartedEvent` 신설, `StageEndedEvent(result)` 필드는 잠정. MASTER_PLAN에서 발신 시스템(1/7/상태머신)과 확정 필요.
3. **전직 비용(JOB_ADV_LOOT_COST)** — 소유권이 시스템 4와 겹침. 본 스펙은 공급(전리품)과 차감 API만 소유하고, 비용 수치 최종값은 시스템 4 스펙과 합치 필요.
4. **에너지 "시간 충전"** — p.18 원문에는 소모처만 명시. 시간 충전 동작과 파라미터(10분/최대 5)는 과제 브리프 + [설계 결정]. 밸런스 조정 지점.
5. **실결제 BM 미구현** — 프로토타입에서는 메소/레드메소로 BM 흐름만 시뮬레이션. 실제 `world_item` 연동은 범위 외로 명시.
6. **`@Logic` 유저별 동기화 부재** — `@TargetUserSync`는 PlayerEntity 전제라 Logic에서 불가 → Client RPC 푸시 패턴 채택. UI OnBeginPlay 타이밍 레이스는 클라발 `RequestSync` 1회로 해소하지만, 멀티유저 시 푸시 누락 버그에 주의 (구현 시 검증 항목).
7. **DataStorage 크레딧** — 킬/프레임 단위 호출 금지 규율을 코드 리뷰 blocking 기준으로 명시 필요 (datastorage.md §0 5규칙).
8. **유저 입장/퇴장 이벤트 시그니처** — `Environment/NativeScripts/Event/`에서 구현 시점에 실제 `.d.mlua` 확인 후 확정 (추측 금지 원칙).
