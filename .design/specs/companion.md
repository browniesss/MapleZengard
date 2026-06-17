# Companion 시스템 상세 스펙 (구현 직전 단계)

> 시스템 ID: `companion` (ARCHITECTURE.md §2 #5)
> 기획서 근거: `20260612_모아요_MSW 협업 월드_5차 게임 기획서.pdf` **p.15** (단일 진실), 보조 근거 p.10/11/12/14/16
> 본 스펙은 ARCHITECTURE.md §1 플랫폼 확정 사항과 §4 공통 제약을 전제로 하며 이를 변경하지 않는다.
> 이 단계에서는 구현 파일을 생성하지 않는다 — 본 문서는 파일 매니페스트와 계약만 확정한다.

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (인용) | 페이지 | 구현 항목 | 비고 |
|---|---|---|---|---|
| R1 | "스테이지마다 등장 시점을 다르게 설정 (스테이지 진입 전 사전에 텍스트 등으로 안내)" | p.15 | 스테이지별 `CompanionTrigger` 설정 테이블 + 스테이지 선택 화면용 안내 텍스트 조회 API (`GetStageCompanionNotice`) | 안내 UI 표시 자체는 ui-modes-stages 소유, 텍스트는 본 시스템이 제공 |
| R2 | "전직 이후 / 네임드 보스 전을 주로 등장 시점으로 활용" | p.15 | 트리거 타입 2종: `AFTER_JOB_ADV`, `BEFORE_NAMED_BOSS` | `JobAdvancedEvent` / `ZenStartedEvent(isBossZen)` 구독 |
| R3 | "직업군 '선택지'로 합류" | p.15 | 트리거 발화 시 직업군 선택지 팝업 (선택지 시스템 `ChoicePopup` 재사용) | 카드 수 3장은 [설계 결정 D3] |
| R4 | "전사 계열 선택 시 2차 전직 기준으로 페이지/파이터/스피어맨 중 랜덤으로 동료 합류" | p.15 | 직업군 → 2차 전직 풀 균등 추첨 테이블 (`SECOND_JOB_POOL`) | 전사 외 직업군 풀은 [설계 결정 D4] |
| R5 | "동료의 능력치는, 원래 플레이 중인 본캐릭터와 유사" | p.15 | 합류 시점 본캐 기본 스탯 스냅샷 복사 (장비 효과 제외) + 본캐 레벨업 시 재동기화 | "유사"의 수치 해석은 [설계 결정 D5] |
| R6 | "동료 또한 본캐릭터와 같이 스킬 성장이 가능" | p.15 | 동료 스킬 카드를 레벨업 선택지 스킬 풀(90%)에 합류 후 편입, 스킬 만렙 Lv.3 | 만렙 Lv.3은 skills-and-fusion 기준 (ARCHITECTURE §2 #3) |
| R7 | "위치 : 랜덤 배치" | p.15 | 매 젠 시작 시 빈 셀 균등 추첨 배치 (BoardLogic 위임) | p.4 "몬스터/캐릭터 랜덤 배치"와 동일 규칙 |
| R8 | "공격 방향 : 플레이어가 직접 지정" | p.15 | `CompanionPanel` UI에서 방향(4방위) 지정 → 서버 저장 | 미지정 시 매 공격 랜덤 — p.11 "이후부터는 랜덤" 준용 |
| R9 | "스킬 순서 : 플레이어가 직접 지정" | p.15 | `CompanionPanel` UI에서 스킬 순서 재배열 → 서버 저장, 순환 실행 | 미지정 시 습득 순서 |
| R10 | "공격 : 자동 진행" | p.15 | 젠 진행 중 공격 틱마다 자동 공격 (jobs-and-combat의 `CombatLogic`에 위임) | 데미지/HP는 CombatLogic 단일 권위 (ARCHITECTURE §1) |
| R11 | (직업 특성) "직업별로 공격 방향/범위/데미지 특성이 다르게 적용" | p.10 | 동료 공격 범위 = 소속 직업군 패턴 그대로 (궁수 직선·마법사 8칸·전사 4칸·도적 원거리 타겟) | 범위 판정은 jobs-and-combat 소유, 동료는 호출만 |
| R12 | (명시 없음) 동료 수 상한 | — | `MAX_COMPANIONS = 2` | [설계 결정 D1] |
| R13 | (명시 없음) 동료 엔티티 표현 | — | 메이플 아바타 (`CostumeManagerComponent` + `AvatarRendererComponent`) | [설계 결정 D2] |

---

## 2. 설계 결정 (기획서 미명시 — 프로토타입 관점 확정)

| ID | 결정 | 근거 |
|---|---|---|
| **D1** | **동료 수 상한 = 2** (스테이지당; `AFTER_JOB_ADV` 1회 + `BEFORE_NAMED_BOSS` 1회가 기본 트리거 구성) | p.15가 두 등장 시점을 "주로 활용"한다고 명시. 7×7 보드(49셀)에서 몬스터 누적 + 본캐 + 동료 2면 충분히 밀도 높음. 상한 초과 트리거는 토스트로 안내 후 소거 |
| **D2** | **동료 표현 = 아바타** (`.model`에 `CostumeManagerComponent`/`AvatarRendererComponent`/`StateComponent`/`AvatarStateAnimationComponent`). Body/Movement 계열 없음 | p.15 "플레이가 가능한 캐릭터 추가 등장" — 캐릭터성 표현 필요. ARCHITECTURE §1이 본캐를 "직업별 메이플 아바타"로 확정(p.10)했으므로 동료도 동일 축. 무기 RUID 장착만으로 직업별 공격 모션 자동 해석(msw-avatar Strategy D). 보드 말이라 이동 없음 → Body 불요(LEA-3004 무관, 몬스터와 동일 논리) |
| **D3** | **직업군 선택지 카드 = 4개 직업군 중 3장 균등 추첨** (본캐 직업군 포함 가능) | p.14 기본 선택지 3장 관례와 UI 일관성. 4장 전부 노출은 ChoicePopup 레이아웃 가정(3장)을 깨므로 회피 |
| **D4** | **직업군별 2차 전직 풀**: 전사=페이지/파이터/스피어맨(p.15 명시), 마법사=불독/썬콜/비숍(p.12 전직 루트 명시 준용), 궁수=헌터/사수, 도적=어쌔신/시프 (클래식 메이플 2차 기준) | p.11 "클래식 메이플스토리의 1차 스킬" 등 기획서 전반이 클래식 기준. 궁수/도적은 미명시라 클래식 2차 라인으로 확정 |
| **D5** | **"본캐 유사" = 합류 시점 본캐의 레벨 기반 기본 스탯을 1.0배 복사하되 장비 효과는 제외. 본캐 레벨업 시 기본 스탯만 재동기화** | "유사하지만 동일하지 않음"을 가장 단순하게 구현 — 별도 배율 상수 튜닝 없이 장비 변수만 제거. p.16 "장비 효율은 스킬보다 훨씬 높게" → 장비 제외만으로 본캐 우위 자연 보장 |
| **D6** | **합류 시 초기 스킬: 해당 2차 직업 계열의 1차 스킬 1종 Lv.1 자동 부여** (예: 페이지 → 파워 스트라이크) | p.11 "모든 직업군은 2개의 선택지(1차 스킬)" — 동료에게 선택 UI를 또 띄우면 합류 흐름이 끊기므로 자동 부여. 2종 중 균등 추첨 |
| **D7** | **동료 스킬 성장 경로: 합류 후 레벨업 선택지의 스킬 풀(90%) 내부에 동료 스킬 강화 카드가 본캐 스킬과 동일 가중치로 편입** (카드에 동료 이름 라벨) | R6 "본캐릭터와 같이 스킬 성장" — 별도 성장 루프를 만들지 않고 기존 선택지 구조(p.14)에 합류시켜 시스템 수 최소화 |
| **D8** | **동료 스킬은 합성(skills-and-fusion) 대상에서 제외** (프로토타입) | 합성 조합식은 본캐 스킬 기준 고정 조합(ARCHITECTURE §2 #3). 동료 스킬 교차 합성은 조합 폭발 — 범위 제한 |
| **D9** | **트리거 기본값**: `AFTER_JOB_ADV`는 1차 전직 직후 1회, `BEFORE_NAMED_BOSS`는 보스 젠 시작 직전 1회. 스테이지 설정으로 덮어쓰기 가능 | R1 "스테이지마다 다르게 설정" — 기본값 + 스테이지 오버라이드 구조 |
| **D10** | **동료는 자동/수동 전투 모드와 무관하게 방향/스킬 순서는 항상 플레이어 지정값(미지정 시 랜덤), 공격 실행은 항상 자동** | p.15가 p.10의 수동/자동 구분과 별도로 동료 규칙을 명시 — 기획서 문면 그대로 |
| **D11** | **스테이지 종료(클리어/실패) 시 동료 전원 소멸, 다음 스테이지에서 초기화** | ARCHITECTURE §0 로그라이크 규칙("스테이지 입장 시 Lv.1 초기화")의 일관 적용 |

---

## 3. 데이터 테이블 (밸런스 수치/확률/상수)

> 상수는 `CompanionConfig.mlua`(@Logic, 읽기 전용 데이터)에 집약. 매직 넘버 금지 (ARCHITECTURE §4-7).

### 3.1 상수

| 상수명 | 값 | 출처 |
|---|---|---|
| `MAX_COMPANIONS` | `2` | [설계 결정 D1] |
| `JOB_GROUP_CARD_COUNT` | `3` | [설계 결정 D3], p.14 선택지 3장 관례 |
| `COMPANION_SKILL_MAX_LEVEL` | `3` | 기획서 스킬 만렙 (ARCHITECTURE §2 #3, p.13) |
| `COMPANION_STAT_RATIO` | `1.0` (장비 효과 제외) | [설계 결정 D5] |
| `INITIAL_SKILL_LEVEL` | `1` | [설계 결정 D6] |
| `DEFAULT_DIRECTION` | `"RANDOM"` (매 공격 4방위 균등) | p.11 "이후부터는 랜덤" 준용 |
| `ATTACK_INTERVAL` | jobs-and-combat의 본캐 공격 주기 상수를 그대로 참조 (자체 정의 금지) | R10, 단일 소스 원칙 |

### 3.2 직업군 → 2차 전직 풀 (`SECOND_JOB_POOL`, 균등 추첨)

| 직업군 키 | 2차 전직 후보 (각 균등 확률) | 출처 |
|---|---|---|
| `WARRIOR` | `PAGE`, `FIGHTER`, `SPEARMAN` — 각 1/3 | **p.15 명시** |
| `MAGICIAN` | `FP_WIZARD`(불독), `IL_WIZARD`(썬콜), `CLERIC`(비숍) — 각 1/3 | p.12 전직 루트 준용 |
| `ARCHER` | `HUNTER`, `CROSSBOWMAN` — 각 1/2 | [설계 결정 D4] |
| `THIEF` | `ASSASSIN`, `BANDIT` — 각 1/2 | [설계 결정 D4] |

### 3.3 직업군별 공격 패턴 (jobs-and-combat 정의 참조 — 동료는 동일 패턴 사용)

| 직업군 | 패턴 | 출처 |
|---|---|---|
| `ARCHER` | 바라보는 방향 직선 | p.10 |
| `MAGICIAN` | 주변 8칸 범위 | p.10 |
| `WARRIOR` | 주변 4칸, 강력한 공격 | p.10 |
| `THIEF` | 긴 사거리 타겟 선택 | p.10 |

### 3.4 초기 스킬 테이블 (`INITIAL_SKILL_POOL` — 2차 직업의 1차 스킬 2종 중 균등 추첨, [설계 결정 D6])

| 2차 직업 | 1차 스킬 후보 (p.12 기준) |
|---|---|
| PAGE / FIGHTER / SPEARMAN | `POWER_STRIKE`(파워 스트라이크), `SLASH_BLAST`(슬래시 블러스트) |
| HUNTER / CROSSBOWMAN | `ARROW_BLOW`(애로우 블로우), `DOUBLE_SHOT`(더블샷) |
| FP_WIZARD / IL_WIZARD / CLERIC | `ENERGY_BOLT`(에너지 볼트), `MAGIC_CLAW`(매직 클로) |
| ASSASSIN / BANDIT | `DOUBLE_STAB`(더블 스텝), `LUCKY_SEVEN`(럭키 세븐) |

> 스킬 ID/효과 수치의 단일 진실은 skills-and-fusion 스펙. 본 테이블은 추첨 풀 매핑만 소유.

### 3.5 스테이지별 트리거 설정 (`STAGE_COMPANION_TRIGGERS` — [설계 결정 D9] 기본값)

| 필드 | 타입 | 의미 |
|---|---|---|
| `stageId` | string | 대상 스테이지 |
| `triggerType` | string | `"AFTER_JOB_ADV"` \| `"BEFORE_NAMED_BOSS"` |
| `noticeText` | string (한국어) | 스테이지 진입 전 안내 문구 (R1) |

기본값 예: `{ stageId = "henesys_03", triggerType = "AFTER_JOB_ADV", noticeText = "이 스테이지에서는 전직 후 동료가 합류합니다." }`, `{ stageId = "henesys_boss", triggerType = "BEFORE_NAMED_BOSS", noticeText = "네임드 보스 전, 동료가 합류합니다." }` — 최종 스테이지 ID는 ui-modes-stages 스펙/MASTER_PLAN 확정값을 따른다.

---

## 4. 파일 매니페스트

> 경로 규칙: ARCHITECTURE §3. 스크립트는 `RootDesk/MyDesk/Zengard/Companion/`, 모델은 `RootDesk/MyDesk/Models/Companions/`, UI는 `ui/`.
> `.model`/`.ui`는 빌더(CJS) 경유 생성만 허용 — 구현 단계에서 `builder-protocol.md` 전문 Read 후 진행.

| 파일 | 종류 | ExecSpace 요지 | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Companion/CompanionLogic.mlua` | `@Logic` | 핵심 상태 `ServerOnly`; 클라 통지 `Client` RPC; 플레이어 설정 수신 `Server` RPC (`senderUserId` 검증) | 동료 로스터(서버 권위), 트리거 평가, 직업군 선택지 요청, 2차 직업 추첨, 스탯 스냅샷, 방향/스킬 순서 저장, 자동 공격 틱 구동, 스폰/소멸 |
| `RootDesk/MyDesk/Zengard/Companion/CompanionConfig.mlua` | `@Logic` | ExecSpace 미지정 getter (양측 로컬 실행) | §3 데이터 테이블 상수 보관. 변경 가능한 상태 없음 |
| `RootDesk/MyDesk/Zengard/Companion/CompanionComponent.mlua` | `@Component` (동료 엔티티 부착) | 셋업 `ServerOnly`; 모션/연출 재생 `Client` | 아바타 코스튬 적용(2차 직업별 무기/복장 RUID), 셀 좌표 반영(`TransformComponent` 직접 쓰기 — Body 없음), 공격 모션(`BodyActionStateChangeEvent` ATTACK) 재생 |
| `RootDesk/MyDesk/Zengard/Companion/CompanionPanelController.mlua` | `@Component` (UI 엔티티 부착) | `ClientOnly` (UI는 클라 전용) | `CompanionPanel.ui` 바인딩(UUID 주입), 방향 4방위 토글/스킬 순서 재배열 입력 → `_CompanionLogic` Server RPC 호출, `@Sync`/이벤트 수신 갱신 |
| `RootDesk/MyDesk/Zengard/Companion/Events/CompanionJoinedEvent.mlua` | `@Event` | — | 합류 확정 브로드캐스트 (아래 §5 시그니처) |
| `RootDesk/MyDesk/Zengard/Companion/Events/CompanionOrderChangedEvent.mlua` | `@Event` | — | 방향/스킬 순서 변경 통지 (HUD 갱신용) |
| `RootDesk/MyDesk/Models/Companions/Companion.model` | `.model` (ModelBuilder 경유) | — | 동료 템플릿: `TransformComponent` + `AvatarRendererComponent` + `CostumeManagerComponent`(`UseCustomEquipOnly=true`) + `StateComponent` + `AvatarStateAnimationComponent` + `script.CompanionComponent`. Body/Movement 없음 ([설계 결정 D2]) |
| `ui/CompanionPanel.ui` | `.ui` (UIBuilder 경유) | — | HUD 우측 동료 패널: 동료 슬롯 2개(초상/직업명), 방향 지정 4버튼, 스킬 순서 리스트 |

> 합류 직업군 선택지 팝업은 **신규 UI를 만들지 않는다** — level-choice-jobadv 시스템의 `ChoicePopupGroup`을 재사용(§5 의존 계약). 스테이지 진입 전 안내 텍스트 표시는 ui-modes-stages의 스테이지 선택 화면이 담당.

---

## 5. API / 이벤트 계약

### 5.1 노출 API (`_CompanionLogic`)

```lua
-- 스테이지 선택 화면에서 안내 문구 조회 (R1). 트리거 없으면 빈 문자열
method string GetStageCompanionNotice(string stageId)            -- ExecSpace 미지정 (양측 로컬)

-- 현재 동료 수 / 로스터 스냅샷 (HUD·디버그용)
method integer GetCompanionCount()                               -- ServerOnly
method table GetCompanionSummaries()                             -- ServerOnly; {companionId, jobGroup, secondJob, skillIds...}

-- 플레이어 설정 (R8, R9) — senderUserId 검증 필수
@ExecSpace("Server") method void RequestSetDirection(string companionId, string direction)
   -- direction: "UP"|"DOWN"|"LEFT"|"RIGHT"|"RANDOM"
@ExecSpace("Server") method void RequestSetSkillOrder(string companionId, table skillIds)

-- 직업군 선택 응답 (ChoicePopup 콜백 경유)
@ExecSpace("Server") method void ResolveJobGroupChoice(string choiceToken, string jobGroup)
```

### 5.2 발신 이벤트

```lua
@Event script CompanionJoinedEvent extends EventType
    property string companionId = ""
    property string jobGroup = ""        -- "WARRIOR" 등
    property string secondJob = ""       -- "PAGE" 등
    property string initialSkillId = ""
end

@Event script CompanionOrderChangedEvent extends EventType
    property string companionId = ""
    property string direction = ""
    property table skillIds = nil        -- 순서 배열
end
```

### 5.3 구독(소비) 이벤트 — 외부 시스템 발신

| 이벤트 | 발신 시스템 | 용도 |
|---|---|---|
| `JobAdvancedEvent { userId, jobTier, jobId }` | level-choice-jobadv | `AFTER_JOB_ADV` 트리거 평가. **ARCHITECTURE §5 잠정 목록에 없음 — MASTER_PLAN에서 추가 확정 필요** |
| `ZenStartedEvent { zenIndex, isBossZen }` | board-and-wave | `BEFORE_NAMED_BOSS` 트리거(보스 젠 시작 시, 보스 스폰 처리보다 먼저 평가) + 매 젠 동료 재배치(R7). `isBossZen` 필드 필요 — 계약 확정 필요 |
| `LevelUpEvent` | level-choice-jobadv | 동료 스킬 카드의 선택지 풀 편입 시점 동기화 ([D7]) |
| `StageEndedEvent { result }` | board-and-wave 또는 ZengardGameLogic | 동료 전원 소멸·상태 초기화 ([D11]) |

### 5.4 의존하는 외부 API 계약

| API | 소유 시스템 | 용도 |
|---|---|---|
| `_BoardLogic:GetRandomEmptyCell()` → `(col,row)\|nil`, `_BoardLogic:CellToWorld(col,row)` → `Vector3`, `_BoardLogic:OccupyCell/ReleaseCell` | board-and-wave | 랜덤 배치(R7), 좌표 변환 단일 소스 (ARCHITECTURE §1) |
| `_CombatLogic:ExecuteAttack(attackerId, attackerStats, jobGroup, originCell, direction, skillId)` | jobs-and-combat | 자동 공격 실행(R10/R11). 범위 판정·데미지·HP 차감은 전부 CombatLogic 권위 |
| `_ChoiceLogic:RequestSpecialChoice(cards, resolveLogicName, choiceToken)` | level-choice-jobadv | 직업군 선택지 팝업(R3). 레벨업 선택지와 큐잉 충돌 방지 포함 |
| `_ChoiceLogic:RegisterSkillCardProvider(...)` (또는 동등 훅) | level-choice-jobadv | 동료 스킬 강화 카드를 90% 스킬 풀에 편입 ([D7]) |
| `_PlayerStatLogic:GetBaseStats(userId)` → `{atk, hp, ...}` (장비 제외) | jobs-and-combat 또는 level-choice-jobadv | 스탯 스냅샷(R5/[D5]) |
| `_SkillLogic:GetSkillLevel/UpgradeSkill(ownerId, skillId)` | skills-and-fusion | 동료 스킬 성장(R6). ownerId에 companionId 허용 필요 |

> 위 시그니처는 본 스펙의 제안값 — 최종 명은 MASTER_PLAN.md가 단일 진실 (ARCHITECTURE §5).

---

## 6. 핵심 알고리즘 의사코드

### 6.1 트리거 평가 (ServerOnly)

```
on JobAdvancedEvent(e):
    trig = STAGE_COMPANION_TRIGGERS[currentStageId]
    if trig == nil or trig.triggerType != "AFTER_JOB_ADV" or trig.consumed: return
    fireCompanionTrigger(trig)

on ZenStartedEvent(e):
    trig = STAGE_COMPANION_TRIGGERS[currentStageId]
    if trig != nil and trig.triggerType == "BEFORE_NAMED_BOSS"
       and e.isBossZen and not trig.consumed:
        fireCompanionTrigger(trig)          -- 보스 스폰 처리보다 먼저 (구독 순서 계약)
    placeAllCompanions()                    -- 매 젠 재배치 (R7)

fireCompanionTrigger(trig):
    trig.consumed = true
    if companionCount >= MAX_COMPANIONS:
        notifyToast("동료 슬롯이 가득 찼습니다"); log(...); return
    cards = drawJobGroupCards()
    _ChoiceLogic:RequestSpecialChoice(cards, "CompanionLogic", newToken())
```

### 6.2 직업군 카드 추첨 ([D3]) 및 2차 직업 추첨 (R4)

```
drawJobGroupCards():
    pool = {WARRIOR, ARCHER, MAGICIAN, THIEF}
    shuffle(pool)                            -- Fisher-Yates, _UtilLogic:RandomIntegerRange
    return pool[1..JOB_GROUP_CARD_COUNT]     -- 3장

ResolveJobGroupChoice(token, jobGroup):     -- @ExecSpace("Server")
    validate(token)
    secondJobs = SECOND_JOB_POOL[jobGroup]
    secondJob = secondJobs[_UtilLogic:RandomIntegerRange(1, #secondJobs)]   -- 균등 (전사 1/3, p.15)
    skillPool = INITIAL_SKILL_POOL[secondJob]
    initialSkill = skillPool[_UtilLogic:RandomIntegerRange(1, #skillPool)]  -- [D6]
    spawnCompanion(jobGroup, secondJob, initialSkill)
```

### 6.3 동료 스폰 + 스탯 스냅샷 (R5/[D5])

```
spawnCompanion(jobGroup, secondJob, initialSkill):
    stats = _PlayerStatLogic:GetBaseStats(ownerUserId)      -- 장비 제외
    cell = _BoardLogic:GetRandomEmptyCell()
    if cell == nil: pendingPlacement = true                  -- §7 E1, 다음 젠 재시도
    map = boardMapEntity                                     -- parent 절대 nil 금지
    ent = _SpawnService:SpawnByModelId(COMPANION_MODEL_ID, "Companion_"..id, CellToWorld(cell), map)
    ent.CompanionComponent: applyCostume(secondJob)          -- 무기 RUID → 공격 모션 자동 해석
    roster[id] = { stats=stats, jobGroup=jobGroup, secondJob=secondJob,
                   skills={initialSkill: Lv.1}, direction="RANDOM", skillOrder={initialSkill},
                   skillCursor=1, cell=cell }
    SendEvent(CompanionJoinedEvent{...}); log("companion joined: "..secondJob)

on LevelUpEvent:                                             -- 본캐 레벨업
    for c in roster: c.stats = _PlayerStatLogic:GetBaseStats(ownerUserId)   -- 재동기화 [D5]
```

### 6.4 자동 공격 루프 (R8~R11, ServerOnly)

```
every ATTACK_INTERVAL (젠 진행 중에만, OnUpdate delta 누적 — ElapsedSeconds 앵커 금지):
    for c in roster:
        if not c.placed: continue
        skillId = c.skillOrder[c.skillCursor]                -- 플레이어 지정 순서 순환 (R9)
        c.skillCursor = c.skillCursor % #c.skillOrder + 1
        dir = (c.direction == "RANDOM") ? randomDirection() : c.direction   -- R8
        _CombatLogic:ExecuteAttack(c.id, c.stats, c.jobGroup, c.cell, dir, skillId)
        notifyClientPlayAttackMotion(c.id)                   -- Client RPC → BodyActionStateChangeEvent
```

### 6.5 매 젠 재배치 (R7)

```
placeAllCompanions():
    for c in roster:
        _BoardLogic:ReleaseCell(c.cell)
        cell = _BoardLogic:GetRandomEmptyCell()
        if cell == nil: c.placed = false; continue           -- §7 E1
        c.cell = cell; c.placed = true
        c.entity.TransformComponent.WorldPosition = CellToWorld(cell)   -- Body 없음 → 직접 쓰기 허용
```

---

## 7. 엣지 케이스

| ID | 상황 | 처리 |
|---|---|---|
| E1 | **보드 가득 참** — 합류/재배치 시 빈 셀 없음 | 해당 젠은 배치 보류(`placed=false`, 공격 불참). 다음 `ZenStartedEvent`에서 재시도. `log_warning` 기록. 합류 자체는 성립(로스터 유지) |
| E2 | **동시 처치** — 동료와 본캐(또는 동료끼리) 같은 몬스터를 같은 틱에 공격 | HP는 `_CombatLogic` 서버 단일 권위가 순차 처리 — 먼저 처리된 공격이 킬. 경험치 귀속은 공격자와 무관하게 본캐 단일 (동료 별도 경험치 없음, 스킬 성장은 [D7] 경로만) |
| E3 | **상한 도달 후 트리거 발화** | 선택지 팝업 생략, 트리거 소거 + 토스트 안내 (§6.1) |
| E4 | **선택지 팝업 충돌** — 레벨업 선택지와 합류 선택지 동시 요청 | `_ChoiceLogic` 큐잉에 위임 (의존 계약 §5.4). 동료 합류 선택지는 큐 후순위 허용 |
| E5 | **합류 선택 중 스테이지 종료** | `StageEndedEvent` 수신 시 미해결 choiceToken 무효화, 로스터 전체 소멸 ([D11]) |
| E6 | **스킬 순서 일부만 지정 / 빈 순서** | 미지정분은 습득 순서로 뒤에 이어붙임. 빈 배열 수신 시 무시(기존 값 유지) |
| E7 | **클라이언트 위조 요청** — 타 유저/존재하지 않는 companionId로 `RequestSet*` 호출 | `senderUserId` ↔ 동료 소유자 검증, 불일치 시 무시 + `log_warning` |
| E8 | **동료 스킬 카드 선택 시점에 동료가 이미 소멸** (스테이지 종료 직전 경합) | 카드 resolve 시 roster 존재 검증, 부재 시 카드 효과 무효 처리(선택 소모는 ChoiceLogic 정책 따름) |
| E9 | **합성 재료 소실 우려** — 동료 스킬이 합성 풀에 섞여 본캐 합성 조합식이 오염 | 원천 차단: 동료 스킬은 합성 대상 제외 ([D8]). `_SkillLogic` 호출 시 ownerId로 구분 |
| E10 | **아바타 RUID 검색 실패** (2차 직업 코스튬/무기) | 폴백: 기본 아바타(코스튬 미적용) + 직업명 텍스트 라벨. 스펙/구현 노트에 "RUID 필요" 마킹 (ARCHITECTURE §4-5) |
| E11 | **전직 트리거 스테이지에서 플레이어가 전직 재료 부족으로 전직 지연** (p.14) | 트리거는 `JobAdvancedEvent` 수신 시에만 발화 — 전직이 끝내 없으면 해당 스테이지에서 동료 미등장 (기획 의도와 합치: "전직 이후" 등장) |
| E12 | **보스 젠과 전직이 같은 젠에 발생** | 트리거 타입별 독립 평가 — 스테이지당 트리거 1종 구성([D9])이라 충돌 없음. 다중 트리거 스테이지 확장 시 큐 순서: AFTER_JOB_ADV 우선 |

---

## 8. 필요 리소스 (msw-search 검색 키워드)

| 용도 | 종류 | 검색 키워드 |
|---|---|---|
| 동료 2차 직업 무기 (공격 모션 자동 해석용, [D2]) | 아바타 아이템 | "한손검", "두손검", "창", "폴암", "활", "석궁", "완드", "스태프", "단검", "아대" |
| 동료 직업별 복장 (구분용 상의/하의 또는 한벌옷) | 아바타 아이템 | "전사 갑옷", "마법사 로브", "궁수", "도적", "longcoat" |
| 합류 연출 이펙트 | 스프라이트/애니메이션클립 | "포털", "반짝임", "등장 이펙트", "소환", "버프 이펙트" |
| 합류 사운드 | 사운드 | "환영", "등장", "팡파레", "포털 사운드", "levelup" |
| 동료 패널 UI 아이콘 (방향 화살표/슬롯 프레임) | 스프라이트 | "화살표", "방향", "슬롯", "프레임", "초상화 테두리" |
| 직업군 선택 카드 일러스트(직업 상징) | 스프라이트 | "검 아이콘", "활 아이콘", "지팡이 아이콘", "단검 아이콘" |

> RUID는 구현 단계에서 msw-search 절차로 확정. 검색 실패 시 E10 폴백 + "RUID 필요" 마킹.

---

## 9. 리스크

1. `JobAdvancedEvent` / `ZenStartedEvent.isBossZen` / `_ChoiceLogic` 특수 선택지 API가 ARCHITECTURE §5 잠정 목록에 없거나 필드가 미확정 — MASTER_PLAN 확정 전 구현 착수 금지.
2. 아바타 좌우 반전: `SpriteRendererComponent.FlipX`는 아바타 엔티티에서 무음 무시(msw-avatar). 동료 모델에는 `MovementComponent`도 없으므로 시각적 방향 표현은 구현 단계에서 `Transform Scale.x` 부호 반전 검증 필요 — 실패 시 방향 화살표 오버레이로 대체.
3. 동료 수 × 공격 틱 × `_CombatLogic` 호출이 본캐 공격과 같은 프레임에 몰릴 수 있음 — 공격 처리 순서(본캐 → 동료 id 순)를 CombatLogic 계약에 명시해 E2 결정성 확보.
4. `BEFORE_NAMED_BOSS` 트리거가 보스 스폰보다 먼저 평가되려면 이벤트 구독 순서 보장이 필요 — 보장이 어려우면 board-and-wave가 보스 스폰 전 별도 훅(`BossPhaseImminentEvent`) 발신으로 전환.
