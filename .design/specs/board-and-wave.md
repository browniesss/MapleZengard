# Spec — board-and-wave (퍼즐판 + 젠 시스템)

> 시스템 #1 (ARCHITECTURE.md §2). 기획서 근거 페이지: p.4, p.8, p.9, p.21.
> 본 스펙은 구현 직전 단계 상세 명세이며, ARCHITECTURE.md §1 플랫폼 확정 사항을 절대 변경하지 않는다.
> 이름/이벤트/모델 id의 최종 확정은 MASTER_PLAN.md가 단일 진실 — 본 스펙의 명칭은 ARCHITECTURE.md §5 잠정 계약을 따른 제안값이다.

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (인용) | 페이지 | 구현 항목 |
|---|---|---|---|
| R1 | "정해진 퍼즐판(맵) 위에서 메이플스토리 내 몬스터가 '젠' 단위로 등장" | p.4 | `BoardLogic` 그리드 + `WaveLogic` 젠 사이클 |
| R2 | "'젠' 클릭 시, 일반 몬스터가 랜덤 배치로 생성" | p.8 | `WaveLogic:StartZen()` → 빈 셀 추첨 → `SpawnByModelId` |
| R3 | "기존에 생성되어 있던 몬스터의 위치는 우선 고정이나, '젠' 클릭 시 랜덤 배치도 고려" | p.8 | 기본값: 기존 몬스터 위치 고정. `REPOSITION_MONSTERS_ON_ZEN` 설정 플래그로 랜덤 재배치 옵션 제공 (기본 `false`) |
| R4 | "캐릭터의 위치도 '젠' 클릭 시 랜덤으로 배치" / "캐릭터 및 몬스터 위치 랜덤 재배치" | p.8, p.9 | `WaveLogic:RepositionPlayer()` — 매 젠마다 캐릭터는 항상 랜덤 재배치 (p.8·p.9 공통 명시). 몬스터 재배치는 R3 플래그 |
| R5 | "처치 여부와 관계 없이 다음 젠 진행" | p.9 | `RequestZen()`에 처치 완료 선행조건 없음 (쿨다운/상태 가드만) |
| R6 | "몬스터는 추가로 생성" (누적) | p.9 | 점유 그리드에 몬스터 누적, `MonsterCount` 단조 증가/처치 시 감소 |
| R7 | "몬스터의 숫자가 일정 수치 이상으로 넘어가거나 … 스테이지 실패" | p.9 | 스폰 후 `MonsterCount >= MONSTER_LIMIT` 검사 → `_ZengardGameLogic:NotifyStageFailed("monster_overflow")` |
| R8 | "20젠 또는 특수 조건 달성 후 보스 몬스터 등장" | p.9 | `CurrentZen == BOSS_ZEN(20)` 도달 젠 = 보스 젠 → `ZenStartedEvent(isBossZen=true)` 발행. 특수 조건용 훅 `ForceBossZen()` 제공 |
| R9 | "테마마다 크기는 난이도에 따라 유동적으로 변경 / 테마 내 스테이지에서는 모두 크기 고정" | p.21 | `BoardConfig`의 스테이지별 설정 테이블 (cols/rows/cellSize) — 프로토타입은 헤네시스 7×7 단일 |
| R10 | "퍼즐판 배경은 해당 테마 내의 대표적인 맵들로 구성" | p.21 | 헤네시스 테마 배경 스프라이트 + 셀 타일 (`BoardBackdrop.model`, `BoardCell.model`) |
| R11 | "모바일 디바이스로 플레이 시 최적화된 넓이를 Max 크기로 설정" | p.21 | 보드 7×7×0.8=5.6 unit — Mobile 9.6×5.4 기준 검증 (§8 리스크 참조), 고정 카메라 |
| R12 | "캐릭터는 수동 플레이 기준 공격 방향 설정 가능 / 자동 플레이 기준 설정 불가" | p.8 | **jobs-and-combat(#2) 소유** — 본 시스템은 캐릭터 위치(셀)만 관리, 방향/공격은 계약으로 위임 |
| R13 | "몬스터 처치 시 경험치 획득 … 선택지" (스킬 90%/장비 10%) | p.9 | **level-choice-jobadv(#4) 소유** — 본 시스템은 `MonsterKilledEvent` 소비(점유 해제)만 |

**[설계 결정] 기획서 미명시 항목 (프로토타입 관점 확정, 질문 없이 결정):**

| 항목 | 결정 | 근거 |
|---|---|---|
| 젠당 일반 몬스터 생성 수 | **5마리 고정** (`MONSTERS_PER_ZEN = 5`) | 20젠 누적 시 최대 100마리 유입 → 처치 압박과 임계치(30)가 유의미해지는 수치. 스테이지 설정으로 조정 가능 구조 |
| 몬스터 수 실패 임계치 | **30마리** (`MONSTER_LIMIT = 30`) | 49셀의 약 61%. 보드가 시각적으로 "넘쳐 보이는" 시점이면서 캐릭터 재배치 공간은 남는 수치 |
| 젠 버튼 쿨다운 | **1.0초** (`ZEN_COOLDOWN_SECONDS = 1.0`) | 연타로 인한 의도치 않은 다중 젠 방지. 서버 측 가드 |
| 젠당 몬스터 종류 가중치 | **주황버섯 70% / 스톤골렘 30%** | 기획서 p.19~20의 일반 몬스터 2종 전제. 저체력(HP10) 다수 + 고체력(HP15) 소수 구성 |
| 보스 젠의 일반 몬스터 스폰 | **없음** (보스만 등장) | 보스전 집중. 일반 스폰 병행은 스테이지 설정 확장으로 가능 |
| 보스 젠 이후 젠 버튼 | **비활성** (`IsZenAvailable = false`) | 보스 처치/실패로만 스테이지 종료 (p.9 플로우) |
| 셀 좌표계 | col 0..6 (좌→우), row 0..6 (하→상), 원점 = 보드 중심 (0, 0.3) | ARCHITECTURE §1 확정값에서 유도 |
| 렌더 순서 | 몬스터/캐릭터 `OrderInLayer = 2 + (rows - 1 - row)` | 아래 행(화면 앞쪽)이 위에 그려지는 의사 깊이감 |
| 스폰 직후 등장 연출 | 스폰 이펙트 1회 재생 (클라이언트) | Visual Polish 원칙 (msw-general). 리소스 §7 |

---

## 2. 데이터 테이블 (밸런스 상수)

`BoardConfig.mlua`에 집중. 매직 넘버 코드 산재 금지 (ARCHITECTURE §4-7).

### 2.1 기획서 명시 수치 (그대로)

| 상수 | 값 | 출처 |
|---|---|---|
| `BOSS_ZEN` | `20` | p.9 "20젠 … 후 보스 몬스터 등장" |
| (참고) 선택지 확률 스킬/장비 | 90% / 10% | p.9 — level-choice-jobadv(#4) 소유, 본 시스템 미사용 |
| (참고) 주황버섯/스톤골렘/머쉬맘 HP | 10 / 15 / 100 | p.19~20 — monsters-boss(#7) 소유, 본 시스템 미사용 |

### 2.2 ARCHITECTURE 확정 수치 (변경 불가)

| 상수 | 값 | 출처 |
|---|---|---|
| `GRID_COLS` / `GRID_ROWS` | `7` / `7` | ARCHITECTURE §1 |
| `CELL_SIZE` | `0.8` (world unit) | ARCHITECTURE §1 |
| `BOARD_CENTER` | `(0, 0.3)` | ARCHITECTURE §1 |
| 좌표 단위 | 1 world unit = 100 px | platform.md §5 |

### 2.3 [설계 결정] 수치

| 상수 | 값 | 비고 |
|---|---|---|
| `MONSTERS_PER_ZEN` | `5` | 스테이지 설정으로 오버라이드 가능 |
| `MONSTER_LIMIT` | `30` | 실패 임계치 (R7) |
| `ZEN_COOLDOWN_SECONDS` | `1.0` | 서버 가드 |
| `REPOSITION_MONSTERS_ON_ZEN` | `false` | R3 옵션 플래그 |
| `SPAWN_WEIGHTS` | `{ orangemushroom = 70, stonegolem = 30 }` | 합 100 기준 가중 추첨 |
| `MONSTER_Z` / `PLAYER_Z` | `0` / `0` | 깊이는 OrderInLayer로만 제어 |

### 2.4 스테이지 설정 테이블 (R9 — 테마별 가변 구조)

```lua
-- BoardConfig.mlua (개념 스키마)
STAGE_CONFIG = {
    ["henesys_1"] = {
        cols = 7, rows = 7, cellSize = 0.8,
        boardCenterX = 0, boardCenterY = 0.3,
        monstersPerZen = 5,
        monsterLimit = 30,
        bossZen = 20,
        spawnWeights = { orangemushroom = 70, stonegolem = 30 },
        bossModelId = "mushmom",
        repositionMonstersOnZen = false,
    },
}
```

프로토타입은 `henesys_1` 하나만 채운다. 테마 확장 시 행만 추가.

---

## 3. 파일 매니페스트

ARCHITECTURE §3 경로 규칙 준수. 모든 `.mlua`는 `RootDesk/MyDesk/Zengard/` 하위.

| 파일 | 타입 | ExecSpace 전략 | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Board/BoardConfig.mlua` | `@Logic` | 메서드 ExecSpace 미지정 (양쪽 로컬 실행 — 상수 조회는 부수효과 없음) | 밸런스 상수 + 스테이지 설정 테이블의 단일 소스. `GetStageConfig(stageId)` 제공 |
| `RootDesk/MyDesk/Zengard/Board/BoardLogic.mlua` | `@Logic` | 좌표 변환: ExecSpace 미지정 (서버·클라 양쪽에서 동일 수식). 점유 그리드 조작: `ServerOnly` | **cell↔world 변환 단일 소스** (ARCHITECTURE §5). 점유 그리드(occupancy) 서버 권위 관리, 빈 셀 추첨, 외부 시스템용 점유 API |
| `RootDesk/MyDesk/Zengard/Board/WaveLogic.mlua` | `@Logic` | 핵심 로직 `ServerOnly`. 클라 진입점 `RequestZen()`만 `@ExecSpace("Server")`. HUD용 상태는 `@Sync` property | 젠 카운터, 젠 사이클(스폰→캐릭터 재배치→실패 검사→보스 트리거), 몬스터 누적 수 관리, `ZenStartedEvent` 발행 |
| `RootDesk/MyDesk/Zengard/Events/ZenStartedEvent.mlua` | `@Event` | — | 젠 시작 브로드캐스트 페이로드 (§4.3) |
| `RootDesk/MyDesk/Models/MapObjects/BoardBackdrop.model` | `.model` | — | 헤네시스 테마 배경 1장 (보드 뒤). `TransformComponent + SpriteRendererComponent`만. Body 없음 (정적). `OrderInLayer = 0` |
| `RootDesk/MyDesk/Models/MapObjects/BoardCell.model` | `.model` | — | 셀 타일 비주얼 1칸. 49 인스턴스 placeModel (≥2 = model 규칙). `OrderInLayer = 1`. Body 없음 |
| `map/map01.map` (수정) | `.map` | — | `BoardBackdrop` 1개 + `BoardCell` 49개 placeModel 배치 (MapBuilder 경유), 고정 카메라 설정 |

**이 시스템이 만들지 않는 것 (소유권 경계):**

- 젠 버튼 UI (`GameHUDGroup`) — ui-modes-stages(#8) 소유. 본 시스템은 서버 진입점만 제공.
- 몬스터/보스 `.model` (`orangemushroom`, `stonegolem`, `mushmom`) — monsters-boss(#7) 소유. 본 시스템은 modelId 문자열만 참조.
- 캐릭터(보드 말) 엔티티/직업 — jobs-and-combat(#2) 소유. 본 시스템은 위치(셀)만 이동.
- `ZengardGameLogic` 상태 머신 — 통합 계약 (#감독관). 본 시스템은 호출만.

**구현 시 선행 Read 의무 (ARCHITECTURE §4):** `.mlua` 작성 전 `msw-scripting/SKILL.md` + `verify-checklist.md`, `.model`/`.map` 작업 전 `builder-protocol.md` + `model.md`/`entity.md` 전문.

**@Logic 주의 (msw-scripting §3.2):** `@Logic`에는 `self.Entity`가 없다. 스폰 부모용 맵 엔티티는 `_EntityService:GetEntityByPath("/maps/map01")`로 조회해 `OnBeginPlay`(ServerOnly)에서 캐시한다. `SpawnByModelId`의 parent에 nil 금지 (platform.md §8).

---

## 4. API / 이벤트 계약

### 4.1 BoardLogic (노출 API)

```lua
-- 좌표 변환 (ExecSpace 미지정 — 양쪽 로컬, 순수 함수)
method Vector3 CellToWorld(integer col, integer row)
    -- returns Vector3((col - 3) * 0.8 + 0, (row - 3) * 0.8 + 0.3, z)
method table WorldToCell(Vector3 pos)         -- returns { col, row } (반올림), 보드 밖이면 nil
method boolean IsInside(integer col, integer row)

-- 점유 그리드 (ServerOnly — 서버 권위, ARCHITECTURE §4-8)
@ExecSpace("ServerOnly") method boolean IsOccupied(integer col, integer row)
@ExecSpace("ServerOnly") method boolean TryOccupy(integer col, integer row, string entityId, string kind)
    -- kind: "monster" | "player" | "boss". 이미 점유 시 false
@ExecSpace("ServerOnly") method void Release(integer col, integer row, string entityId)
    -- entityId 불일치 시 무시 + log_warning (동시성 가드, §6-4)
@ExecSpace("ServerOnly") method void ReplaceOccupant(integer col, integer row, string oldId, string newId)
    -- 몬스터 진화(주황버섯 10젠) 시 monsters-boss가 호출 (§6-7)
@ExecSpace("ServerOnly") method table GetRandomEmptyCells(integer count)
    -- 빈 셀 목록에서 비복원 추첨, 최대 count개 (부족하면 있는 만큼) — §5.1
@ExecSpace("ServerOnly") method integer GetOccupantCount(string kind)
@ExecSpace("ServerOnly") method void ResetBoard()   -- 스테이지 재시작 시 _ZengardGameLogic이 호출
```

### 4.2 WaveLogic (노출 API + 동기화 상태)

```lua
@Sync property integer CurrentZen = 0          -- HUD 표시용
@Sync property integer MonsterCount = 0        -- HUD 표시용 (임계치 게이지)
@Sync property boolean IsZenAvailable = true   -- 젠 버튼 활성/비활성 바인딩

@ExecSpace("Server") method void RequestZen()
    -- HUD 젠 버튼 클릭 → 클라→서버 RPC 진입점. senderUserId로 요청자 식별 가능
@ExecSpace("ServerOnly") method void ForceBossZen()
    -- "특수 조건" 훅 (R8). 외부 시스템이 호출하면 다음 젠 = 보스 젠
@ExecSpace("ServerOnly") method void ResetWave()
    -- 스테이지 (재)시작 시 _ZengardGameLogic이 호출. CurrentZen=0, MonsterCount=0
```

### 4.3 발행 이벤트

```lua
@Event
script ZenStartedEvent extends EventType
    property integer zenIndex = 0
    property boolean isBossZen = false
    property integer spawnedCount = 0
end
-- 발행: _ZengardGameLogic:SendEvent(ev)  (월드 이벤트 버스 — ARCHITECTURE §5)
-- 소비처: monsters-boss(#7) — isBossZen=true 시 보스 스폰 / 주황버섯 진화 타이머(10젠) 기산
--        ui-modes-stages(#8) — 젠 연출/토스트
```

### 4.4 의존하는 외부 계약 (다른 시스템이 제공)

| 계약 | 제공자 | 사용처 |
|---|---|---|
| `_ZengardGameLogic:NotifyStageFailed(string reason)` — reason `"monster_overflow"` | 통합 계약 (상태 머신) | R7 임계치 초과 시 |
| `_ZengardGameLogic:IsInStage() → boolean` | 통합 계약 | `RequestZen()` 상태 가드 |
| `_ZengardGameLogic` = 커스텀 이벤트 버스 (`SendEvent`/`ConnectEvent`) | 통합 계약 | `ZenStartedEvent`, `MonsterKilledEvent` 송수신 |
| `MonsterKilledEvent { monsterEntityId, monsterType, col, row }` | monsters-boss(#7) | WaveLogic이 구독 → `BoardLogic:Release` + `MonsterCount -= 1` |
| 몬스터 모델 id: `orangemushroom`, `stonegolem`, 보스 `mushmom` | monsters-boss(#7) | `SpawnByModelId` 첫 인자 |
| 외부 스폰(스톤골렘 증식 등)은 반드시 `BoardLogic:GetRandomEmptyCells(1)` + `TryOccupy` 경유 | monsters-boss(#7) 준수 의무 | 점유 그리드 일관성 |
| 플레이어 보드 말 엔티티 획득: `_UserService.LocalPlayer` 아님 — 서버에서 `_UserService:GetUsersByMapComponent(map.MapComponent)` | jobs-and-combat(#2)와 합의 | `RepositionPlayer()` |
| 플레이어 `RigidbodyComponent`/`PlayerControllerComponent` `Enable=false` 선행 | ARCHITECTURE §1 (마스터플랜 작업) | Transform 직접 쓰기 전제 (§8 리스크) |
| HUD `ZenButton` 클릭 → `_WaveLogic:RequestZen()` 호출 + `IsZenAvailable`/`CurrentZen`/`MonsterCount` `OnSyncProperty` 바인딩 | ui-modes-stages(#8) | 젠 트리거 |

---

## 5. 핵심 알고리즘 의사코드

### 5.1 빈 셀 비복원 추첨 — `GetRandomEmptyCells(count)`

```
empty = []
for col in 0..GRID_COLS-1:
    for row in 0..GRID_ROWS-1:
        if not occupied[col][row]: empty.append({col, row})
-- 부분 Fisher-Yates: 앞에서 count개만 확정
n = min(count, #empty)
for i in 1..n:
    j = _UtilLogic:RandomIntegerRange(i, #empty)
    swap(empty[i], empty[j])
return empty[1..n]      -- n < count일 수 있음 (호출자가 #결과로 판단)
```

### 5.2 가중치 몬스터 종류 추첨

```
function PickMonsterType(weights):       -- { orangemushroom=70, stonegolem=30 }
    total = sum(weights.values)
    r = _UtilLogic:RandomIntegerRange(1, total)
    acc = 0
    for type, w in pairs(weights):       -- 순회 순서 비결정성 무해 (합 기준 구간 추첨)
        acc += w
        if r <= acc: return type
```

### 5.3 젠 사이클 — `RequestZen()` → `StartZen()`

```
@ExecSpace("Server") RequestZen():
    if not _ZengardGameLogic:IsInStage(): return            -- 상태 가드
    if not IsZenAvailable: return                            -- 보스 젠 이후 차단
    if processingZen: return                                  -- 재진입 가드 (§6-3)
    if now - lastZenAt < ZEN_COOLDOWN_SECONDS: return        -- 쿨다운 (delta 누적 기반, ElapsedSeconds 앵커 금지)
    StartZen()

@ExecSpace("ServerOnly") StartZen():
    processingZen = true
    CurrentZen += 1
    isBossZen = (CurrentZen >= cfg.bossZen) or forcedBoss
    log("[WaveLogic] zen started: " .. CurrentZen)            -- ARCHITECTURE §4-9 체크포인트
    if cfg.repositionMonstersOnZen and not isBossZen:        -- R3 옵션
        RepositionAllMonsters()                               -- §5.5
    RepositionPlayer()                                        -- R4: 항상
    if isBossZen:
        IsZenAvailable = false
        emit ZenStartedEvent(CurrentZen, true, 0)             -- monsters-boss가 보스 스폰
    else:
        spawned = SpawnMonsters(cfg.monstersPerZen)           -- §5.4
        emit ZenStartedEvent(CurrentZen, false, spawned)
        if MonsterCount >= cfg.monsterLimit:                  -- R7 (스폰 후 검사)
            log("[WaveLogic] stage failed: monster_overflow count=" .. MonsterCount)
            _ZengardGameLogic:NotifyStageFailed("monster_overflow")
    processingZen = false
```

### 5.4 몬스터 스폰 — `SpawnMonsters(n)`

```
cells = _BoardLogic:GetRandomEmptyCells(n)                    -- 플레이어 셀은 점유 상태라 자동 제외
spawned = 0
for cell in cells:
    type = PickMonsterType(cfg.spawnWeights)
    pos = _BoardLogic:CellToWorld(cell.col, cell.row)
    e = _SpawnService:SpawnByModelId(type, type .. "_z" .. CurrentZen .. "_" .. idx, pos, mapEntity)
    if e == nil: log_error("spawn failed: " .. type); continue   -- §6-6
    _BoardLogic:TryOccupy(cell.col, cell.row, e.Id, "monster")
    e.SpriteRendererComponent.OrderInLayer = 2 + (cfg.rows - 1 - cell.row)   -- 의사 깊이
    spawned += 1
MonsterCount += spawned
if spawned < n: log_warning("board short of empty cells: " .. spawned .. "/" .. n)   -- §6-1
return spawned
```

### 5.5 캐릭터/몬스터 재배치

```
RepositionPlayer():
    cells = _BoardLogic:GetRandomEmptyCells(1)
    if #cells == 0: log_warning("no empty cell; player stays"); return    -- §6-2
    Release(oldCol, oldRow, playerId); TryOccupy(new, playerId, "player")
    playerEntity.TransformComponent.WorldPosition = CellToWorld(new)      -- Body Enable=false 전제
    -- (Rigidbody가 활성인 상태가 발견되면 MovementComponent:SetPosition 폴백 — §8 리스크)

RepositionAllMonsters():                                                  -- R3 옵션 (기본 미사용)
    monsters = 현재 점유 목록 중 kind=="monster" 스냅샷
    전원 Release 후, 셀 전체 빈 칸에서 #monsters개 추첨해 순서대로 TryOccupy + Transform 이동
    -- 전원 해제 후 재추첨이라 "자리 맞바꿈 불가" 문제 없음
```

### 5.6 처치 소비 — `MonsterKilledEvent` 핸들러 (ServerOnly)

```
OnMonsterKilled(ev):
    _BoardLogic:Release(ev.col, ev.row, ev.monsterEntityId)   -- id 불일치면 내부에서 무시 (§6-4)
    MonsterCount = max(0, MonsterCount - 1)
    log("[WaveLogic] monster killed, remain=" .. MonsterCount)
```

### 5.7 cell↔world 변환 (단일 소스 수식)

```
CellToWorld(col, row) = Vector3(
    BOARD_CENTER.x + (col - (GRID_COLS - 1) / 2) * CELL_SIZE,   -- (col - 3) * 0.8
    BOARD_CENTER.y + (row - (GRID_ROWS - 1) / 2) * CELL_SIZE,   -- (row - 3) * 0.8 + 0.3
    0)
WorldToCell(pos) = {
    col = round((pos.x - BOARD_CENTER.x) / CELL_SIZE + 3),
    row = round((pos.y - BOARD_CENTER.y) / CELL_SIZE + 3) }     -- IsInside 검사 후 반환, 밖이면 nil
```

보드 외곽: X ∈ [-2.8, 2.8], Y ∈ [-2.5, 3.1] (셀 외곽 포함 5.6×5.6). 다른 시스템(전투 범위 판정 등)은 반드시 이 두 메서드만 사용한다 — 자체 좌표 계산 금지.

### 5.8 보드 배경 구성 (구현 시 1회, MapBuilder 경유)

```
1. BoardBackdrop.model 1개 → placeModel at (0, 0.3, z), OrderInLayer=0, 헤네시스 배경 RUID
2. BoardCell.model 49개 → placeModel at CellToWorld(col,row) 좌표 (위 수식을 빌더 스크립트에서 동일 적용), OrderInLayer=1
3. 고정 카메라: 보드 전체가 보이도록 카메라 위치 (0, 0.3) 고정 (ARCHITECTURE §1 — 플레이어 추적 비활성)
4. refresh는 오케스트레이터 담당 (ARCHITECTURE §4-1)
```

> map01은 `TileMapMode = 0` (MapleTile) 유지 — 보드 말/몬스터는 Body 미부착 정적 엔티티이므로 LEA-3004 무관 (ARCHITECTURE §1). 단, Foothold 위 정렬 규칙도 비적용 (자유 좌표 배치).

---

## 6. 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| 1 | **빈 셀 부족** — 스폰 요청 수 > 빈 셀 수 | 있는 만큼만 스폰 (`GetRandomEmptyCells` 반환 크기 기준), `log_warning`. 이 시점이면 보통 임계치(30) 실패가 먼저/직후 발동 |
| 2 | **빈 셀 0개 + 캐릭터 재배치** | 캐릭터 현 위치 유지 (이동 생략), `log_warning` |
| 3 | **젠 버튼 연타 / 다중 클라이언트 동시 클릭** | 서버 측 3중 가드: `IsInStage` → `processingZen` 재진입 플래그 → 1.0초 쿨다운. 클라 측 비활성화는 보조 수단일 뿐 신뢰하지 않음 |
| 4 | **처치와 젠(재배치)의 경합** | 서버 mlua는 단일 실행 흐름이라 진짜 race는 없으나, 이벤트 도착 순서 역전 대비: `Release(col,row,entityId)`가 entityId 불일치 시 무시 — 죽은 몬스터의 옛 셀을 새 점유자가 차지한 뒤 늦게 온 kill 이벤트가 새 점유를 지우는 사고 방지 |
| 5 | **재배치 옵션 ON 중 이동된 몬스터를 노리던 공격** | 전투 시스템(#2/#7) 계약: 공격 판정 시점에 `isvalid(target)` + `WorldToCell`로 현재 셀 재조회. 본 시스템은 위치를 즉시 이동만 (보간 없음 — 프로토타입) |
| 6 | **`SpawnByModelId` nil 반환** (모델 미등록 등) | `log_error` 후 해당 칸 스킵, `MonsterCount` 미증가, 점유 미기록 — 유령 점유 방지 |
| 7 | **주황버섯 진화(10젠 미처치, p.19)로 엔티티 교체** | monsters-boss가 `ReplaceOccupant(col,row,oldId,newId)` 호출 의무 — 점유 id 정합 유지. 미호출 시 §6-4 가드가 후속 Release를 무시해 누수되므로 계약 위반은 blocking |
| 8 | **스톤골렘 증식(p.20)의 외부 스폰** | 반드시 `GetRandomEmptyCells(1)` + `TryOccupy` 경유 (§4.4). 증식분도 `MonsterCount` 반영 위해 monsters-boss는 `_WaveLogic` 공개 API로 통보 — 구현 시 `NotifyExternalSpawn(entityId,col,row)` 추가 검토 (MASTER_PLAN에서 확정) |
| 9 | **임계치 도달과 보스 젠 동시 충족** | 임계치 검사는 일반 스폰 직후에만 수행. 보스 젠은 일반 스폰이 없어 신규 실패 미발생 — 이미 29마리여도 보스전 진행 (실패는 "보스 미처치" 경로로만) |
| 10 | **스테이지 재시작 (로그라이크, p.4)** | `_ZengardGameLogic`이 `ResetBoard()` + `ResetWave()` 호출 → 점유/카운터/쿨다운/`IsZenAvailable` 전부 초기화. 몬스터 엔티티 제거는 monsters-boss 소유 |
| 11 | **플레이 세션 재시작 시 타이머 오염** | 쿨다운은 `ElapsedSeconds` 절대값 앵커 금지 — `OnUpdate(delta)` 감산 방식 (msw-scripting §13 함정) |
| 12 | **`@Logic`은 맵 전환에도 생존** | 스테이지 이탈 시 상태 잔존 위험 → `ResetWave()`가 유일한 초기화 경로임을 명시. `OnMapEnter`는 @Logic에서 침묵 무시되므로 절대 사용하지 않음 |

---

## 7. 필요 리소스 (msw-search 검색 키워드)

구현 단계에서 `msw-search` 절차로 RUID 확보. 검색 실패 시 구현 노트에 "RUID 필요" 마킹 (ARCHITECTURE §4-5). `SpriteRUID` 빈 문자열 금지.

| 용도 | 검색 키워드 (RUID 검색) | 비고 |
|---|---|---|
| 보드 배경 (헤네시스 테마) | "헤네시스", "Henesys", "henesys background", "단풍", "초원 배경", "grass field" | BoardBackdrop.model. 대표 맵 이미지 1장 (p.21) |
| 셀 타일 | "tile", "wood panel", "grid cell", "바닥 타일", "square tile" | BoardCell.model. 반투명/얇은 테두리 느낌 우선 |
| 몬스터 스폰 이펙트 | "smoke", "puff", "spawn effect", "소환 이펙트", "등장 연출" | animationclip 우선 (SpriteRUID 직접 재생 가능) |
| 젠 시작 사운드 | "horn", "wave start", "알림음", "fanfare short" | `_SoundService:PlaySound` |
| 경고(임계치 근접) 사운드 | "warning", "alarm", "경고음" | MonsterCount ≥ limit−5 시 HUD 연출용 (#8과 협의) |

---

## 8. 리스크

1. **모바일 세로 클리핑**: 보드 외곽 높이 5.6 unit > Mobile 가시 영역 5.4 unit (platform.md §5). 상하 각 0.1 unit 잘림. 그리드/셀 크기는 ARCHITECTURE 확정이라 변경 불가 → 카메라 줌(OrthographicSize 미세 확대) 또는 외곽 셀 장식 최소화로 흡수. 구현 후 모바일 해상도 screenshot 검증 필요 (오케스트레이터 담당).
2. **플레이어 Transform 직접 쓰기 전제**: `RigidbodyComponent.Enable=false`(마스터플랜의 DefaultPlayer 수정)가 선행되지 않으면 MapleTile 중력/물리가 다음 프레임에 위치를 덮어씀 (msw-scripting §11). 폴백: `MovementComponent:SetPosition`. 통합 시 선후 관계를 MASTER_PLAN이 보장해야 함.
3. **이벤트 버스 정합**: `_ZengardGameLogic` 미구현 상태에서 본 시스템 단독 테스트 불가 → 구현 시 `IsInStage()`/`NotifyStageFailed` 스텁 합의 필요 (MASTER_PLAN 확정 전 시그니처 변동 가능).
4. **몬스터 modelId 의존**: `orangemushroom`/`stonegolem`/`mushmom` id는 monsters-boss(#7) 산출물 — id 불일치 시 `SpawnByModelId` nil 침묵 실패. §6-6 로그 가드로 탐지하되, MASTER_PLAN에서 id 최종 고정 필수.
5. **증식/진화의 점유 계약 위반 가능성**: §6-7/§6-8은 monsters-boss의 호출 의무에 의존 — 리뷰 단계에서 교차 검증 항목으로 등재 필요.
6. **헤네시스 배경 RUID 미확보 가능성**: 적합 리소스 부재 시 msw-painter 대체 경로 (스킬 존재) 또는 placeholder RUID + "RUID 필요" 마킹.
7. **p.8 vs p.9 몬스터 재배치 서술 차이**: p.8 "우선 고정", p.9 "몬스터 위치 랜덤 재배치" — 본 스펙은 p.8을 기본값으로 채택하고 플래그로 양쪽 모두 지원 (R3/R4). 기획 의도 확인 시 플래그 값만 뒤집으면 됨.
