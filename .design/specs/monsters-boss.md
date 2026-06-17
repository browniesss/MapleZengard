# Spec: monsters-boss — 일반 몬스터 / 보스 / HP Bar / 디졸브

> 시스템 #7 (ARCHITECTURE.md §2). 기획서 p.19(일반 몬스터), p.20(보스 몬스터) 기반.
> 본 문서는 구현 직전 단계 상세 스펙이다. 구현 파일은 만들지 않는다.
> ARCHITECTURE.md §1 플랫폼 확정 사항(맵 `map01.map` / `TileMapMode=0` / 몬스터는 Body 없는 정적 엔티티 / 커스텀 데미지 시스템)을 전제로 한다 — 변경 불가.

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (인용) | 페이지 | 구현 항목 | 비고 |
|---|---|---|---|---|
| R1 | "주황버섯 HP : 10" | p.19 | `MonsterBalance.ORANGE_MUSHROOM.maxHp = 10` | 수치 그대로 |
| R2 | "주황버섯 처치 시 일정 확률로 (갓) 획득" | p.19 | 처치 시 드랍 롤 → `MonsterKilledEvent.drops`에 `ORANGE_MUSHROOM_CAP` 포함 | 확률 미명시 → [설계 결정 D1] 30% |
| R3 | "10젠 안에 처치 못할 시 일정 확률로 (진화)" | p.19 | 몬스터별 `zenAge` 카운트, 10 도달 시 진화 롤 → 진화체로 교체 | 확률/진화체 미명시 → [설계 결정 D2, D3] |
| R4 | "스톤골렘 HP : 15" | p.19 | `MonsterBalance.STONE_GOLEM.maxHp = 15` | 수치 그대로 |
| R5 | "스톤골렘 처치 시 일정 확률로 (돌) 획득" | p.19 | 처치 드랍 롤 → `GOLEM_STONE` | 확률 미명시 → [설계 결정 D1] 30% |
| R6 | "10젠 안에 처치 못할 시 일정 확률로 증식" | p.19 | `zenAge` 10 도달 시 증식 롤 → 인접 빈 셀에 동종 1기 추가 스폰 | 확률 미명시 → [설계 결정 D2] 50% |
| R7 | "Bar 형태로 체력 표시", "체력 수치는 UI에 맞춰 가장 최적화된 위치에 필수로 구현" | p.19 | `PixelRendererComponent` 16×3 월드 HP Bar, 셀 하단 위치 | §5 참조 |
| R8 | "몬스터 등장 및 처치 시 디졸브 형태로 설계" | p.19 | 등장/처치 시 클라이언트 디졸브 연출 (material 우선, 알파 페이드 폴백) | §6 참조 |
| R9 | "(아이템은) 추후 전직 재료로 활용" | p.19 | 드랍 아이템은 itemId 문자열로 `MonsterKilledEvent`에 실어 loot 시스템에 위임 | 본 시스템은 드랍 판정까지만 |
| R10 | "스테이지에 등장하는 몬스터는 기존 메이플스토리 PC 사냥터를 기준으로 구현" | p.19 | 주황버섯/스톤골렘/머쉬맘 원작 스프라이트 RUID 검색·적용 | §10 리소스 |
| R11 | "머쉬맘(보스) HP : 100" | p.20 | `MonsterBalance.MUSHMOM.maxHp = 100` | 수치 그대로 |
| R12 | "일정 확률로 (주황버섯) 소환" | p.20 | 젠 시작마다 보스 패턴 롤 → 소환 시 주황버섯 1기 빈 셀 스폰 | 확률/소환체 미명시 → [설계 결정 D4, D5] |
| R13 | "일정 확률로 10% 체력 회복" | p.20 | 패턴 롤 → 회복 시 `MaxHp × 0.10` 회복 | 회복량 10%는 기획서 수치 그대로. 확률 미명시 → [설계 결정 D4] |
| R14 | "10젠 동안 미처치 시 분열" | p.20 | 보스 `zenAge` 10 도달 시 분열 (확률 아님 — 확정 발동) | 분열 결과 미명시 → [설계 결정 D6] |
| R15 | "처치 성공 시 '메소' 또는 '레드메소' 드랍, 해당 재화로 BM 구매 가능" | p.20 | `BossKilledEvent.drops`에 `MESO` 또는 `RED_MESO` | 비율/수량 미명시 → [설계 결정 D7] |
| R16 | "보스 몬스터는 20젠 이후에 자동 생성되거나, 특수 조건을 달성하면 생성" | p.20 | 젠 20 시작 시 자동 스폰. 특수 조건은 `BossLogic:ForceSpawnBoss()` 공개 메서드로 훅만 노출 | 특수 조건 정의 미명시 → [설계 결정 D8] |
| R17 | "스테이지마다 별도의 보스 몬스터가 존재하며 처치 시 스테이지 클리어" | p.20 | 보스 타입은 스테이지 설정에서 주입받는 구조. 프로토타입은 머쉬맘 1종. 처치 시 `BossKilledEvent` 발행 → `ZengardGameLogic`이 클리어 처리 | 클리어 판정 자체는 시스템 #1/#8 소관 |
| R18 | "보스 몬스터는 개별 보스 몬스터만의 고유 패턴이 존재 (소환, 분열, 회복 등)" | p.20 | 패턴을 데이터 테이블 기반(`bossPatternTable`)으로 구성해 보스 추가 시 확장 가능 | 구조만 확장형, 구현은 머쉬맘 1종 |

---

## 2. 데이터 테이블 (밸런스 상수)

모든 상수는 `MonsterBalance.mlua` (@Logic) 한 곳에 정의한다 (ARCHITECTURE.md §4-7 매직 넘버 금지).
**[기획서]** 표기는 기획서 수치 그대로, **[D#]** 표기는 본 스펙의 설계 결정값.

### 2.1 몬스터 타입 테이블

| typeId | 이름 | maxHp | 출처 | 드랍 (확률) | 10젠 미처치 행동 (확률) | 비고 |
|---|---|---|---|---|---|---|
| `ORANGE_MUSHROOM` | 주황버섯 | **10 [기획서]** | p.19 | `ORANGE_MUSHROOM_CAP` ×1 (30% [D1]) | 진화 → `ZOMBIE_MUSHROOM` (50% [D2]) | |
| `STONE_GOLEM` | 스톤골렘 | **15 [기획서]** | p.19 | `GOLEM_STONE` ×1 (30% [D1]) | 증식 → 동종 1기 추가 (50% [D2]) | |
| `ZOMBIE_MUSHROOM` | 좀비버섯 (진화체) | 20 [D3] | — | `ORANGE_MUSHROOM_CAP` ×1 (50% [D3]) | 없음 (재진화 없음 [D3]) | 주황버섯 진화 결과 |
| `MUSHMOM` | 머쉬맘 (보스) | **100 [기획서]** | p.20 | `MESO` 100 (80%) 또는 `RED_MESO` 1 (20%) [D7] | 분열 (100% 확정, R14) | isBoss = true |
| `MUSHMOM_SPLIT` | 머쉬맘 분신 | 분열 시 계산 [D6] | — | `MESO` 50 [D6] | 재분열 없음 [D6] | 분열 결과 |

### 2.2 시스템 상수

| 상수명 | 값 | 출처 |
|---|---|---|
| `EVOLVE_MULTIPLY_ZEN_AGE` | 10 | **[기획서 p.19]** "10젠 안에" |
| `BOSS_SPLIT_ZEN_AGE` | 10 | **[기획서 p.20]** "10젠 동안 미처치 시" |
| `BOSS_AUTO_SPAWN_ZEN` | 20 | **[기획서 p.20]** "20젠 이후 자동 생성" |
| `BOSS_HEAL_RATIO` | 0.10 | **[기획서 p.20]** "10% 체력 회복" |
| `DROP_PROB_NORMAL` | 0.30 | [D1] |
| `EVOLVE_PROB` / `MULTIPLY_PROB` | 0.50 / 0.50 | [D2] |
| `BOSS_PATTERN_SUMMON_PROB` | 0.35 | [D4] |
| `BOSS_PATTERN_HEAL_PROB` | 0.25 | [D4] (나머지 0.40 = 대기) |
| `BOSS_DROP_RED_MESO_PROB` | 0.20 | [D7] |
| `DISSOLVE_DURATION` | 0.5 (초) | [D9] |
| `KILLED_EXP` | 주황버섯 1 / 스톤골렘 2 / 좀비버섯 2 / 분신 5 / 머쉬맘 20 | [D10] exp는 level 시스템 소비용 payload |

### 2.3 설계 결정 (Design Decisions) 일람

| ID | 결정 | 근거 |
|---|---|---|
| D1 | 일반 몬스터 드랍 확률 30% | "일정 확률" 미명시. 전직 재료(p.19 기타)이므로 10젠 내 수 마리 처치 시 1~2개 수급되는 체감 빈도 |
| D2 | 진화/증식 확률 각 50% | "일정 확률" 미명시. 방치 페널티가 절반 확률로 체감되도록 |
| D3 | 진화체 = 좀비버섯(HP 20, 드랍 확률 50% 상향, 재진화 없음) | 진화 결과 미명시. 원작 버섯 계열 상위 몹 + "방치 위험 vs 보상 상향" 트레이드오프. HP는 원본 2배로 단순화 |
| D4 | 보스 패턴은 **젠 시작 시마다 1회 롤**: 소환 35% / 회복 25% / 대기 40% | 발동 타이밍 미명시. 젠 단위 게임이므로 모든 시간 축을 젠 틱에 정렬 (별도 타이머 불요, 검증 용이) |
| D5 | 소환체 = 주황버섯 1기 | 소환 대상 미명시(기획서 텍스트 추출에서 대상 이미지 누락). 머쉬맘-버섯 계열 일관성 |
| D6 | 분열 = 본체 HP를 절반(ceil)으로 줄이고, 빈 셀에 `MUSHMOM_SPLIT`(HP = floor(분열 직전 HP / 2), 최소 1) 1기 생성. 분신은 재분열·패턴 없음, 처치 시 메소 50. **스테이지 클리어는 본체 처치 기준** | 분열 결과 미명시. "보스 2기 동시 관리" 복잡도를 피하면서 분열의 위협(추가 개체 + 셀 점유)을 구현 |
| D7 | 메소 100 (80%) / 레드메소 1 (20%) | "메소 또는 레드메소" 양자택일만 명시. 레드메소는 BM 재화(p.20)이므로 희소하게 |
| D8 | 특수 조건 보스 생성은 `BossLogic:ForceSpawnBoss()` 공개 메서드로만 노출, 프로토타입에서는 호출처 없음 | "특수 조건" 정의가 기획서에 없음. 훅만 두어 확장 대비 |
| D9 | 디졸브 0.5초, 등장 = in / 처치 = out | 연출 시간 미명시 |
| D10 | 처치 exp 값 | 경험치 테이블은 p.14(시스템 #4) 소관이나 per-kill exp가 미명시 → 잠정값. MASTER_PLAN에서 시스템 #4와 합의 시 이 값이 조정될 수 있음 |
| D11 | 보스는 보드 1셀 점유, 시각 스케일 1.5× | 배치 예시 이미지상 크기 미정량. 셀 점유 수학 단순화를 위해 1셀, 위압감은 Transform.Scale로 |
| D12 | 진화/증식/분열 롤은 `zenAge == 10` 도달 시 **1회만** (이후 젠에서 재롤 없음. 단 보스 분열은 100% 발동이라 재롤 개념 없음) | "10젠 안에 처치 못할 시" 문구를 1회 판정으로 해석. 매 젠 재롤은 방치 시 폭주 위험 |
| D13 | 보스 스폰 셀 = 빈 셀 중 보드 중심에 가장 가까운 셀. 빈 셀이 없으면 다음 젠으로 이월 | 미명시. 중앙 등장이 연출상 자연스러움 |

---

## 3. 몬스터 `.model` 구조

ARCHITECTURE.md §1 확정: **Body/Movement 없음** (보드 정적 배치, 이동은 없고 위치는 스크립트가 설정). `TileMapMode=0`(MapleTile)이지만 물리 이동이 없으므로 LEA-3004 무관. 커스텀 데미지 시스템이므로 `HitComponent`/`AttackComponent`/`DamageSkinSpawnerComponent`/`StateComponent` **전부 미사용** (monster.md의 Pattern A/B 11컴포넌트 구성을 따르지 않는 의도적 이탈 — 엔진 전투 파이프라인 자체를 쓰지 않기 때문).

4종 모델 공통 구성 (ModelBuilder 경유, `RootDesk/MyDesk/Models/Monsters/` 저장):

| 컴포넌트 | 역할 | 핵심 값 |
|---|---|---|
| `MOD.Core.TransformComponent` | 셀 좌표 → 월드 위치 (BoardLogic 변환값을 스폰 시 지정) | 보스만 Scale 1.5 [D11] |
| `MOD.Core.SpriteRendererComponent` | 외형. **`SpriteRUID` 빈 문자열 금지** | `SortingLayer="MapLayer0"`, `OrderInLayer=2` |
| `MOD.Core.PixelRendererComponent` | HP Bar (§5). 네이티브 컴포넌트라 `.model` 직접 포함이 가장 안정 (hp-gauge.md) | SortingLayer/OrderInLayer는 클라 런타임 설정 |
| `script.MonsterUnit` | @Sync HP/표시 상태, HP Bar 갱신, 디졸브 연출 | §4.3 |

- 모델 EntryKey: `orangemushroom` / `stonegolem` / `zombiemushroom` / `mushmom` (분신은 `mushmom` 모델 재사용 + 스폰 시 Scale 0.9 / MaxHp 주입 [D6] — 별도 모델 불요).
- `script.MonsterUnit`은 `.mlua` 작성 → Maker refresh로 `.codeblock` 생성 → 그 후 `.model`에 포함 (model.md §6 순서).
- 스프라이트 클립은 stand(idle) 1종만 필수. 이동이 없으므로 move/attack 클립 불요. die 연출은 디졸브가 대체 [D9].
- 좌표: 1 world unit = 100px. 셀 크기 0.8, 보드 중심 (0, 0.3), 7×7 (ARCHITECTURE.md §1). 셀↔월드 변환은 **BoardLogic 단일 소스** — 본 시스템은 절대 자체 변환식을 두지 않는다.

---

## 4. 파일 매니페스트

구현 단계에서 생성할 파일 (본 스펙 단계에서는 생성하지 않음). `.mlua` 작성 전 `msw-scripting/SKILL.md` + `verify-checklist.md` 전문 Read 필수 (ARCHITECTURE.md §4-3).

### 4.1 `.mlua` — Logic (서버 권위)

| 파일 | 종류 | ExecSpace | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Monsters/MonsterBalance.mlua` | `@Logic` | 메서드 없음 (상수 property + Get 메서드) | §2 밸런스 테이블 단일 소스. `GetTypeData(typeId)` 제공 |
| `RootDesk/MyDesk/Zengard/Monsters/MonsterLogic.mlua` | `@Logic` | 상태 변경 메서드 전부 `@ExecSpace("ServerOnly")` | 몬스터 레지스트리(monsterId→{typeId, cell, hp, zenAge, isDead, entityRef}), 스폰/처치/드랍 롤, 젠 에이징, 진화/증식 처리, `ApplyDamage` 공개 API |
| `RootDesk/MyDesk/Zengard/Monsters/BossLogic.mlua` | `@Logic` | `@ExecSpace("ServerOnly")` | 보스 스폰(20젠 자동 + `ForceSpawnBoss` 훅), 젠당 패턴 롤(소환/회복/대기), 분열, 보스 처치 → `BossKilledEvent`. HP 관리 자체는 MonsterLogic 레지스트리에 위임 (보스도 몬스터 1종) |

> 셋 다 월드 세션 전체 생존이 맞는 전역 상태이므로 `@Logic` (스테이지 재입장 시 `ResetForStage()`로 명시 초기화 — `@Logic`은 맵 전환에도 살아남으므로 상태 리셋 메서드가 필수).

### 4.2 `.mlua` — Component

| 파일 | 종류 | ExecSpace | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Monsters/MonsterUnit.mlua` | `@Component` (몬스터 엔티티 부착) | `@Sync property number Hp/MaxHp`, `@Sync property boolean IsDead`. HP Bar/디졸브 메서드는 `@ExecSpace("ClientOnly")`, `OnUpdate`는 ExecSpace 미지정 + `IsClient()` 분기 (hp-gauge.md Lazy Init 패턴) | 표시 전담: PixelRenderer HP Bar 초기화/갱신, 등장/처치 디졸브, OnSyncProperty로 HP 변화 반영. **게임 판정 로직 없음** (판정은 전부 MonsterLogic) |

### 4.3 `.mlua` — Event 정의

| 파일 | 종류 | 발행 주체 |
|---|---|---|
| `RootDesk/MyDesk/Zengard/Events/MonsterKilledEvent.mlua` | `@Event` | MonsterLogic |
| `RootDesk/MyDesk/Zengard/Events/MonsterEvolvedEvent.mlua` | `@Event` | MonsterLogic |
| `RootDesk/MyDesk/Zengard/Events/BossSpawnedEvent.mlua` | `@Event` | BossLogic |
| `RootDesk/MyDesk/Zengard/Events/BossKilledEvent.mlua` | `@Event` | BossLogic |

> 이벤트 최종 명칭은 MASTER_PLAN.md가 단일 진실 (ARCHITECTURE.md §5). 위는 잠정 합의안 (`ZenStartedEvent`/`MonsterKilledEvent`/`BossSpawnedEvent`는 §5 잠정 목록과 일치, `MonsterEvolvedEvent`/`BossKilledEvent`는 본 스펙이 추가 제안 — 감독관 확정 필요).

### 4.4 `.model`

| 파일 | EntryKey | 내용 |
|---|---|---|
| `RootDesk/MyDesk/Models/Monsters/OrangeMushroom.model` | `orangemushroom` | §3 공통 구성 |
| `RootDesk/MyDesk/Models/Monsters/StoneGolem.model` | `stonegolem` | §3 공통 구성 |
| `RootDesk/MyDesk/Models/Monsters/ZombieMushroom.model` | `zombiemushroom` | §3 공통 구성 (진화체) |
| `RootDesk/MyDesk/Models/Monsters/Mushmom.model` | `mushmom` | §3 공통 구성 + Scale 1.5 |

### 4.5 `.ui`

**없음.** HP Bar는 월드 공간 PixelRenderer(§5)로 처리. 보스 전용 화면 상단 HP Bar 등 HUD 요소는 시스템 #8(ui-modes-stages) 소관 — 본 시스템은 @Sync된 Hp/MaxHp만 제공.

---

## 5. HP Bar — 셀 하단 Bar 형태 (R7)

hp-gauge.md의 `PixelRendererComponent` + Lazy Init 패턴을 그대로 채택한다.

- **버퍼**: `ResetWithColor(16, 3, ...)` — 논리 16×3 픽셀 (권장 상한 내).
- **갱신 흐름**: 서버 `MonsterLogic:ApplyDamage` → `MonsterUnit.Hp`(@Sync) 변경 → 클라 `OnSyncProperty("Hp")` → `UpdateHealthBar()`.
- **색상**: HP 비율 >60% 녹색 / 31~60% 노랑 / ≤30% 빨강 (hp-gauge.md 기준 채택).
- **Lazy Init**: 동적 스폰 엔티티는 클라에서 PixelRenderer 준비 시점이 늦으므로 `OnUpdate`에서 `IsClient()` 분기 + 초기화 플래그 체크 (OnBeginPlay 초기화 금지).
- **SortingLayer**: 런타임에 `"MapLayer0"`, `OrderInLayer=10` (몬스터 스프라이트 2보다 위).
- **[설계 결정 D14] 셀 하단 배치 방법**: PixelRenderer는 엔티티 Transform 위치에 겹쳐 그려지며 오프셋 불가, 자식 엔티티 분리는 불안정 (hp-gauge.md 제약). 따라서 **몬스터 엔티티 원점을 셀 하단-중앙**(`cellCenter + (0, -cellSize/2 + 0.06)`)에 두고, 스프라이트는 발 기준 피벗(메이플 몹 stand 클립 기본)으로 위로 자라게 한다 → Bar가 자연히 셀 하단에 위치. 이 오프셋 적용 좌표는 BoardLogic이 `CellToWorld(col, row, anchor)` 형태로 제공하거나, MonsterLogic이 `CellToWorld` 결과에 로컬 상수 오프셋을 더한다 (MASTER_PLAN에서 택1 — 전자 권장).
- **리스크**: Transform.Scale이 스프라이트와 PixelRenderer에 공유되므로 Bar의 화면 크기는 구현 단계에서 시각 캘리브레이션 필요 (§9 참조). 보스(Scale 1.5)는 Bar도 1.5배 — 보스 위압감 표현으로 수용 [D11].

---

## 6. 등장/처치 디졸브 (R8)

- **주 구현**: 클라이언트 전용 연출. `MonsterUnit`의 ClientOnly 메서드에서 `DISSOLVE_DURATION = 0.5s` [D9] 동안 진행.
  - 1순위: 디졸브 셰이더 material (`msw-general/references/material.md`의 dissolve 카테고리, `_MaterialService:ChangeMaterialProperty` — ClientOnly 규칙 준수). 구현 턴에 material.md 전문 Read + MCP retriever로 셰이더 프로퍼티 확정.
  - 폴백: `SpriteRendererComponent.Color`의 알파를 0→1(등장) / 1→0(처치) 트윈. material 확보 실패 시에도 기획 의도("디졸브 형태") 최소 충족.
- **트리거**:
  - 등장: 스폰 직후 서버가 `IsDead=false` 상태로 생성 → 클라 `OnUpdate` 첫 초기화 시 in-디졸브 자동 재생.
  - 처치: `IsDead`(@Sync) true 전환 → 클라 `OnSyncProperty("IsDead")` → out-디졸브 → 서버는 `DISSOLVE_DURATION + 0.1s` 후 `Entity:Destroy()` (연출 시간 확보, monster.md §8의 DestroyDelay 패턴 준용).
- **진화/분열 교체 연출**: 구 엔티티 out-디졸브 + 신 엔티티 in-디졸브 동시 재생 [D9].

---

## 7. API / 이벤트 계약

### 7.1 노출 API (다른 시스템이 호출)

```text
-- MonsterLogic (@Logic, 호출은 서버 측에서만)
@ExecSpace("ServerOnly") method string SpawnMonster(string typeId, integer col, integer row)
    -- 반환: monsterId. 셀 점유 등록 + 엔티티 스폰 + in-디졸브. 호출자: WaveLogic(시스템 #1)
@ExecSpace("ServerOnly") method void ApplyDamage(string monsterId, number damage, string attackerUserId)
    -- 호출자: jobs-and-combat(시스템 #2). HP 차감 → 0 이하면 처치 플로우(§8.3)
@ExecSpace("ServerOnly") method table GetMonsterAt(integer col, integer row)   -- nil 또는 {monsterId, typeId, hp, isBoss}
@ExecSpace("ServerOnly") method integer GetAliveMonsterCount()                 -- 실패 임계치 판정용 (시스템 #1)
@ExecSpace("ServerOnly") method table GetAliveMonsters()                       -- 타게팅/범위 판정용 (시스템 #2)
@ExecSpace("ServerOnly") method void ResetForStage()                           -- 스테이지 입장 시 전체 초기화 (ZengardGameLogic)

-- BossLogic (@Logic)
@ExecSpace("ServerOnly") method void ForceSpawnBoss()                          -- 특수 조건 훅 [D8]
@ExecSpace("ServerOnly") method boolean IsBossAlive()
```

### 7.2 발행 이벤트

```text
MonsterKilledEvent { string monsterId, string typeId, integer col, integer row,
                     string attackerUserId, integer exp, table drops }  -- drops: {{itemId, count}, ...}
MonsterEvolvedEvent { string oldMonsterId, string newMonsterId, string newTypeId, integer col, integer row }
BossSpawnedEvent   { string monsterId, string typeId, integer col, integer row }
BossKilledEvent    { string monsterId, string attackerUserId, table drops }
```

- 소비처: `MonsterKilledEvent` → 시스템 #4(exp), #6(drops/loot), #1(누적 카운트 갱신). `MonsterEvolvedEvent` → 시스템 #2(타겟 무효화 후 재타게팅). `BossKilledEvent` → `ZengardGameLogic`(스테이지 클리어 전이).
- **드랍 아이템의 인벤토리 반영/연출은 시스템 #6 소관** — 본 시스템은 drops payload 산출까지만.

### 7.3 소비 이벤트 / 의존 외부 계약

```text
-- 소비 이벤트 (시스템 #1 발행)
ZenStartedEvent { integer zenNumber }
    -- 처리 순서(§8.2): 에이징 → 진화/증식 롤 → 보스 패턴 롤 → 보스 자동 스폰 체크

-- 의존 API (시스템 #1 BoardLogic — 셀↔월드 단일 변환 소스)
BoardLogic:CellToWorld(col, row) -> Vector3          -- §5 D14의 하단 anchor 변형 포함 여부는 MASTER_PLAN 확정
BoardLogic:GetRandomEmptyCell() -> (col, row) | nil
BoardLogic:GetAdjacentEmptyCells(col, row) -> table  -- 상하좌우 4방 [D15]
BoardLogic:OccupyCell(col, row, occupantId) -> boolean
BoardLogic:FreeCell(col, row)
BoardLogic:GetEmptyCellNearestCenter() -> (col, row) | nil   -- 보스 스폰용 [D13]

-- 의존 환경
map/map01.map 의 맵 엔티티 (SpawnByModelId의 parent — nil 금지, _EntityService:GetEntityByPath 또는 호출 체인으로 전달)
```

---

## 8. 핵심 알고리즘 의사코드

### 8.1 스폰 (셀 점유 포함)

```text
SpawnMonster(typeId, col, row):                         # ServerOnly
    data = MonsterBalance:GetTypeData(typeId)
    if not BoardLogic:OccupyCell(col, row, newId): return nil   # 선점 실패 = 호출자 버그, log 후 중단
    pos = BoardLogic:CellToWorld(col, row) + BOTTOM_ANCHOR_OFFSET   # §5 D14
    entity = _SpawnService:SpawnByModelId(data.modelId, typeId.."_"..newId, pos, mapEntity)  # parent ≠ nil
    if entity == nil: BoardLogic:FreeCell(col, row); log_error; return nil
    unit = entity.MonsterUnit;  unit.MaxHp = data.maxHp;  unit.Hp = data.maxHp
    registry[newId] = { typeId, col, row, hp=data.maxHp, zenAge=0, isDead=false, entity }
    log("monster spawned: "..typeId)                    # ARCHITECTURE §4-9 체크포인트
    return newId
```

### 8.2 젠 틱 처리 (ZenStartedEvent 핸들러 — 처리 순서가 계약)

```text
OnZenStarted(zenNumber):                                # ServerOnly
    # 1) 에이징: 이번 젠에 스폰될 신규 몬스터는 제외 (핸들러가 WaveLogic의 신규 배치보다 먼저 실행되도록
    #    순서 보장 불가 시, registry에 spawnZen 기록 후 zenAge = zenNumber - spawnZen 으로 계산) [D16]
    for m in registry where not m.isDead and not m.isBoss:
        m.zenAge += 1
        if m.zenAge == EVOLVE_MULTIPLY_ZEN_AGE and not m.rolled:   # 1회 판정 [D12]
            m.rolled = true
            if m.typeId == ORANGE_MUSHROOM and Random() < EVOLVE_PROB:  Evolve(m)
            elif m.typeId == STONE_GOLEM  and Random() < MULTIPLY_PROB: Multiply(m)
    # 2) 보스
    if boss alive:
        boss.zenAge += 1
        if boss.zenAge == BOSS_SPLIT_ZEN_AGE and not boss.split: SplitBoss(boss)   # 확정 발동 R14
        else: RollBossPattern(boss)                                                # §8.5
    elif zenNumber >= BOSS_AUTO_SPAWN_ZEN and not bossDefeated and not bossSpawnPending:
        TrySpawnBoss()                                  # 빈 셀 없으면 다음 젠 이월 [D13]
```

### 8.3 데미지/처치/드랍 (동시 처치 가드 포함)

```text
ApplyDamage(monsterId, damage, attackerUserId):         # ServerOnly
    m = registry[monsterId]
    if m == nil or m.isDead: return                     # 동시 처치: 선착 1회만 유효 (§9-2)
    m.hp = max(0, m.hp - damage);  m.entity.MonsterUnit.Hp = m.hp   # @Sync → 클라 HP Bar
    if m.hp > 0: return
    m.isDead = true;  m.entity.MonsterUnit.IsDead = true            # 클라 out-디졸브 트리거
    BoardLogic:FreeCell(m.col, m.row)
    drops = RollDrops(m.typeId)                          # 테이블 §2.1 확률
    if m.isBoss: emit BossKilledEvent{...}  else: emit MonsterKilledEvent{..., drops}
    schedule Destroy(m.entity) after DISSOLVE_DURATION + 0.1
    log("monster killed: "..m.typeId)
```

### 8.4 진화 / 증식 / 분열 — 셀 점유 규칙

```text
Evolve(m):                                # 제자리 교체 — 셀 점유 유지 (빈 셀 불필요)
    KillSilently(m, keepCellOccupied=true)             # 이벤트 미발행, out-디졸브만
    newId = SpawnMonsterInOccupiedCell(ZOMBIE_MUSHROOM, m.col, m.row)  # OccupyCell 재호출 없이 점유 승계
    emit MonsterEvolvedEvent{m.id, newId, ...}

Multiply(m):                              # 인접 우선 → 전체 빈 셀 폴백 → 없으면 스킵 [D15]
    cells = BoardLogic:GetAdjacentEmptyCells(m.col, m.row)
    cell = cells nonempty ? RandomPick(cells) : BoardLogic:GetRandomEmptyCell()
    if cell == nil: log("multiply skipped: board full"); return     # §9-1
    SpawnMonster(m.typeId, cell)

SplitBoss(boss):                          # [D6]
    cloneHp = max(1, floor(boss.hp / 2));  boss.hp = ceil(boss.hp / 2)  # @Sync 갱신
    cell = adjacent-first 빈 셀 (Multiply와 동일 규칙)
    if cell == nil: log("split skipped: board full"); return            # 본체 HP 절반은 그대로 적용 [D6]
    id = SpawnMonster(MUSHMOM_SPLIT, cell);  registry[id].hp = cloneHp; sync
```

### 8.5 보스 패턴 추첨 (젠당 1회 [D4])

```text
RollBossPattern(boss):
    r = Random()                                        # _UtilLogic:RandomDouble()
    if r < BOSS_PATTERN_SUMMON_PROB:                    # 0.35 소환
        cell = BoardLogic:GetRandomEmptyCell()
        if cell: SpawnMonster(ORANGE_MUSHROOM, cell)    # [D5]; 빈 셀 없으면 대기로 전환
    elif r < SUMMON_PROB + HEAL_PROB:                   # 0.25 회복
        boss.hp = min(boss.maxHp, boss.hp + boss.maxHp * BOSS_HEAL_RATIO)   # 10% [기획서]
    # else 0.40 대기 (no-op)
    log("boss pattern: "..result)
```

---

## 9. 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| 1 | **보드 가득 참** — 증식/분열/소환 대상 빈 셀 없음 | 해당 행동 스킵 + log. 진화는 제자리 교체라 영향 없음. 분열 시 본체 HP 절반화는 그대로 적용 [D6]. 몬스터 수 임계치 실패 판정은 시스템 #1이 `GetAliveMonsterCount()`로 수행 |
| 2 | **동시 처치** — 같은 프레임에 복수 `ApplyDamage` | `isDead` 가드로 선착 1회만 처치 처리. 이벤트/드랍 중복 발행 없음 (§8.3) |
| 3 | **진화 순간 타겟 소실** — 시스템 #2가 구 monsterId를 계속 공격 | `registry[oldId]` 제거 → `ApplyDamage`가 nil 가드로 무시. `MonsterEvolvedEvent`로 재타게팅 통지 |
| 4 | **20젠 도달 시 빈 셀 없음** (보스 스폰 불가) | `bossSpawnPending` 플래그로 다음 젠 이월, 매 젠 재시도 [D13] |
| 5 | **분신만 남고 본체 처치됨** | 클리어는 본체 `BossKilledEvent` 기준 [D6] — 분신은 잔존 몬스터로 취급되어 스테이지 종료 시 일괄 정리(`ResetForStage`) |
| 6 | **처치와 젠 틱 경합** — 죽는 프레임에 진화 롤 | 젠 틱 루프가 `isDead` 제외 순회 → 사망 개체는 롤 대상 아님 |
| 7 | **디졸브 중 재공격** | `isDead=true` 시점에 레지스트리상 즉시 사망 — 연출 중 엔티티는 판정 제외 |
| 8 | **스테이지 재입장 시 @Logic 잔존 상태** | `@Logic`은 맵 전환에도 생존 (OnMapEnter 미발화) → `ResetForStage()`에서 레지스트리/플래그/타이머 전부 명시 초기화. 누락 시 이전 스테이지 몬스터 유령 데이터 발생 |
| 9 | **드랍 아이템 소실** (수령 주체 이탈 등) | drops는 이벤트 payload로 1회 발행 — 영속화/유실 처리는 시스템 #6 계약. 본 시스템은 재발행하지 않음 |
| 10 | **SpawnByModelId nil 반환** (모델 미등록/EntryKey 오타) | nil 가드 + `FreeCell` 롤백 + log_error (§8.1). parent에 반드시 맵 엔티티 전달 (nil 금지) |
| 11 | **zenAge 기산점 모호** — 스폰 젠과 핸들러 실행 순서 | `spawnZen` 기록 후 차분 계산으로 순서 비의존화 [D16] |

---

## 10. 필요 리소스 (msw-search 검색 키워드 — 구현 턴에 RUID 확정, 실패 시 "RUID 필요" 마킹)

| 용도 | 종류 | 검색 키워드 |
|---|---|---|
| 주황버섯 stand 클립 | sprite/animationclip (mob) | `주황버섯`, `Orange Mushroom` |
| 스톤골렘 stand 클립 | sprite/animationclip (mob) | `스톤골렘`, `Stone Golem` |
| 좀비버섯 stand 클립 (진화체) | sprite/animationclip (mob) | `좀비버섯`, `Zombie Mushroom` (폴백: `뿔버섯` Horny Mushroom) |
| 머쉬맘 stand 클립 (보스) | sprite/animationclip (mob) | `머쉬맘`, `Mushmom` |
| 처치 사운드 | sound | `mob die`, `몬스터 사망` |
| 보스 등장 사운드 | sound | `boss appear`, `보스 등장` |
| 소환/회복 이펙트 사운드 | sound | `summon`, `heal` |
| 디졸브 material | shader/material | material.md dissolve 카테고리 (MCP retriever로 확정) |

---

## 11. 구현 순서 권고 (참고)

1. `MonsterBalance.mlua` → `MonsterUnit.mlua` → refresh (`.codeblock` 생성)
2. msw-search로 RUID 4종 확보 → `.model` 4종 (ModelBuilder, builder-protocol.md 선독)
3. `MonsterLogic.mlua` + Event 4종 → `BossLogic.mlua`
4. BoardLogic 계약(§7.3) 충족 확인 후 통합 — 오케스트레이터가 refresh/play/logs 수행 (에이전트 maker_* 호출 금지)
