# jobs-and-combat — 직업 & 전투 시스템 상세 스펙

> 시스템 #2 (ARCHITECTURE.md §2). 기획서 단일 진실: p.10, p.11 (+ 플로우 근거 p.6, p.9).
> 본 스펙은 구현 직전 단계 문서다. 이 단계에서는 구현 파일을 만들지 않는다.
> 이벤트/Logic/모델 id의 최종 명세는 MASTER_PLAN.md가 우선한다 (ARCHITECTURE.md §5).

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (페이지) | 구현 항목 | 비고 |
|---|---|---|---|
| R1 | 게임 시작 시 직업 1종 선택 — 무료, 자유 선택 (p.10) | `JobLogic` + `JobSelectPopup.ui` — 4종 카드 중 1택, 재화 소모 없음 | 스테이지 입장 직후 1회 |
| R2 | 직업 4종: 전사/궁수/마법사/도적 (p.10) | `CombatConfig.JOB_TABLE` 4행 (`warrior` / `archer` / `mage` / `rogue`) | |
| R3 | 직업별 공격 방향/범위/데미지 특성 상이 (p.10) | `AttackPatternLogic` — 패턴 타입 4종 (`line` / `around4` / `around8` / `target`) + 직업별 baseDamage | |
| R4 | 궁수: 바라보는 방향으로 직선 공격 (p.10) | `pattern = "line"` — 시전 셀에서 방향으로 보드 끝까지 직선상 전 몬스터 타격 | 관통 여부는 [설계 결정 D-3] |
| R5 | 마법사: 캐릭터 주변 8칸 범위 공격 (p.10) | `pattern = "around8"` — Chebyshev 거리 1의 8개 셀 | |
| R6 | 전사: 캐릭터 주변 4칸, 강력한 공격 (p.10) | `pattern = "around4"` — 상하좌우 4셀, baseDamage 최대급 | |
| R7 | 도적: 비교적 긴 사거리로 타겟 선택 공격 (p.10) | `pattern = "target"` — 사거리 내 단일 타겟 | 사거리 수치 [설계 결정 D-4] |
| R8 | 수동 전투: 공격 방향 & 스킬 순서 플레이어 설정 (p.9, p.10) | `CombatControlHUD.ui` — 방향 4버튼 + 스킬 순서 지정, `CombatLogic`이 per-user 설정 보관 | |
| R9 | 자동 전투: 방향 및 스킬 순서 모두 랜덤 (p.10) | 시전마다 방향 랜덤 추첨 + 시퀀스 시작 시 스킬 순서 셔플 | |
| R10 | '젠' 클릭 → 랜덤 배치 후 자동 공격 실행 (p.9) | `ZenStartedEvent` 수신 → `ExecuteZenCombat()` — 보유 스킬을 순서대로 1회씩 자동 시전 | 배치는 board-and-wave 소관 |
| R11 | 최초 스킬 선택 이후 공격 방향은 플레이어가 직접 설정 가능, "이후부터는 랜덤" (p.11) | 수동 모드 = 방향 직접 설정 / 자동 모드 = 랜덤 — 모드 토글로 통합 해석 | 해석 근거 [설계 결정 D-1] |
| R12 | 직업별 1차 스킬 2개 중 1택, 스킬마다 효과 상이 (p.9, p.11) | 스킬 카탈로그/효과는 **skills-and-fusion(#3) 소유**. 본 시스템은 `SkillSpec` 계약으로 시전만 담당 | 경계 정의 §6.3 |
| R13 | 몬스터 처치 시 경험치 (p.9) | `MonsterKilledEvent` 발신 계약 준수 (소비자: level-choice-jobadv #4) | HP/처치 판정 주체는 §6.2 |
| R14 | 배치 & 공격 방향이 핵심 재미 (p.6) | 수동 모드에서 방향 인디케이터(보드 위 화살표) 표시 — 선택의 가시화 | [설계 결정 D-7] |
| R15 | 공격 연출 — 스킬 이펙트, 피격, (처치 시 디졸브는 #7 소관) (p.11 스킬 사용 예시) | `CombatFxLogic` — 시전 FX + 피격 FX + 아바타 ATTACK 모션. 디졸브는 monsters-boss(#7)에 요구사항만 전달 (§8) | |
| R16 | 전직 재료(기타템) 활용 (p.10) | **범위 외** — level-choice-jobadv(#4) 소유. 본 시스템은 jobId 조회 API만 노출 | |

---

## 2. 데이터 테이블

### 2.1 직업 테이블 (`CombatConfig.JOB_TABLE`)

기획서는 패턴(방향/범위/강약 서술)만 명시하고 수치는 미명시 → 데미지/사거리는 전부 [설계 결정]. 기준: 주황버섯 HP 10 / 스톤골렘 HP 15 / 보스 HP 100 (기획서 p.19, ARCHITECTURE §2 #7) 대비 2~4젠 내 일반몹 처치 가능하도록 설정.

| jobId | 이름(노출) | pattern | baseDamage | range | 비고 |
|---|---|---|---|---|---|
| `warrior` | 전사 | `around4` | **4** | 1 (고정) | 강공 컨셉 → 단일 타수 최대 [설계 결정 D-2] |
| `archer` | 궁수 | `line` | **3** | 보드 끝까지 | 직선상 전 몬스터 타격(관통) [설계 결정 D-3] |
| `mage` | 마법사 | `around8` | **2** | 1 (고정) | 최대 8타겟 광역 → 단일 데미지 최저 [설계 결정 D-2] |
| `rogue` | 도적 | `target` | **5** | **4** (Chebyshev) | 단일 타겟 최고 데미지 [설계 결정 D-2, D-4] |

### 2.2 전투 상수 (`CombatConfig`)

| 상수 (영문 식별자) | 값 | 출처 |
|---|---|---|
| `JOB_COUNT` | 4 | p.10 |
| `JOB_SELECT_COST` | 0 (무료) | p.10 |
| `FIRST_SKILL_CHOICE_COUNT` | 2 (직업별 2개 중 1택) | p.9, p.11 |
| `DIRECTIONS` | `"UP" / "DOWN" / "LEFT" / "RIGHT"` 4방 | p.10 그리드 예시 — 그리드 보드이므로 4방으로 확정 [설계 결정 D-5] |
| `CAST_INTERVAL` | 0.6 s (시전 간 간격) | [설계 결정 D-6] — 연출 가독성 |
| `SEQUENCE_START_DELAY` | 0.3 s (배치 완료 → 첫 시전) | [설계 결정 D-6] |
| `HIT_FX_DURATION` | 0.4 s | [설계 결정 D-6] |
| `DEFAULT_COMBAT_MODE` | `"MANUAL"` (수동) | [설계 결정 D-8] — p.6 "배치&공격방향" 이 핵심 재미이므로 수동 기본 |
| `DEFAULT_DIRECTION` | `"RIGHT"` (수동인데 미설정 시) | [설계 결정 D-9] |
| `ROGUE_RANGE` | 4 | [설계 결정 D-4] — 7×7 보드에서 "비교적 긴 사거리" = 보드 절반 이상 커버 |

### 2.3 참조 수치 (타 시스템 소유 — 본 시스템은 읽기만)

| 수치 | 값 | 소유 시스템 |
|---|---|---|
| 몬스터 HP | 주황버섯 10 / 스톤골렘 15 / 머쉬맘 100 | monsters-boss (#7), 기획서 p.19 |
| 레벨업 선택지 확률 | 스킬 90% / 장비 10% | level-choice-jobadv (#4), p.9 |
| 보스 등장 조건 | 20젠 또는 특수 조건 | board-and-wave (#1), p.9 |
| 그리드 | 7×7, 셀 0.8 world unit, 보드 중심 (0, 0.3) | board-and-wave (#1), ARCHITECTURE §1 |

### 2.4 설계 결정 목록 (기획서 미명시 → 프로토타입 관점 확정)

| ID | 결정 | 근거 |
|---|---|---|
| D-1 | p.11 "최초 스킬 선택 이후 공격 방향 직접 설정 가능 (이후부터는 랜덤)" → **수동/자동 모드 토글**로 통합. 수동 = 매 젠 방향 설정 유지, 자동 = 매 시전 랜덤 | p.10의 "수동/자동 전투" 서술과 모순 없이 합치는 유일한 해석. 모드는 젠 진행 중에도 토글 가능 |
| D-2 | 직업 baseDamage 4/3/2/5 | 타겟 수 기대값 역비례 — 광역일수록 단일 데미지 낮게. 주황버섯(HP10) 기준 전사 3회·도적 2회 처치 |
| D-3 | 궁수 직선 공격은 **관통** (경로상 전 몬스터 타격) | 비관통이면 around4 하위호환이 되어 직업 차별화 실패. 기획서 p.11 더블샷 그림도 직선 다수 타격 묘사 |
| D-4 | 도적 사거리 = Chebyshev 4 | "비교적 긴 사거리" — 7×7 중앙 기준 보드 전체의 약 80% 커버, 전맵 타격은 방지 |
| D-5 | 방향은 4방 (대각선 없음) | 그리드 보드 + 기획서 p.10 예시 그림이 직교 패턴. 8방은 프로토타입 범위 외 |
| D-6 | 연출 타이밍 상수 (0.6/0.3/0.4s) | 한 젠의 전투 시퀀스가 스킬 5개 기준 약 3초 — 템포 유지 |
| D-7 | 수동 모드에서 캐릭터 셀 위에 방향 화살표 스프라이트 표시 | p.6 "배치&공격방향" 가시화. `DirectionIndicator.model` 1개 |
| D-8 | 기본 전투 모드 = 수동 | 핵심 재미가 선택(p.6)이므로 첫 경험은 수동. 자동은 opt-in |
| D-9 | 수동 모드 방향 미설정 시 `RIGHT` 기본값, 이후 직전 값 유지 | 입력 강제로 인한 젠 블로킹 방지 |
| D-10 | 자동 모드의 스킬 순서 랜덤 = **시퀀스 시작 시 1회 셔플** (시전마다 재추첨 아님) | "순서가 랜덤" 의미에 부합 + 결정적 시퀀스로 디버깅 용이 |
| D-11 | 도적 수동 타겟: HUD에서 사거리 내 몬스터 탭 선택. 미선택/사거리 이탈 시 **사거리 내 최근접 몬스터** 폴백 | 젠마다 타겟 강제 선택은 템포 저해 |
| D-12 | 패턴 내 몬스터 0마리(빗나감) → 시전 FX는 재생, 데미지 0, 시퀀스는 계속 | "처치 여부와 관계없이 다음 젠 진행"(p.9) 톤과 일치 |
| D-13 | 플레이어 피격/HP 감소는 본 시스템 범위 외 | 기획서상 실패 조건은 몬스터 수 임계치/보스 미처치(p.9) — 몬스터의 반격 규칙 부재. HUD 체력Bar(p.23)는 ui-modes-stages(#8)와 monsters-boss(#7) 협의 사항 |

---

## 3. 파일 매니페스트

ARCHITECTURE §3 경로 규칙 준수. 모두 **스펙 승인 후** 생성 (이 단계에서는 생성 금지).

### 3.1 `.mlua` (RootDesk/MyDesk/Zengard/)

| 파일 | 종류 | ExecSpace 전략 | 책임 |
|---|---|---|---|
| `Zengard/Combat/CombatConfig.mlua` | `@Logic` | 전부 ExecSpace 미지정 (양측 로컬 조회) | §2 데이터 테이블 상수의 단일 소스. getter만 제공, 상태 없음 |
| `Zengard/Combat/AttackPatternLogic.mlua` | `@Logic` | 전부 미지정 (순수 함수 — 서버 판정 + 클라 미리보기 양쪽에서 호출) | 패턴 → 셀 목록 계산 (§5.1), 라인 클리핑, 사거리 판정. 보드 조회는 `_BoardLogic` 위임 |
| `Zengard/Combat/CombatLogic.mlua` | `@Logic` | 핵심 판정 `ServerOnly` / 클라 요청 수신 `Server` / 상태 노출 `@Sync` | **서버 권위 전투 코어.** per-user 전투 설정(모드/방향/타겟/스킬순서) 보관, 젠 단위 공격 시퀀스 실행(§5.3), 데미지 적용 위임, 이벤트 발신 |
| `Zengard/Combat/CombatFxLogic.mlua` | `@Logic` | FX 재생 메서드 `Multicast` (서버→전 클라), 내부 재생 헬퍼 `ClientOnly` | 시전/피격 이펙트(`_EffectService`/`_ParticleService`), SFX, 아바타 ATTACK 모션 트리거. FX 키 → RUID 매핑 테이블 보유 |
| `Zengard/Jobs/JobLogic.mlua` | `@Logic` | 선택 처리 `Server`(+`senderUserId` 검증) / 상태 `ServerOnly` + `@Sync` | per-user jobId 보관, 직업 선택 검증(중복 선택 방지, 무료), `JobSelectedEvent` 발신, `GetJob(userId)` 노출 |
| `Zengard/Combat/Events/AttackSequenceStartedEvent.mlua` | `@Event` | — | `property string userId`, `property integer zenIndex` |
| `Zengard/Combat/Events/AttackSequenceEndedEvent.mlua` | `@Event` | — | `property string userId`, `property integer zenIndex`, `property integer totalKills` — board-and-wave가 다음 젠 허용/실패 판정 타이밍에 사용 |
| `Zengard/Combat/Events/AttackResolvedEvent.mlua` | `@Event` | — | 시전 1회 결과: `property string skillId`, `property string direction`, `property integer damagedCount`, `property integer killCount` |
| `Zengard/Jobs/Events/JobSelectedEvent.mlua` | `@Event` | — | `property string userId`, `property string jobId` |
| `Zengard/UI/JobSelectPopupController.mlua` | `@Component` (JobSelectPopup.ui 루트에 부착) | UI 핸들러 `ClientOnly`, 서버 요청은 `_JobLogic:RequestSelectJob` 호출 | 직업 4종 카드 표시/선택 → 서버 요청 → 결과 수신 시 팝업 닫기 |
| `Zengard/UI/CombatControlHUDController.mlua` | `@Component` (CombatControlHUD.ui 루트에 부착) | UI 핸들러 `ClientOnly` | 수동/자동 토글, 방향 4버튼, 스킬 순서 리스트(탭 순서 지정), 도적 타겟 선택 진입. 변경 시 `_CombatLogic:RequestSetCombatConfig` 호출 |

> 이벤트 파일은 1파일 1이벤트 (msw-scripting §3.4 / §8). UI 컨트롤러를 @Component로 두는 이유: UI는 클라이언트 전용이며 `@Logic`에 UI 바인딩을 두면 서버 인스턴스에서 silent no-op (msw-scripting §1.6).

### 3.2 `.model` (RootDesk/MyDesk/Models/ — ModelBuilder 경유)

| 파일 | 구성 | 책임 |
|---|---|---|
| `Models/MapObjects/DirectionIndicator.model` | Transform + SpriteRenderer (Body 없음 — 정적, ARCHITECTURE §1) | 수동 모드에서 캐릭터 셀 위 방향 화살표 표시. 회전은 `TransformComponent` Z 회전으로 4방 표현 |

> 공격 이펙트는 별도 `.model` 없이 `_EffectService:PlayEffect(RUID)` / `_ParticleService` 직접 재생 (msw-combat-system §4). 몬스터 `.model`은 monsters-boss(#7) 소유.

### 3.3 `.ui` (ui/ — UIBuilder 경유)

| 파일 | 구성 요소 | 책임 |
|---|---|---|
| `ui/JobSelectPopup.ui` | 모달 패널 + 직업 카드 4 (아이콘 SpriteGUI + 직업명/특성 Text + 선택 Button) | 스테이지 입장 시 1회 노출. 직업 특성 한 줄 설명 (예: "주변 4칸 강력한 공격") |
| `ui/CombatControlHUD.ui` | 수동/자동 토글 버튼, 방향 4버튼(상/하/좌/우), 스킬 순서 슬롯 리스트, (도적 한정) 타겟 선택 버튼 | 게임 HUD의 전투 제어 영역. 전체 HUD 레이아웃(젠 버튼 등)은 ui-modes-stages(#8) 소유 — 본 파일은 전투 제어 위젯만 |

---

## 4. API / 이벤트 계약

### 4.1 노출 API (다른 시스템이 호출)

```
-- JobLogic
@ExecSpace("Server")     method void   RequestSelectJob(string jobId)            -- senderUserId 검증, 무료, 1회만
                         method string GetJob(string userId)                     -- jobId 또는 "" (미선택)

-- CombatLogic
@ExecSpace("ServerOnly") method void ExecuteZenCombat(integer zenIndex)          -- board-and-wave가 배치 완료 후 호출 (또는 ZenStartedEvent 구독 — MASTER_PLAN에서 택1)
@ExecSpace("ServerOnly") method void RegisterCombatUnit(Entity unitEntity, string ownerUserId)
                                                                                 -- companion(#5)이 동료를 공격 시퀀스에 편입할 때 호출
@ExecSpace("ServerOnly") method void UnregisterCombatUnit(Entity unitEntity)
@ExecSpace("Server")     method void RequestSetCombatConfig(string mode, string direction, table skillOrder, string targetMonsterId)
                                                                                 -- HUD가 호출. mode="MANUAL"|"AUTO". 방향/순서는 서버 보관 (서버 권위)

-- AttackPatternLogic (순수 함수 — 클라 미리보기 + 서버 판정 공용)
method table ResolvePatternCells(string pattern, integer col, integer row, string direction)
                                                                                 -- {{col,row}, ...} 반환. 보드 경계 클리핑 포함
method boolean IsInRange(integer fromCol, integer fromRow, integer toCol, integer toRow, integer range)
```

> 방향/모드/패턴은 전부 `string` 키 — 엔진 enum과 커스텀 enum은 RPC 경계를 넘지 못함 (msw-scripting §6 Cross-boundary types).

### 4.2 발신 이벤트 (구독자)

| 이벤트 | 발신 시점 | 주요 구독자 |
|---|---|---|
| `JobSelectedEvent` | 직업 선택 확정 직후 (서버) | skills-and-fusion #3 (1차 스킬 2택 팝업 트리거), ui-modes-stages #8 |
| `AttackSequenceStartedEvent` | 젠 전투 시퀀스 시작 | ui-modes-stages #8 (입력 잠금 등) |
| `AttackResolvedEvent` | 시전 1회 판정 완료마다 | (선택) 통계/연출 |
| `AttackSequenceEndedEvent` | 시퀀스 종료 (마지막 시전 + FX 종료 후) | board-and-wave #1 (실패 판정/다음 젠 허용), level-choice-jobadv #4 (레벨업 선택지 팝업은 이 이벤트 이후 처리 — §7 E-7) |

### 4.3 의존하는 외부 계약 (타 시스템이 제공해야 함)

| 제공자 | 계약 | 용도 |
|---|---|---|
| board-and-wave #1 | `ZenStartedEvent` — **배치(랜덤 재배치 포함) 완료 후** 발화 보장. payload에 `zenIndex` | 시퀀스 트리거 |
| board-and-wave #1 (`_BoardLogic`) | `GetMonsterAt(col,row) → Entity|nil` / `GetUnitCell(Entity) → col,row` / `IsInsideBoard(col,row) → boolean` / `CellToWorld(col,row) → Vector2` / `GetAllMonsterEntities() → table` | 범위 판정·타겟 탐색·FX 좌표. 셀↔월드 변환은 BoardLogic 단일 소스 (ARCHITECTURE §1) |
| monsters-boss #7 | 몬스터 `@Component` `script.MonsterUnit`: `ApplyDamage(integer damage, Entity attacker)` — HP 차감·처치 판정·`MonsterKilledEvent`(중복 발신 금지)·디졸브 연출의 단일 책임. `IsDead() → boolean` 조회 제공 | 커스텀 데미지 파이프라인 (ARCHITECTURE §1 — 엔진 HitComponent 미사용) |
| monsters-boss #7 | 멀티셀 점유 몬스터(보스)는 점유 셀 전부에서 `GetMonsterAt`이 동일 Entity 반환 | 보스 범위 판정 |
| skills-and-fusion #3 (`_SkillLogic`) | `GetOwnedSkillsOrdered(userId) → table<SkillSpec>` — `SkillSpec = { skillId, patternOverride|nil, damageMultiplier, hitCount, fxKey }`. 직업 baseDamage × multiplier × hitCount 구조 | 시퀀스의 시전 목록. 본 시스템은 스킬 내용을 모름 (불투명 계약) |
| companion #5 | 동료의 방향/스킬순서 설정은 동일 `RequestSetCombatConfig` 경로 재사용 (unitEntity 단위 키) | 시퀀스 편입 |
| level-choice-jobadv #4 | `MonsterKilledEvent` 구독으로 경험치 처리 (본 시스템은 발신하지 않음 — #7이 발신) | 책임 경계 명시 |

---

## 5. 핵심 알고리즘 의사코드

### 5.1 범위 판정 — `ResolvePatternCells`

```
function ResolvePatternCells(pattern, col, row, direction):
    cells = {}
    if pattern == "around4":
        for d in [(0,1),(0,-1),(1,0),(-1,0)]:
            push_if_inside(cells, col+d.x, row+d.y)
    elif pattern == "around8":
        for dx in -1..1: for dy in -1..1:
            if not (dx==0 and dy==0): push_if_inside(cells, col+dx, row+dy)
    elif pattern == "line":
        (dx,dy) = dirToDelta(direction)        -- UP=(0,1) DOWN=(0,-1) LEFT=(-1,0) RIGHT=(1,0)
        c,r = col+dx, row+dy
        while _BoardLogic:IsInsideBoard(c,r):  -- 보드 경계 클리핑 (E-5)
            push(cells, c, r); c+=dx; r+=dy
    elif pattern == "target":
        return {}                              -- target은 셀이 아닌 Entity 단위 (5.2)
    return cells
```

### 5.2 도적 타겟 선택

```
function ResolveRogueTarget(unitCell, config):
    -- 1) 수동 + 유효 타겟: 지정 타겟이 살아있고 사거리 내면 채택
    if config.mode == "MANUAL" and isvalid(config.target)
       and not config.target.MonsterUnit:IsDead()
       and IsInRange(unitCell, cellOf(config.target), ROGUE_RANGE):
        return config.target
    -- 2) 폴백/자동: 사거리 내 후보 수집
    candidates = [m for m in _BoardLogic:GetAllMonsterEntities()
                  if isvalid(m) and not m.MonsterUnit:IsDead()
                  and IsInRange(unitCell, cellOf(m), ROGUE_RANGE)]
    if #candidates == 0: return nil            -- E-4: 시전 스킵
    if config.mode == "MANUAL": return nearest(candidates, unitCell)   -- D-11
    return candidates[_UtilLogic:RandomIntegerRange(1, #candidates)]   -- 자동: 랜덤
```

### 5.3 젠 단위 자동 공격 시퀀스 (ServerOnly)

```
function ExecuteZenCombat(zenIndex):
    SendEvent(AttackSequenceStartedEvent{zenIndex})
    units = snapshot(registeredUnits)                      -- 본캐 + 동료 (E-8 스냅샷)
    for unit in units:
        skills = snapshot(_SkillLogic:GetOwnedSkillsOrdered(unit.owner))  -- E-9 스냅샷
        config = combatConfigOf(unit)
        if config.mode == "AUTO": shuffle(skills)          -- D-10: 시퀀스당 1회 셔플
        for skill in skills:
            wait(CAST_INTERVAL)                            -- 연출 템포 (D-6)
            direction = (config.mode == "MANUAL") and config.direction
                        or DIRECTIONS[_UtilLogic:RandomIntegerRange(1,4)]  -- R9
            CastSkill(unit, skill, direction)
    wait(HIT_FX_DURATION)
    SendEvent(AttackSequenceEndedEvent{zenIndex, totalKills})

function CastSkill(unit, skill, direction):
    job     = CombatConfig:GetJob(_JobLogic:GetJob(unit.owner))
    pattern = skill.patternOverride or job.pattern
    col,row = _BoardLogic:GetUnitCell(unit.entity)
    targets = {}
    if pattern == "target":
        t = ResolveRogueTarget((col,row), configOf(unit))
        if t == nil: return                                -- E-4: 빗나감 FX 없이 스킵
        targets = {t}
    else:
        seen = {}                                          -- E-6: 보스 멀티셀 중복 제거
        for cell in ResolvePatternCells(pattern, col, row, direction):
            m = _BoardLogic:GetMonsterAt(cell.col, cell.row)
            if m ~= nil and not seen[m]: seen[m] = true; push(targets, m)
    _CombatFxLogic:PlayCastFx(unit.entity, skill.fxKey, direction)        -- Multicast
    damage = job.baseDamage * skill.damageMultiplier
    kills = 0
    for m in targets:
        if isvalid(m) and not m.MonsterUnit:IsDead():      -- E-2/E-3: 시전 간 사망 재검증
            for i in 1..skill.hitCount:
                m.MonsterUnit:ApplyDamage(damage, unit.entity)
            _CombatFxLogic:PlayHitFx(m, skill.fxKey)
            if m.MonsterUnit:IsDead(): kills += 1
    SendEvent(AttackResolvedEvent{skill.skillId, direction, #targets, kills})
```

> `wait()`는 mlua 내장 (msw-scripting §4). 시간 기준이 필요한 곳은 `_UtilLogic.ElapsedSeconds`만 사용, `os.clock` 금지 (msw-combat-system §9-5). 랜덤은 `_UtilLogic:RandomIntegerRange` (서버에서만 추첨 — 서버 권위).

### 5.4 자동 모드 방향 추첨

```
DIRECTIONS = {"UP","DOWN","LEFT","RIGHT"}
direction = DIRECTIONS[_UtilLogic:RandomIntegerRange(1, 4)]   -- 시전마다 (R9)
```

---

## 6. 책임 경계 (재확인)

- **6.1** 셀 배치/재배치/젠 카운트/실패 판정 = board-and-wave. 본 시스템은 배치 결과를 읽기만 한다.
- **6.2** 몬스터 HP 차감의 최종 적용·처치 확정·`MonsterKilledEvent` 발신·디졸브 = monsters-boss. 본 시스템은 `ApplyDamage` 호출자.
- **6.3** 스킬 카탈로그(더블샷/애로우블로우 등)·스킬 레벨·합성 = skills-and-fusion. 본 시스템은 `SkillSpec`을 받아 시전하는 실행 엔진.
- **6.4** 경험치/레벨업/선택지/전직 = level-choice-jobadv. 본 시스템의 jobId는 `GetJob`으로 조회 가능해야 하며 전직 시 `JobLogic`의 jobId 갱신 API는 #4 스펙에서 정의 (위험 §9-R5).

## 7. 엣지 케이스

| ID | 케이스 | 처리 |
|---|---|---|
| E-1 | 패턴 내 몬스터 0 (빗나감) | 시전 FX 재생, 데미지 0, `AttackResolvedEvent(damagedCount=0)`, 시퀀스 계속 (D-12) |
| E-2 | 동시/중복 처치 — 한 시퀀스에서 같은 몬스터를 여러 시전이 타격 | 매 시전 직전 `isvalid` + `IsDead()` 재검증. `MonsterKilledEvent` 1회 발신 보장은 #7 `MonsterUnit` 책임 (§4.3) |
| E-3 | 디졸브(사망 연출) 진행 중 몬스터에 추가 타격 | `IsDead() == true` → 타겟에서 제외. 디졸브 중 엔티티는 보드 점유 해제(#1·#7 협의) |
| E-4 | 도적 사거리 내 타겟 없음 | 해당 시전 스킵 (FX 미재생), 다음 스킬 진행 (5.2) |
| E-5 | 궁수 라인이 보드 경계 밖 | `IsInsideBoard` 루프 종료로 자동 클리핑 (5.1) |
| E-6 | 멀티셀 보스가 한 패턴에 여러 셀 걸침 | Entity 기준 dedupe — 시전 1회당 1히트셋 (5.3 `seen`) |
| E-7 | 시퀀스 중 레벨업 발생 | 선택지 팝업은 `AttackSequenceEndedEvent` 이후 처리 — #4와의 계약 (§4.2). 시퀀스 중 스킬 목록은 스냅샷이라 즉시 영향 없음 |
| E-8 | 시퀀스 중 동료 등록/해제 | 시퀀스 시작 시 유닛 스냅샷 — 다음 젠부터 반영 |
| E-9 | 시퀀스 중 합성으로 스킬 소실/변경 (합성 재료 소실) | 시퀀스 시작 시 스킬 목록 스냅샷 (5.3). 스냅샷의 스킬이 시전 시점에 이미 소실됐어도 스냅샷 값으로 시전 — 데이터 정합성은 #3이 시퀀스 중 합성을 차단하는 것으로 보완 (위험 §9-R4) |
| E-10 | 보드 가득 참 (몬스터 임계치 근접) | 전투는 정상 실행 — 광역 직업이 자연히 유리. 실패 판정은 `AttackSequenceEndedEvent` 이후 #1이 수행 |
| E-11 | 직업 미선택 상태에서 젠 시도 | `ExecuteZenCombat`에서 `GetJob == ""` 이면 시퀀스 중단 + `log_warning`. UI 차원에서 #8이 젠 버튼 비활성화 (이중 방어) |
| E-12 | 수동 모드 방향 미설정 | `DEFAULT_DIRECTION = "RIGHT"` → 이후 직전 값 유지 (D-9) |
| E-13 | 멀티플레이 (협업 월드) | 모든 per-user 상태는 `userId` 키 Dictionary. 시퀀스는 유닛 단위 순차 실행 — 프로토타입은 1인 기준 검증, 구조만 멀티 대비 |
| E-14 | `RequestSelectJob` 중복/위조 호출 | `senderUserId` 검증 (msw-scripting §6) + 이미 선택된 유저는 무시 + `log_warning` |
| E-15 | FX RUID 로드 지연 (첫 시전 끊김) | `OnBeginPlay`(ClientOnly)에서 `_ResourceService:PreloadAsync` / 사운드 `LoadSound` 프리로드 |

## 8. 공격 연출 요구사항 (CombatFxLogic)

| 연출 | 구현 수단 | 비고 |
|---|---|---|
| 시전 모션 | 캐릭터(DefaultPlayer 아바타) `StateComponent:ChangeState("ATTACK")` + `AvatarStateAnimationComponent.StateToAvatarBodyActionSheet` 매핑 (msw-combat-system §10). 직업별 액션: 전사 swing / 궁수 shoot / 마법사·도적 직업 모션 (msw-avatar 스킬에서 확정) | PlayerController Enable=false 상태에서 State 전이 동작 여부는 구현 시 검증 필요 (위험 R2) |
| 시전 FX | 직업/스킬별: 전사 `SparkRadialExplosion`, 마법사 `Nova`/`CircleBurst`, 궁수 화살 스프라이트 `_ParticleService:PlaySpriteParticle(StreamSharp, arrowRUID, ...)`, 도적 `StreamSharp` (msw-combat-system §4 ParticleService) | RUID 불필요한 BasicParticle 우선 — 프로토타입 속도 |
| 피격 FX | 타격 셀마다 `SparkExplosion` + 몬스터 `SpriteRenderer.Color` 플래시(타이머 복원) | |
| 데미지 숫자 | `_DamageSkinService:Play(target, "3271c3e79bf04ecba9a107d55495970d", 0, {damage}, Default, false, offset, scale, 1, 1, LitMode.Default)` — 커스텀 파이프라인이므로 수동 호출 (msw-combat-system §11-2, Client space 주의) | 6필수+5옵션 전체 전달 (LEA-3005 방지) |
| 방향 표시 | `DirectionIndicator.model` 스프라이트, 수동 모드에서만 표시, Z 회전 4방 | D-7 |
| SFX | 시전/피격 `_SoundService:PlaySoundAtPos` | |
| 디졸브 (처치) | **본 시스템 범위 외** — monsters-boss(#7)에 요구사항 전달: `MonsterKilledEvent` 발신 후 알파 페이드(Color.a 트윈) 또는 `_TweenLogic` 스케일 축소, 완료 후 `Entity:Destroy()`. 디졸브 동안 보드 점유 즉시 해제 | E-3 연계 |
| 서버→클라 FX 경로 | `CombatFxLogic`의 `@ExecSpace("Multicast")` 메서드로 일원화. FX 파라미터는 string fxKey + Vector2 좌표만 전달 (enum RPC 금지) | |

## 9. 위험 (Risks)

- R1: `ZenStartedEvent`가 "배치 완료 후" 발화한다는 보장이 #1 스펙/MASTER_PLAN에서 미확정 — 시퀀스가 배치 전 좌표를 읽으면 오판정. 호출 방식(이벤트 vs 직접 호출) MASTER_PLAN 확정 필요.
- R2: PlayerController/Rigidbody Enable=false 상태의 DefaultPlayer 아바타에서 `StateComponent:ChangeState("ATTACK")` 모션 재생 여부 미검증 — 실패 시 `AvatarRendererComponent` 직접 액션 재생으로 폴백.
- R3: `wait()` 기반 시퀀스가 서버 @Logic에서 장시간 블로킹할 경우 다른 처리와의 간섭 — 구현 시 타이머 체인(`_TimerService:SetTimer`) 대체 검토.
- R4: 시퀀스 중 합성/스킬 변경 차단(E-9)은 #3 스펙에 역의존 — #3 스펙에 "시퀀스 중 합성 잠금" 항목 반영 필요.
- R5: 전직(#4) 시 jobId 갱신과 공격 패턴 변경의 연동 API가 본 스펙 범위 밖 — `JobLogic`에 갱신 메서드 추가가 #4 스펙에서 정의돼야 함.
- R6: 화살/스킬 스프라이트 RUID 검색 실패 가능 — 실패 시 BasicParticle 대체 + 스펙의 "RUID 필요" 마킹 규칙(ARCHITECTURE §4-5) 적용.
- R7: p.11 "이후부터는 랜덤" 문구의 해석(D-1)이 기획 의도와 다를 수 있음 — 프로토타입 리뷰 시 확인 항목.

## 10. 필요 리소스 (msw-search 검색 키워드)

| 용도 | 키워드 (RUID 검색) |
|---|---|
| 궁수 화살 스프라이트/이펙트 | `arrow`, `화살`, `bow attack`, `double shot`, `더블샷` |
| 전사 검격 이펙트 | `slash`, `sword effect`, `검기`, `power strike` |
| 마법사 마법 이펙트 | `magic`, `explosion`, `매직`, `thunder`, `에너지볼트` |
| 도적 표창/단검 이펙트 | `throwing star`, `표창`, `dagger`, `lucky seven` |
| 공통 피격 이펙트 | `hit effect`, `타격`, `impact` |
| 방향 화살표 스프라이트 | `arrow icon`, `direction arrow`, `방향 화살표` |
| 직업 선택 카드 아이콘 | `warrior icon`, `archer icon`, `magician icon`, `thief icon`, `직업` |
| SFX — 시전 | `bow shoot sound`, `sword swing sound`, `magic cast sound`, `stab sound` |
| SFX — 피격 | `hit sound`, `damage sound` |
