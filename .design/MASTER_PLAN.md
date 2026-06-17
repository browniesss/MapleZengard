# MASTER_PLAN — 메이플 젠가드 프로토타입 통합 마스터플랜

> **이 문서가 단일 진실(Single Source of Truth)이다.** 8개 시스템 스펙(`.design/specs/*.md`)과 본 문서가 충돌하면 **본 문서가 우선**한다 (ARCHITECTURE.md §5).
> ARCHITECTURE.md §1 플랫폼 확정 사항은 변경하지 않았다: `map01.map` / `TileMapMode=0` 유지, 월드 엔티티 보드, 7×7 / 셀 0.8 / 중심 (0,0.3), 몬스터 Body 없음, DefaultPlayer Rigidbody/PlayerController Enable=false, 커스텀 데미지 시스템, 고정 카메라, `_DataStorageService` 영속화, cell↔world 변환은 BoardLogic 단일 소스.
> 구현 에이전트는 **자기 워커 패키지의 파일만** 만지고, 계약(이름/시그니처/이벤트/모델 id)은 본 문서의 표기만 따른다.

---

## 0. 충돌 해소 결정 레지스트리 (C-1 ~ C-32)

스펙 간 이름 충돌·중복 기능·순환 의존을 아래와 같이 확정한다. 각 결정은 이후 섹션의 계약 표에 이미 반영되어 있다.

| # | 충돌 | 결정 |
|---|---|---|
| C-1 | `GrowthLogic.mlua` 이름 중복 — #4(레벨/선택지/전직)와 #6(내실)이 같은 경로에 같은 이름 | #4가 `Zengard/Growth/GrowthLogic.mlua` 유지. #6의 내실은 **`Zengard/Meta/MetaGrowthLogic.mlua`** + `MetaGrowthBalance.mlua`로 개명, 경로 `Zengard/Meta/`. 내실 팝업은 `ui/MetaGrowthPopup.ui` + `UIMetaGrowthPopupLogic.mlua` |
| C-2 | 선택지 카드 팝업 UI 이중 소유 — #4 `ui/ChoicePopup.ui`+Controller vs #8 `ui/ChoicePopupGroup.ui`+`UIChoicePopupLogic` | **#8 단일 소유** (`ChoicePopupGroup.ui` + `UIChoicePopupLogic`). #4의 `ChoicePopup.ui`/`ChoicePopupController`는 만들지 않는다. #4 `GrowthLogic`은 Client RPC로 카드 데이터를 내려보내고 클라에서 `_UIChoicePopupLogic:ShowChoices(cards, rerollLeft)` 호출. 전직 버튼/확장 버튼/리롤 버튼은 ChoicePopupGroup 내부에 배치 |
| C-3 | 몬스터 스폰 권위 이원화 — #1 WaveLogic이 `SpawnByModelId` 직접 호출 vs #7 MonsterLogic 레지스트리 | **MonsterLogic이 유일한 스폰/HP/처치 권위.** WaveLogic은 셀 추첨·종류 가중 추첨만 하고 `_MonsterLogic:SpawnMonster(typeId, col, row)`를 호출한다. WaveLogic의 `SpawnByModelId` 직접 호출 금지. 점유 그리드는 BoardLogic, 몬스터 레지스트리는 MonsterLogic — 두 자료구조는 MonsterLogic이 스폰/처치/진화 시 동기화 책임 |
| C-4 | `MonsterKilledEvent` 페이로드 4안 (#1/#4/#6/#7) | 통합: `{ monsterId, typeId, col, row, attackerUserId, exp, isBoss, drops }` (§3). `killerUserId`→`attackerUserId`, `monsterKey`→`typeId`로 표기 통일. `worldPos`는 수신 측이 `_BoardLogic:CellToWorld(col,row)`로 유도 |
| C-5 | 몬스터 exp 테이블 상이 — #4 T2 (2/3/4/1/0) vs #7 D10 (1/2/2/5/20) | **단일 확정 (MonsterBalance 소유)**: 주황버섯 2 / 스톤골렘 4 / 좀비버섯 4 / 머쉬맘 분신 5 / 머쉬맘 본체 0 (보스 보상은 클리어 보너스로 대체). #4의 경험치 곡선(D1)이 이 값 기준으로 튜닝됨 |
| C-6 | 실패 임계치 30(#1) vs 40(#8 D2, 스테이지별 36~40) | **StageCatalogLogic의 스테이지별 `failThreshold`가 단일 소스** (40/40/40/40/38/36). `BoardConfig.MONSTER_LIMIT` 상수는 만들지 않는다. WaveLogic은 `_StageCatalogLogic:GetStageConfig(stageId).failThreshold`를 읽는다 |
| C-7 | 스테이지 설정 테이블 중복 — #1 `BoardConfig.STAGE_CONFIG` vs #8 `StageCatalogLogic.STAGES` | **StageCatalogLogic 단일 소스** (stageId `"1-1"`~`"1-6"` 포맷 확정). BoardConfig에는 보드 기하 상수(GRID/CELL_SIZE/BOARD_CENTER)와 젠 사이클 상수(쿨다운/재배치 플래그)만 남긴다. #1의 `"henesys_1"` stageId 폐기 |
| C-8 | HP Bar 이중 구현 — #7 월드 PixelRenderer 16×3 vs #8 Screen-UI 풀 60개 | **#8 `UIHpBarManagerLogic` 단일 구현.** 몬스터 `.model`에서 `PixelRendererComponent` 제거. `MonsterUnit`(클라)이 `OnSyncProperty` 시점에 `_UIHpBarManagerLogic:Attach/UpdateHp/Release`, 보스는 `AttachBoss` 호출. #7 D14(셀 하단 anchor 오프셋)는 불요 — 몬스터 원점은 셀 중심, Bar 오프셋은 `HPBAR_OFFSET_Y=-0.45`로 처리 |
| C-9 | 전투 트리거 방식 (#2 R1: 이벤트 vs 직접 호출) | **직접 호출 확정.** WaveLogic이 젠 파이프라인(§5)에서 배치 완료 후 `_CombatLogic:ExecuteZenCombat(zenIndex)`를 직접 호출. `ZenStartedEvent`는 배치 완료 **후** 발행을 보장하며 연출/패시브 소비자(#8 HUD 등) 전용 |
| C-10 | 직업 선택 UI 중복 — #2 `JobSelectPopup.ui`(입장 직후) vs #8 StageSelect 내 직업+스킬 선택 | **StageSelectGroup에서 사전 선택으로 통합.** `RequestEnterStage(mode, stageId, jobId, skillId)`로 전달 → `ZengardGameLogic.StartStage`가 `_JobLogic:SetJob` + `_SkillInventoryLogic:GrantSkill` 적용. `ui/JobSelectPopup.ui`/`JobSelectPopupController`는 만들지 않는다. #4 D18(최초 2지선다는 노출 카운터 불포함)과 정합 — 최초 스킬 2택은 StageSelect의 스킬 2택이 담당 |
| C-11 | 자동/수동 토글 중복 — #2 CombatControlHUD vs #8 GameHUD | **CombatControlHUD 단일 소유** (토글+방향 4버튼+스킬 순서+도적 타겟). GameHUDGroup에서 자동/수동 토글 제거, #8의 `CombatLogic:SetAutoMode` 의존 삭제 — 전부 `_CombatLogic:RequestSetCombatConfig` 경유 |
| C-12 | 스킬 시전 계약 — #2 `SkillSpec{damageMultiplier,hitCount,fxKey}` vs #3 스킬 데이터 스키마 | **#3 스키마 채택, SkillSpec 폐기.** CombatLogic은 `_SkillInventoryLogic:GetSkillOrder(ownerId)` → skillId 목록, `_SkillDataLogic:GetSkillData(skillId)` → shape/range/hits/linePierce/effectRuid, 데미지는 `_SkillStatLogic:ComputeHitDamage` 단일 경로. **#2의 직업 baseDamage(4/3/2/5) 폐기** — 데미지는 스킬 데이터가 전담. `AttackPatternLogic`은 #3 §7.4의 5종 shape 규약을 구현 (`ResolveSkillCells`) |
| C-13 | 동료 공격 루프 — #5 자체 `ATTACK_INTERVAL` 틱 vs #2 젠 시퀀스 | **젠 시퀀스 통합.** CompanionLogic은 합류 시 `_CombatLogic:RegisterCombatUnit(entity, companionId)` 호출, 자체 타이머 없음. 시퀀스 처리 순서: 본캐 먼저 → 동료 companionId 오름차순 (동시 처치 결정성, #5 리스크 3 해소). `_CombatLogic:ExecuteAttack(...)` 단발 API와 `_PlayerStatLogic:GetBaseStats`는 폐기 — 동료 데미지는 companionId 키의 스킬 데이터로 자연 산출(장비/내실 배수는 userId 키라 자동 제외 = D5 "장비 효과 제외" 충족) |
| C-14 | jobId 표기 `rogue`(#2) vs `thief`(#3/#4) | **`thief`** (skillId 접두사와 일치). 직업 키 4종: `warrior` / `archer` / `mage` / `thief` |
| C-15 | BoardLogic API 명칭 분기 (`OccupyCell/FreeCell/ReleaseCell` vs `TryOccupy/Release`) | #1 안으로 통일: `TryOccupy / Release / ReplaceOccupant / GetRandomEmptyCells(count)`. #5/#7이 요구한 `GetAdjacentEmptyCells(col,row)`, `GetEmptyCellNearestCenter()` 추가. 단수형 `GetRandomEmptyCell`은 `GetRandomEmptyCells(1)` 사용 |
| C-16 | `GetMonsterAt` 소유 — #2가 BoardLogic에 요구 | **MonsterLogic 소유** (레지스트리 보유자). `_MonsterLogic:GetMonsterAt(col,row)`. 유닛 셀 조회는 `_BoardLogic:WorldToCell(entity 위치)` |
| C-17 | 데미지 진입점 — #2 `MonsterUnit:ApplyDamage` vs #7 `MonsterLogic:ApplyDamage` | **`_MonsterLogic:ApplyDamage(monsterId, damage, attackerUserId)` 단일 권위.** MonsterUnit은 @Sync 표시(HP Bar 위임/디졸브) 전용, 판정 로직 없음 |
| C-18 | `StageStartedEvent` 신설 요청 (#6) vs API 호출 방식 (#4) | **둘 다 채택.** ZengardGameLogic이 스테이지 시작 시 순서 보장이 필요한 초기화는 **직접 호출**(§5.1 순서), 그 후 `StageStartedEvent{stageId, mode}` 발행 — 패시브 소비자(로그/연출)용 |
| C-19 | `StageEndedEvent` payload — #6 `'clear'|'fail'` vs #8 `"CLEAR"|"FAIL"` | `{ result: "CLEAR"|"FAIL", reason: string, stats: table }` 대문자 확정. #6은 대문자 비교로 맞춘다 |
| C-20 | companion `BEFORE_NAMED_BOSS` 구독 순서 보장 (#5 리스크 4) | 젠 파이프라인(§5.2)에서 WaveLogic이 보스 스폰 **직전에** `_CompanionLogic:OnBossZenImminent(zenIndex)` 직접 호출. `BossPhaseImminentEvent` 신설 불요 |
| C-21 | UI 컨트롤러 패턴 불일치 — #2/#3/#5/#6은 @Component(UI 루트 부착), #8은 @Logic | **전부 `@Logic`(ClientOnly)으로 통일.** `.ui`에 script 컴포넌트를 부착하지 않는다 (DefaultShow=false 그룹 내 OnBeginPlay 미발화 회피 + .mlua→refresh→.ui 부착의 웨이브 의존 제거). UI 엔티티 참조는 UIBuilder `b.write(bind)`의 UUID 주입으로 컨트롤러 @Logic property에 바인딩. **`.ui`와 그 컨트롤러 .mlua는 같은 워커가 같은 웨이브(Wave 3)에서 작성** |
| C-22 | 전직 비용 소유 중첩 — #4 D5 vs #6 `JOB_ADV_LOOT_COST` | 수치 `{3, 5, 8}`은 **GrowthConfig(#4) 단일 정의.** 차감은 `_LootLogic:TrySpendLoot(userId, cost, "job_adv")` 경유 (지갑은 #6) |
| C-23 | 리롤 배선 | RerollLogic 단일 카운터(스테이지당 3회, 배치+선택지 합산). `placement` → `_WaveLogic:ReshufflePlacement()` (신규 ServerOnly API — 몬스터+플레이어+동료 전원 재배치, 동기 완료), `choice` → `_GrowthLogic:RerollCurrentChoices(userId)` + 가드용 `_GrowthLogic:HasOpenChoice(userId)` |
| C-24 | 스테이지 진행도 저장 경로 — #8이 `zengard/progress/{userId}` 키 직접 접근 명시 | **`_PlayerDataLogic:GetSection/SetSection(userId, "progress", json)` 게이트웨이 경유만 허용** (#6 소유). DataStorage 직접 호출은 PlayerDataLogic 외 전 시스템 금지 |
| C-25 | 챌린지 코인 소유 미정 (#8 D4) | PlayerDataLogic `"meta"` 스키마에 `challengeCoin`(초기 3) 추가. API: `GetChallengeCoin / TrySpendChallengeCoin / AddChallengeCoin`. #8의 `BMLogic:GetCoins/SpendCoin/RefundCoin` 표기는 이걸로 치환 |
| C-26 | 마법사 2차 분기(#4 T7)에 필요한 tier-2 스킬 데이터가 #3에 없음 | SkillDataLogic 카탈로그에 **마법사 tier-2 3종만 추가** (파이어 애로우/썬더 볼트/블레스 — §7.4 수치). 타 직업 tier-2+는 프로토타입 범위 외 (전직은 성립하되 신규 스킬 없음 — 기획서 p.12가 마법사 분기만 명시) |
| C-27 | `AttackResolvedEvent` (#2) — 필수 소비자 없음 | **삭제.** 시전 결과는 `log()` 체크포인트로 대체. `AttackSequenceStarted/EndedEvent`만 유지 |
| C-28 | `SkillAcquiredEvent`/`SkillLevelUpEvent` (#3) — 소비자가 자기 HUD뿐 | **삭제.** SkillHUD 갱신은 SkillInventoryLogic의 Client RPC 푸시(`SyncSkillState`)로 일원화. `FusionActivatedEvent`/`SkillFusedEvent`는 유지 (#8 토스트 + HUD 뱃지) |
| C-29 | `skillPoints` 차감 책임 — #4는 `ApplySkillPick` 내부 차감 기대, #3엔 skillPoints 개념 없음 | **GrowthLogic이 소유/차감.** `_SkillChoiceLogic:ApplyChoice(userId, choice)`가 true 반환 시 GrowthLogic이 `skillPoints -= 1` |
| C-30 | 이벤트 파일 위치 분산 (시스템별 하위 폴더) | **전 @Event 파일을 `RootDesk/MyDesk/Zengard/Events/` 플랫 폴더로 통일.** 소유 워커는 발신 시스템 담당자 (§8 파일 소유권 표) |
| C-31 | 선택지 확장 시 장비 확률 — #4 D3 `0.20` vs #6 `0.15` | **`0.15`** (상수 소유자 #6 `EquipmentBalance.CHOICE_EQUIP_CHANCE_EXPANDED` 우선). #4의 `SKILL_WEIGHT_EXPANDED`는 0.85 |
| C-32 | 보스 드랍 — #7 D7 (메소100 80% / 레드메소1 20%) vs #6 (메소20+레드메소1 확정) | **#7 안 채택** (p.20 "메소 **또는** 레드메소"의 직역): 처치 시 80% → 메소 100, 20% → 레드메소 1. 추가로 전리품 3개 확정(#6 `LOOT_DROP_COUNT_BOSS`) + 클리어 보너스 메소 50은 별도 유지 |

추가 소거 항목: #6의 `Models/Effects/LootDropEffect.model`/`MesoDropEffect.model`은 **범위 외**(선택적 폴리시 — 워커 배정 없음, 폴리시 단계 과제로 이연).

---

## 1. 시스템 토폴로지 & 젠 파이프라인 (실행 순서의 단일 진실)

### 1.1 스테이지 시작 시퀀스 (ZengardGameLogic.StartStage — ServerOnly)

```
ModeStageLogic:RequestEnterStage(mode, stageId, jobId, skillId)   -- Server RPC, 입장 검증
  ├─ 검증: 해금 여부, CHALLENGE → _PlayerDataLogic:TrySpendChallengeCoin(1)
  │        STORY/TIME_ATTACK → _EnergyLogic:TryConsumeEnergy(userId, "stage_start")
  └─ _ZengardGameLogic:StartStage(userId, stageId, jobId, skillId, runState)
       1. _BoardLogic:ResetBoard()
       2. _MonsterLogic:ResetForStage()        -- 잔존 엔티티 Destroy 포함
       3. _WaveLogic:ResetWave(stageId)        -- CurrentZen=0, 카운터/쿨다운/IsZenAvailable 초기화
       4. _SkillInventoryLogic:ResetUser(userId) → _SkillFusionLogic/_SkillChoiceLogic 내부 리셋
       5. _GrowthLogic:InitForStage(userId, jobId)   -- Lv.1, exp 0, 노출 카운터 0
       6. _EquipmentLogic:ClearRunState(userId), _LootLogic:ResetRun(userId), _RerollLogic:ResetRun(userId)
       7. _CompanionLogic:ResetRun()
       8. _JobLogic:SetJob(userId, jobId)  → emit JobSelectedEvent
       9. _SkillInventoryLogic:GrantSkill(userId, skillId)   -- StageSelect에서 고른 1차 스킬 (C-10)
      10. 플레이어 보드 말 초기 배치 (_WaveLogic:RepositionPlayer())
      11. state = InStage; emit StageStartedEvent{stageId, mode}   -- 패시브 소비자용 (C-18)
```

### 1.2 젠 사이클 (WaveLogic.StartZen — ServerOnly; **이 순서가 계약**)

```
RequestZen() [Server] 가드: IsInStage → IsZenAvailable → processingZen 재진입 → 쿨다운 1.0s (delta 누적)
StartZen():
  1. CurrentZen += 1;  isBossZen = (CurrentZen >= cfg.bossZen) or forcedBoss
  2. _MonsterLogic:OnZenAging(CurrentZen)
       -- 기존 몬스터 에이징(spawnZen 차분 계산), 진화/증식 롤(modifiers 반영),
       -- 보스 생존 시: 분열 체크(zenAge==10 확정) → 아니면 패턴 롤(소환/회복/대기)
  3. if isBossZen:
       IsZenAvailable = false
       _CompanionLogic:OnBossZenImminent(CurrentZen)        -- BEFORE_NAMED_BOSS 트리거 (C-20)
       _BossLogic:TrySpawnBoss()                            -- 중심 인접 빈 셀, 실패 시 다음 젠 이월
     else:
       spawned = SpawnMonsters(cfg.monstersPerZen)          -- 셀 추첨 + 가중 추첨 → _MonsterLogic:SpawnMonster (C-3)
       if cfg.repositionMonstersOnZen: ReshuffleMonsters()  -- 기본 false (p.8/p.9 차이 플래그)
  4. RepositionPlayer();  _CompanionLogic:RepositionAll()   -- 캐릭터/동료 항상 랜덤 재배치
  5. MonsterCount = _MonsterLogic:GetAliveMonsterCount()    -- @Sync 갱신 (증식/소환 포함 단일 재계산)
  6. emit ZenStartedEvent{CurrentZen, isBossZen, spawned}   -- ★배치 완료 후 발행 보장 (C-9)
  7. if not isBossZen and MonsterCount >= cfg.failThreshold:
       _ZengardGameLogic:NotifyStageFailed("monster_overflow"); return
  8. _CombatLogic:ExecuteZenCombat(CurrentZen)              -- 직접 호출 (C-9)
  9. (CombatLogic이 시퀀스 종료 시 AttackSequenceEndedEvent 발행 → WaveLogic이 MonsterCount 재동기화)
```

### 1.3 처치 → 성장/드랍 플로우

```
CombatLogic CastSkill → _MonsterLogic:ApplyDamage(monsterId, dmg, attackerUserId)   (C-17)
  └─ hp ≤ 0: isDead 처리, _BoardLogic:Release(col,row,monsterId), 드랍 롤
       ├─ 일반: emit MonsterKilledEvent{...}  (C-4)
       │    ├─ WaveLogic: MonsterCount 감소 로그
       │    ├─ GrowthLogic: AddExp(attackerUserId, exp × (1+expGainMul)) → 레벨업/선택지 큐
       │    └─ LootLogic: 전리품 0.20+lootDropAdd 롤, 메소 0.30 롤
       └─ 보스 본체: emit BossKilledEvent{...} → ZengardGameLogic: NotifyStageCleared
StageEnded(어느 쪽이든): state 전이 → emit StageEndedEvent{result, reason, stats}
  └─ 소비: ModeStageLogic(정산/기록/해금 — 직접 구독으로 확정, NotifyStageResult API 폐기),
          SkillInventoryLogic·GrowthLogic·EquipmentLogic·LootLogic·RerollLogic·CompanionLogic (전부 런 상태 파기),
          UIResultLogic (#8 ResultGroup)
```

### 1.4 데미지 최종 식 (단일 정의)

```
hit = _SkillStatLogic:ComputeHitDamage(ownerId, skillId, extraCritChance)
      -- extraCritChance = equip.critChanceAdd (본캐만; 동료는 0)
      -- 내부: damagePerLv[lv] + FLAT_DAMAGE 패시브 합산, 크리 판정(BASE 0.10 + 패시브 + 럭키세븐 0.10 + extra), ×2.0
final = floor( hit.damage × (1 + equip.atkMul + equip.skillDmgMul + growth.atkMul) )
      -- equip = _EquipmentLogic:GetEquipStatMultipliers(userId), growth = _MetaGrowthLogic:GetGrowthMultipliers(userId)
      -- 동료(companionId)는 두 배수 모두 0 (D5 "장비 효과 제외" 자연 충족, C-13)
range 보정: LINE/RANGED_TARGET range += equip.rangeAdd
target 보정: ADJACENT4_SINGLE/RANGED_TARGET 대상 수 += equip.targetAdd
EXTRA_ACTION(님블 바디): 시전 1회 종료 후 RollExtraAction — 추가 시전에는 재호출 금지 (#3 E8)
```

---

## 2. @Logic / @Component 레지스트리 (최종 확정)

접근명은 파일명 그대로 `_` 접두 (`_BoardLogic` 등). `self.Entity` 없음 / `OnMapEnter` 미발화 / 리셋은 명시 API만 — 전 @Logic 공통.

### 2.1 서버/공용 Logic

| 파일 (RootDesk/MyDesk/) | ExecSpace 전략 | 책임 |
|---|---|---|
| `Zengard/Core/ZengardGameLogic.mlua` | 상태 전이 ServerOnly | 상태 머신 (Lobby→StageSelect→InStage→BossPhase→Clear/Fail), 스테이지 시작/종료 시퀀스(§1.1, §1.3), **월드 이벤트 버스** (`SendGameEvent(ev)` = self SendEvent; 구독은 `_ZengardGameLogic:ConnectEvent`). API: `StartStage/ResumeStage/IsInStage/NotifyStageFailed/NotifyStageCleared` |
| `Zengard/Core/StageCatalogLogic.mlua` | 미지정 (양측 조회) | 테마/스테이지/모드 상수 단일 소스 (§7.1). `GetStageConfig(stageId)` |
| `Zengard/Core/ModeStageLogic.mlua` | 검증·정산 ServerOnly / 입장 Server / 통지 Client | 모드 규칙(입장 검증·코인·이어하기·타임어택 기록), 해금/진행도/`lastPlayedStageId` — 저장은 `_PlayerDataLogic` Section 경유 (C-24). `StageEndedEvent` 직접 구독 정산 |
| `Zengard/Board/BoardConfig.mlua` | 미지정 | 보드 기하·젠 사이클 상수 (§7.2). 스테이지 테이블 없음 (C-7) |
| `Zengard/Board/BoardLogic.mlua` | 변환 미지정 / 점유 ServerOnly | cell↔world 단일 변환 + 점유 그리드 (§4.1) |
| `Zengard/Board/WaveLogic.mlua` | 핵심 ServerOnly / `RequestZen` Server / `@Sync` 3종 | 젠 파이프라인(§1.2), `ReshufflePlacement()` (C-23) |
| `Zengard/Combat/CombatConfig.mlua` | 미지정 | 전투 연출 상수 (§7.3). 직업 표는 표시 메타만 (baseDamage 없음, C-12) |
| `Zengard/Combat/AttackPatternLogic.mlua` | 미지정 (순수 함수) | #3 §7.4 shape 5종 구현: `ResolveSkillCells(skillId, col, row, direction)`, `IsInRange(...)` — 서버 판정+클라 미리보기 공용 |
| `Zengard/Combat/CombatLogic.mlua` | 코어 ServerOnly / 설정 수신 Server | 유닛 레지스트리(본캐+동료), per-unit 전투 설정(mode/direction/target), 젠 시퀀스 실행(§1.2-8), 데미지 적용 호출 |
| `Zengard/Combat/CombatFxLogic.mlua` | FX Multicast / 재생 ClientOnly | 시전/피격 FX·SFX·데미지스킨·아바타 ATTACK 모션. 파라미터는 string fxKey + 좌표만 |
| `Zengard/Jobs/JobLogic.mlua` | `SetJob` ServerOnly / 조회 미지정 | per-user 기본 직업 (warrior/archer/mage/thief). `GetJob(userId)` — #3의 `GetUserJob` 표기는 이것 (C-14). 전직 차수는 GrowthLogic 소유 |
| `Zengard/Skills/SkillDataLogic.mlua` | 미지정 | 스킬/레시피/상수 테이블 단일 소스 (§7.4) — tier-2 마법사 3종 포함 (C-26) |
| `Zengard/Skills/SkillInventoryLogic.mlua` | 상태 ServerOnly / HUD 푸시 Client | per-owner(userId 또는 companionId) 보유/레벨/시전 순서 큐, `ResetUser`, `SyncSkillState` Client RPC (C-28) |
| `Zengard/Skills/SkillFusionLogic.mlua` | ServerOnly | 레시피 활성화/완료, 재료 삭제, 큐 위치 승계 (#3 E11) |
| `Zengard/Skills/SkillChoiceLogic.mlua` | ServerOnly | 최초 2택/레벨업 후보 추첨(NEW/LEVELUP/FUSION + tier/branch 필터), `ApplyChoice` 재검증 |
| `Zengard/Skills/SkillStatLogic.mlua` | 미지정 (서버 호출 전제) | `ComputeHitDamage(ownerId, skillId, extraCritChance)`, `RollExtraAction(ownerId)` (§1.4) |
| `Zengard/Growth/GrowthConfig.mlua` | 미지정 | 경험치 곡선·선택지 확률·전직 조건/비용·직업 루트 테이블 (§7.5) |
| `Zengard/Growth/GrowthLogic.mlua` | 변이 ServerOnly / 요청 Server / 통지 Client | per-user 성장 상태(level/exp/skillPoints/jobTier/routeBranch/노출 카운터/슬롯 수/선택지 큐), 선택지 조립(90/10), 전직, 확장, 리롤, 동료 특수 선택지 큐 (C-1: 이 이름은 #4 소유) |
| `Zengard/Companion/CompanionConfig.mlua` | 미지정 | 동료 상수/2차 풀/초기 스킬 풀/스테이지 트리거 테이블 (§7.6) |
| `Zengard/Companion/CompanionLogic.mlua` | 코어 ServerOnly / 설정 Server / 통지 Client | 로스터, 트리거 평가(`OnBossZenImminent`/JobAdvancedEvent), 직업군 카드→2차 추첨→스폰, 재배치, CombatLogic 유닛 등록 (C-13) |
| `Zengard/Monsters/MonsterBalance.mlua` | 미지정 | 몬스터/보스/드랍/exp 밸런스 단일 소스 (§7.7, C-5/C-32) |
| `Zengard/Monsters/MonsterLogic.mlua` | ServerOnly | **유일 스폰/HP/처치 권위** (C-3/C-17): 레지스트리, `SpawnMonster/ApplyDamage/GetMonsterAt/GetAliveMonsterCount/GetAliveMonsters/OnZenAging/ResetForStage`, 진화/증식, 드랍 롤, 이벤트 발행 |
| `Zengard/Monsters/BossLogic.mlua` | ServerOnly | 보스 스폰(20젠 자동+`ForceSpawnBoss` 훅)/패턴 롤/분열/`IsBossAlive` — HP는 MonsterLogic 레지스트리 위임 |
| `Zengard/Meta/PlayerDataLogic.mlua` | ServerOnly / 푸시 Client | **영속 단일 게이트웨이** (C-24): `"meta"` 키 (meso/redMeso/challengeCoin/energy/metaGrowth), Section API(`"progress"`), dirty+30s debounce flush, 입장 GetAndWait/퇴장 SetAndWait |
| `Zengard/Meta/MetaGrowthLogic.mlua` | ServerOnly / 요청 Server | 내실 능력치/내실 장비 구매·강화, `GetGrowthMultipliers(userId)` (C-1) |
| `Zengard/Meta/MetaGrowthBalance.mlua` | 미지정 | §7.8 내실 상수 |
| `Zengard/Equipment/EquipmentLogic.mlua` | ServerOnly | 런 장비 카드 추첨/지급/합산 배수, 등장 확률 제공 (0.10/0.15), `ClearRunState` |
| `Zengard/Equipment/EquipmentBalance.mlua` | 미지정 | 장비 카드 8종 + 확률 상수 (§7.9) |
| `Zengard/Loot/LootLogic.mlua` | ServerOnly / 확장 요청 Server | `MonsterKilledEvent` 수신 드랍 롤, 전리품 잔액, `TrySpendLoot`, 확장 상태, `ResetRun` |
| `Zengard/Bm/EnergyLogic.mlua` | ServerOnly / 구매 Server | lazy 시간 충전, `TryConsumeEnergy`, 레드메소 풀충전 |
| `Zengard/Bm/RerollLogic.mlua` | ServerOnly / 요청 Server | 스테이지당 3회 합산 카운터, 위임 호출 (C-23), `ResetRun` |
| `Zengard/Bm/BmBalance.mlua` | 미지정 | 에너지/재화/리롤 상수 (§7.10) |

### 2.2 클라이언트 UI Logic (전부 `@ExecSpace("ClientOnly")`, C-21)

| 파일 (`Zengard/UI/`) | 담당 .ui | 책임 |
|---|---|---|
| `UIRouterLogic.mlua` | — | 주 화면 1개만 Enable, 모달 큐 직렬화 (#8 §7.6: Result 도착 시 큐 폐기) |
| `UILobbyLogic.mlua` | LobbyGroup.ui | 모드 3버튼, 에너지/메소/코인 표시 |
| `UIStageSelectLogic.mlua` | StageSelectGroup.ui | 노드 상태/포커스, 직업 4카드+스킬 2택 (C-10), 동료 안내 텍스트(`_CompanionLogic:GetStageCompanionNotice`), 모험하기 |
| `UIGameHudLogic.mlua` | GameHUDGroup.ui | 젠 버튼+쿨다운, WAVE n/20, 레벨/EXP 바, 몬스터 n/threshold, 타임어택 타이머, 일시정지. (자동/수동 토글 없음 — C-11) |
| `UICombatControlLogic.mlua` | CombatControlHUDGroup.ui | 수동/자동 토글, 방향 4버튼, 스킬 순서, 도적 타겟, DirectionIndicator 연동 |
| `UISkillHudLogic.mlua` | SkillHUDGroup.ui | 보유 스킬 슬롯 8칸+레벨+합성 뱃지 (`SyncSkillState` 수신) |
| `UIChoicePopupLogic.mlua` | ChoicePopupGroup.ui | 카드 3~5장, 등급 연출, 리롤/확장/전직 버튼 (C-2). `ShowChoices(cards, rerollLeft)` / `CloseChoices()` |
| `UIJobAdvancePopupLogic.mlua` | JobAdvancePopupGroup.ui | 전직 연출 쉘 `ShowJobAdvance(jobInfo)` |
| `UICompanionPopupLogic.mlua` | CompanionPopupGroup.ui | 동료 합류 연출 쉘 `ShowCompanionJoin(candidates)` |
| `UICompanionPanelLogic.mlua` | CompanionPanelGroup.ui | 동료 슬롯 2, 방향/스킬 순서 입력 → `_CompanionLogic` Server RPC |
| `UIMetaHudLogic.mlua` | MetaHudGroup.ui | 에너지 5칸+타이머, 메소/레드메소, 리롤 잔여 (`SyncMetaStatus` 수신) |
| `UIMetaGrowthPopupLogic.mlua` | MetaGrowthPopup.ui | 내실 능력치 3트랙+장비 3슬롯 (C-1) |
| `UIResultLogic.mlua` | ResultGroup.ui | 클리어/실패 분기, 이어하기/다시하기/로비 |
| `UIHpBarManagerLogic.mlua` | WorldHpBarGroup.ui | HP Bar 풀 60 + 보스 바, 1/60 타이머 World→Screen 동기화 (C-8) |
| `UIToastLogic.mlua` | ToastGroup.ui | 공용 토스트 `ShowMessage(msg)` |

### 2.3 @Component (월드 엔티티 부착)

| 파일 | 부착 대상 | 책임 |
|---|---|---|
| `Zengard/Monsters/MonsterUnit.mlua` | 몬스터 4종 .model | `@Sync Hp/MaxHp/IsDead` + ClientOnly: `OnSyncProperty` → `_UIHpBarManagerLogic` 호출(C-8), 등장/처치 디졸브(material 1순위, Color 알파 폴백). 판정 로직 없음 |
| `Zengard/Companion/CompanionComponent.mlua` | Companion.model | 코스튬 적용(2차 직업 무기 RUID), 위치 반영, ATTACK 모션 재생 (Client) |

---

## 3. 이벤트 레지스트리 (최종 확정 — 전부 `Zengard/Events/` 플랫, C-30)

발행은 전부 `_ZengardGameLogic:SendGameEvent(ev)` 경유 (단일 버스), 구독은 `_ZengardGameLogic:ConnectEvent(XxxEvent, handler)`. 필드 타입은 string/integer/number/boolean/table 한정 (enum/Entity 직렬화 금지).

| 이벤트 | 필드 | 발신 | 수신 |
|---|---|---|---|
| `StageStartedEvent` | `stageId:string, mode:string` | ZengardGameLogic | (패시브) #8 HUD, 로그 |
| `StageEndedEvent` | `result:"CLEAR"\|"FAIL", reason:string, stats:table` | ZengardGameLogic | ModeStageLogic(정산), Skill*/Growth/Equipment/Loot/Reroll/Companion(런 파기), UIResultLogic |
| `ZenStartedEvent` | `zenIndex:integer, isBossZen:boolean, spawnedCount:integer` | WaveLogic (배치 완료 후, C-9) | UIGameHudLogic(카운터/적색 점멸), UIToastLogic |
| `MonsterKilledEvent` | `monsterId:string, typeId:string, col:integer, row:integer, attackerUserId:string, exp:integer, isBoss:boolean, drops:table` | MonsterLogic | WaveLogic(카운트), GrowthLogic(exp), LootLogic(드랍/메소) |
| `MonsterEvolvedEvent` | `oldMonsterId:string, newMonsterId:string, newTypeId:string, col:integer, row:integer` | MonsterLogic | CombatLogic(타겟 무효화) |
| `BossSpawnedEvent` | `monsterId:string, typeId:string, col:integer, row:integer` | BossLogic | UIGameHudLogic(배너), MonsterUnit→AttachBoss |
| `BossKilledEvent` | `monsterId:string, attackerUserId:string, drops:table` | BossLogic(MonsterLogic 경유) | ZengardGameLogic(클리어 전이), LootLogic(보스 드랍) |
| `JobSelectedEvent` | `userId:string, jobId:string` | JobLogic | SkillChoiceLogic, UIGameHudLogic |
| `AttackSequenceStartedEvent` | `zenIndex:integer` | CombatLogic | UICombatControlLogic(입력 잠금) |
| `AttackSequenceEndedEvent` | `zenIndex:integer, totalKills:integer` | CombatLogic | WaveLogic(카운트 재동기화), GrowthLogic(선택지 노출 타이밍) |
| `LevelUpEvent` | `userId:string, newLevel:integer` | GrowthLogic | UIGameHudLogic, CompanionLogic(스킬 카드 풀 동기화) |
| `ChoiceResolvedEvent` | `userId:string, kind:string, id:string` | GrowthLogic | UIChoicePopupLogic(닫기), SkillHUD 갱신 트리거 |
| `JobAdvancedEvent` | `userId:string, jobKey:string, newTier:integer, branch:string` | GrowthLogic | CompanionLogic(AFTER_JOB_ADV), UIJobAdvancePopupLogic, CombatFxLogic(연출) |
| `FusionActivatedEvent` | `userId:string, recipeId:string` | SkillFusionLogic | UISkillHudLogic(뱃지), UIToastLogic |
| `SkillFusedEvent` | `userId:string, recipeId:string, resultSkillId:string` | SkillFusionLogic | UISkillHudLogic, UIToastLogic |
| `CompanionJoinedEvent` | `companionId:string, jobGroup:string, secondJob:string, initialSkillId:string` | CompanionLogic | UICompanionPanelLogic, UICompanionPopupLogic |
| `CompanionOrderChangedEvent` | `companionId:string, direction:string, skillIds:table` | CompanionLogic | UICompanionPanelLogic |
| `LootChangedEvent` | `userId:string, amount:integer, delta:integer, reason:string` | LootLogic | UIMetaHudLogic, UIChoicePopupLogic(전직/확장 버튼 상태) |
| `ChoiceExpandedEvent` | `userId:string` | LootLogic | GrowthLogic(slotCount=5) |
| `EquipmentGrantedEvent` | `userId:string, equipId:string` | EquipmentLogic | CombatLogic(배수 캐시 무효화) |
| `RerollUsedEvent` | `userId:string, kind:string, remaining:integer` | RerollLogic | UIMetaHudLogic, UIChoicePopupLogic |

삭제된 이벤트 (스펙 대비): `AttackResolvedEvent`(C-27), `SkillAcquiredEvent`/`SkillLevelUpEvent`(C-28), `BossPhaseImminentEvent`(C-20 불요).

---

## 4. 공개 API 시그니처 (최종 확정)

> 표기되지 않은 메서드는 시스템 내부용 — 타 시스템 호출 금지. RPC 경계 파라미터에 `any`/엔진 enum 금지.

### 4.1 BoardLogic

```lua
-- 좌표 (미지정 — 순수 함수, 양측)
method Vector3 CellToWorld(integer col, integer row)        -- 셀 중심. (col-3)*0.8, (row-3)*0.8+0.3
method table   WorldToCell(Vector3 pos)                     -- {col,row} 또는 nil
method boolean IsInside(integer col, integer row)
-- 점유 (ServerOnly)
method boolean IsOccupied(integer col, integer row)
method boolean TryOccupy(integer col, integer row, string occupantId, string kind)  -- kind: "monster"|"player"|"boss"|"companion"
method void    Release(integer col, integer row, string occupantId)                 -- id 불일치 시 무시+log_warning
method void    ReplaceOccupant(integer col, integer row, string oldId, string newId)
method table   GetRandomEmptyCells(integer count)           -- 비복원, 부족 시 짧게
method table   GetAdjacentEmptyCells(integer col, integer row)
method table   GetEmptyCellNearestCenter()                  -- {col,row} 또는 nil (보스 스폰)
method integer GetOccupantCount(string kind)
method void    ResetBoard()
```

### 4.2 WaveLogic

```lua
@Sync property integer CurrentZen / integer MonsterCount / boolean IsZenAvailable
@ExecSpace("Server")     method void RequestZen()
@ExecSpace("ServerOnly") method void ForceBossZen()
@ExecSpace("ServerOnly") method void ResetWave(string stageId)
@ExecSpace("ServerOnly") method void ReshufflePlacement()   -- 리롤: 몬스터+플레이어+동료 전원 재배치, 동기 완료 (C-23)
@ExecSpace("ServerOnly") method void RepositionPlayer()
```

### 4.3 MonsterLogic / BossLogic

```lua
-- MonsterLogic (전부 ServerOnly)
method string  SpawnMonster(string typeId, integer col, integer row)   -- 점유 등록+스폰+레지스트리. 호출자: WaveLogic/BossLogic
method void    ApplyDamage(string monsterId, integer damage, string attackerUserId)   -- 유일 데미지 진입점 (C-17)
method table   GetMonsterAt(integer col, integer row)       -- nil 또는 {monsterId, typeId, hp, maxHp, isBoss, col, row}
method table   GetMonsterInfo(string monsterId)
method table   GetAliveMonsters()
method integer GetAliveMonsterCount()
method void    OnZenAging(integer zenIndex)                 -- §1.2-2. 호출자: WaveLogic 한정
method void    ResetForStage()
-- BossLogic (전부 ServerOnly)
method void    TrySpawnBoss()                               -- 호출자: WaveLogic. 성공 시 BossSpawnedEvent
method void    ForceSpawnBoss()                             -- 특수 조건 훅 (프로토타입 호출처 없음)
method boolean IsBossAlive()
```

### 4.4 CombatLogic / AttackPatternLogic / CombatFxLogic / JobLogic

```lua
-- CombatLogic
@ExecSpace("ServerOnly") method void ExecuteZenCombat(integer zenIndex)             -- 호출자: WaveLogic (C-9)
@ExecSpace("ServerOnly") method void RegisterCombatUnit(Entity unit, string ownerId)  -- ownerId = userId|companionId (C-13)
@ExecSpace("ServerOnly") method void UnregisterCombatUnit(string ownerId)
@ExecSpace("Server")     method void RequestSetCombatConfig(string ownerId, string mode, string direction, table skillOrder, string targetMonsterId)
   -- mode "MANUAL"|"AUTO", direction "UP"|"DOWN"|"LEFT"|"RIGHT"|"RANDOM". skillOrder는 내부에서 _SkillInventoryLogic:SetSkillOrder 위임
   -- senderUserId 검증: 본캐는 본인, companionId는 소유자만
-- AttackPatternLogic (미지정 — 순수)
method table   ResolveSkillCells(string skillId, integer col, integer row, string direction)  -- #3 §7.4 규약
method boolean IsInRange(integer c1, integer r1, integer c2, integer r2, integer range)        -- 체비셰프
-- CombatFxLogic
@ExecSpace("Multicast") method void PlayCastFx(string fxKey, integer col, integer row, string direction)
@ExecSpace("Multicast") method void PlayHitFx(string fxKey, integer col, integer row)
@ExecSpace("Multicast") method void PlayDamageSkin(integer col, integer row, integer damage, boolean isCritical)
-- JobLogic
@ExecSpace("ServerOnly") method void   SetJob(string userId, string jobId)   -- StartStage 전용 (C-10)
                         method string GetJob(string userId)                 -- "" = 미선택
```

### 4.5 Skills (#3)

```lua
-- SkillDataLogic (미지정)
method table GetSkillData(string skillId)                 -- §7.4 스키마 (shape/range/hits/damagePerLv/linePierce/directional/...)
method table GetJobInitialSkillIds(string jobId)          -- 2종
method table GetJobSkillPool(string jobId)
method table GetRecipe(string recipeId) / GetRecipesByJob(string jobId)
-- SkillInventoryLogic (ServerOnly; ownerId = userId|companionId)
method table   GetOwnedSkills(string ownerId)             -- {{skillId, level}, ...}
method integer GetSkillLevel(string ownerId, string skillId)
method void    GrantSkill(string ownerId, string skillId)
method boolean LevelUpSkill(string ownerId, string skillId)
method void    RemoveSkill(string ownerId, string skillId)
method table   GetSkillOrder(string ownerId) / void SetSkillOrder(string ownerId, table ids)
method void    ResetUser(string ownerId)
@ExecSpace("Client") method void SyncSkillState(table serialized)   -- HUD 푸시 (C-28)
-- SkillFusionLogic (ServerOnly)
method table   GetActivatedRecipeIds(string userId)
method void    RefreshFusionActivation(string userId)
method boolean TryCompleteFusion(string userId, string recipeId)
-- SkillChoiceLogic (ServerOnly; 호출자: GrowthLogic)
method table   GetInitialChoices(string userId, string jobId)            -- 항상 2개
method table   GetChoiceCandidates(string userId, integer slotCount)     -- {{skillId, kind="NEW"|"LEVELUP"|"FUSION", recipeId?}, ...}
method boolean ApplyChoice(string userId, table choice)                  -- 재검증, false면 호출측 재추첨
-- SkillStatLogic (서버 호출 전제)
method table   ComputeHitDamage(string ownerId, string skillId, number extraCritChance)  -- {damage, isCritical}
method boolean RollExtraAction(string ownerId)
```

### 4.6 GrowthLogic (#4 — 레벨/선택지/전직)

```lua
@ExecSpace("ServerOnly") method void InitForStage(string userId, string jobKey)
@ExecSpace("ServerOnly") method void AddExp(string userId, integer amount)
@ExecSpace("ServerOnly") method integer GetLevel(string userId)
@ExecSpace("ServerOnly") method table   GetJobTier(string userId)            -- {tier, branch}
@ExecSpace("ServerOnly") method boolean HasOpenChoice(string userId)         -- 리롤 가드 (C-23)
@ExecSpace("ServerOnly") method void RerollCurrentChoices(string userId)     -- RerollLogic 위임 수신
@ExecSpace("ServerOnly") method void EnqueueSpecialChoiceSet(table cards, string resolverLogicName, string choiceToken)  -- 동료 합류 카드 (C-2/#5)
@ExecSpace("Server") method void RequestPick(integer setId, integer slotIndex)
@ExecSpace("Server") method void RequestJobAdvance()
@ExecSpace("Server") method void RequestExpandChoices()
@ExecSpace("Client") method void ShowChoiceSetRemote(table cards, integer setId, integer rerollLeft)  -- 내부에서 _UIChoicePopupLogic:ShowChoices
@ExecSpace("Client") method void NotifyAdvanceDeferred()
```

### 4.7 CompanionLogic (#5)

```lua
method string GetStageCompanionNotice(string stageId)                 -- 미지정 (양측)
@ExecSpace("ServerOnly") method void OnBossZenImminent(integer zenIndex)  -- 호출자: WaveLogic (C-20)
@ExecSpace("ServerOnly") method void RepositionAll()                      -- 호출자: WaveLogic
@ExecSpace("ServerOnly") method void ResetRun()
@ExecSpace("Server") method void RequestSetDirection(string companionId, string direction)
@ExecSpace("Server") method void RequestSetSkillOrder(string companionId, table skillIds)
@ExecSpace("Server") method void ResolveJobGroupChoice(string choiceToken, string jobGroup)
```

### 4.8 경제/영속 (#6)

```lua
-- PlayerDataLogic (ServerOnly)
method integer GetMeso/GetRedMeso/GetChallengeCoin(string userId)
method void    AddCurrency(string userId, string kind, integer amount)        -- kind: "meso"|"redMeso"
method boolean TrySpendCurrency(string userId, string kind, integer amount)
method boolean TrySpendChallengeCoin(string userId, integer n) / void AddChallengeCoin(string userId, integer n)  -- (C-25)
method string  GetSection(string userId, string key) / void SetSection(string userId, string key, string data)   -- "progress" 등 (C-24)
@ExecSpace("Client") method void SyncMetaStatus(integer meso, integer redMeso, integer energy, integer nextRefillSec, integer remainingRerolls, integer lootCount)
-- EnergyLogic
@ExecSpace("ServerOnly") method integer GetEnergy(string userId)
@ExecSpace("ServerOnly") method boolean TryConsumeEnergy(string userId, string reason)   -- "stage_start"|"retry"|"continue"
@ExecSpace("ServerOnly") method integer GetNextRefillRemainingSec(string userId)
@ExecSpace("Server")     method void RequestFullRefillByRedMeso()
-- LootLogic
@ExecSpace("ServerOnly") method integer GetLootCount(string userId)
@ExecSpace("ServerOnly") method boolean TrySpendLoot(string userId, integer amount, string reason)  -- "job_adv"|"choice_expand"
@ExecSpace("ServerOnly") method boolean IsChoiceExpanded(string userId)
@ExecSpace("ServerOnly") method void    ResetRun(string userId)
@ExecSpace("Server")     method void RequestExpandChoice()
-- EquipmentLogic
@ExecSpace("ServerOnly") method number GetEquipmentAppearChance(string userId)   -- 0.10 / 0.15 (C-31)
@ExecSpace("ServerOnly") method string DrawEquipmentCard(string userId)
@ExecSpace("ServerOnly") method void   GrantEquipment(string userId, string equipId)
@ExecSpace("ServerOnly") method table  GetEquipStatMultipliers(string userId)    -- {atkMul, atkSpeedMul, skillDmgMul, critChanceAdd, rangeAdd, targetAdd, expGainMul, lootDropAdd}
@ExecSpace("ServerOnly") method void   ClearRunState(string userId)
-- MetaGrowthLogic
@ExecSpace("ServerOnly") method table GetGrowthMultipliers(string userId)        -- EquipStatMultipliers 동일 키 (없으면 0)
@ExecSpace("Server") method void RequestUpgradeStat(string statKey) / RequestBuyGrowthEquip(string slotKey) / RequestEnhanceGrowthEquip(string slotKey)
@ExecSpace("Client") method void SyncGrowthState(string growthJson)
-- RerollLogic
@ExecSpace("ServerOnly") method integer GetRemainingRerolls(string userId)
@ExecSpace("ServerOnly") method void    ResetRun(string userId)
@ExecSpace("Server")     method void RequestReroll(string kind)                  -- "placement"|"choice"
```

### 4.9 모드/스테이지 & UI 클라 API (#8)

```lua
-- ModeStageLogic
method table  GetStageConfig(string stageId)    -- StageCatalogLogic 위임 (§7.1 스키마)
method string GetCurrentMode()
@ExecSpace("Server") method void RequestEnterStage(string mode, string stageId, string jobId, string skillId)
@ExecSpace("Server") method void RequestContinue()          -- STORY 1회
@ExecSpace("Server") method void AbandonRun()
-- 클라 API (전부 ClientOnly — 클라 코드만 호출 가능)
_UIHpBarManagerLogic:  Attach(Entity, number maxHp) / UpdateHp(Entity, number cur) / Release(Entity) / AttachBoss(Entity, number maxHp)
_UIChoicePopupLogic:   ShowChoices(table cards, integer rerollLeft) / CloseChoices()
   -- cards[i] = { choiceId, kind="SKILL"|"EQUIP"|"FILLER"|"COMPANION_JOB", name, desc, iconRuid, grade="NORMAL"|"RARE"|"EPIC" }
_UIJobAdvancePopupLogic: ShowJobAdvance(table jobInfo)
_UICompanionPopupLogic:  ShowCompanionJoin(table candidates)
_UIToastLogic:           ShowMessage(string msg)
_UIGameHudLogic:         SetExp(integer level, number ratio) / SetMonsterCount(integer n) / SetRerollLeft(integer n)
```

---

## 5. 모델 id / UI 그룹 / 바인딩 레지스트리

### 5.1 .model (EntryKey = SpawnByModelId 첫 인자 — 소문자 단일 어휘)

| EntryKey | 파일 | 구성 | 비고 |
|---|---|---|---|
| `orangemushroom` | `Models/Monsters/OrangeMushroom.model` | Transform + SpriteRenderer + script.MonsterUnit | PixelRenderer 없음 (C-8) |
| `stonegolem` | `Models/Monsters/StoneGolem.model` | 동일 | |
| `zombiemushroom` | `Models/Monsters/ZombieMushroom.model` | 동일 | 주황버섯 진화체 |
| `mushmom` | `Models/Monsters/Mushmom.model` | 동일 + Scale 1.5 | 분신(`typeId="mushmom_split"`)은 이 모델 재사용, 스폰 시 Scale 0.9/HP 주입 |
| `companion` | `Models/Companions/Companion.model` | Transform + AvatarRenderer + CostumeManager(UseCustomEquipOnly=true) + StateComponent + AvatarStateAnimation + script.CompanionComponent | Body/Movement 없음 |
| `boardbackdrop` | `Models/MapObjects/BoardBackdrop.model` | Transform + SpriteRenderer | OrderInLayer 0 |
| `boardcell` | `Models/MapObjects/BoardCell.model` | Transform + SpriteRenderer | OrderInLayer 1, 49 인스턴스 placeModel |
| `directionindicator` | `Models/MapObjects/DirectionIndicator.model` | Transform + SpriteRenderer | OrderInLayer 9, Z회전 4방 |

typeId 어휘 (MonsterBalance 키): `orangemushroom / stonegolem / zombiemushroom / mushmom / mushmom_split` — EntryKey와 동일 문자열 (C-3, 분신만 모델 공유).

몬스터/캐릭터 렌더 순서: `SortingLayer="MapLayer0"`, `OrderInLayer = 2 + (rows-1-row)` (의사 깊이).

### 5.2 UI 그룹 (GroupOrder 확정)

| .ui 파일 | UIGroup | Order | DefaultShow | 컨트롤러 (@Logic) |
|---|---|---|---|---|
| `ui/LobbyGroup.ui` | LobbyGroup | 0 | true | UILobbyLogic |
| `ui/StageSelectGroup.ui` | StageSelectGroup | 1 | false | UIStageSelectLogic |
| `ui/WorldHpBarGroup.ui` | WorldHpBarGroup | 2 | false | UIHpBarManagerLogic |
| `ui/MetaHud.ui` | MetaHudGroup | 3 | true | UIMetaHudLogic |
| `ui/GameHUDGroup.ui` | GameHUDGroup | 5 | false | UIGameHudLogic |
| `ui/SkillHUD.ui` | SkillHUDGroup | 6 | false | UISkillHudLogic |
| `ui/CombatControlHUD.ui` | CombatControlHUDGroup | 7 | false | UICombatControlLogic |
| `ui/CompanionPanel.ui` | CompanionPanelGroup | 8 | false | UICompanionPanelLogic |
| `ui/ChoicePopupGroup.ui` | ChoicePopupGroup | 10 | false | UIChoicePopupLogic |
| `ui/JobAdvancePopupGroup.ui` | JobAdvancePopupGroup | 11 | false | UIJobAdvancePopupLogic |
| `ui/CompanionPopupGroup.ui` | CompanionPopupGroup | 11 | false | UICompanionPopupLogic |
| `ui/MetaGrowthPopup.ui` | MetaGrowthPopupGroup | 12 | false | UIMetaGrowthPopupLogic |
| `ui/ResultGroup.ui` | ResultGroup | 20 | false | UIResultLogic |
| `ui/ToastGroup.ui` | ToastGroup | 30 | true | UIToastLogic |

**바인딩 규약 (C-21):** `.ui`에 script 컴포넌트 부착 금지. 컨트롤러 @Logic의 Entity/string property에 UIBuilder `b.write(path, { bind })`로 UUID 주입. `.ui`와 컨트롤러 `.mlua`는 같은 워커·같은 웨이브(Wave 3) 산출물. 모든 UI Logic은 `@ExecSpace("ClientOnly")`. 비주얼은 style-1-black 번들 + 헤네시스 녹색 틴트. 버튼 클릭/호버 SFX는 ui-sound.md 기본 RUID.

삭제된 UI 파일 (스펙 대비): `ui/JobSelectPopup.ui`(C-10), `ui/ChoicePopup.ui`(C-2), `ui/GrowthPopup.ui`→`ui/MetaGrowthPopup.ui` 개명(C-1).

---

## 6. 영속 데이터 스키마 (PlayerDataLogic — UserDataStorage)

- 키 `"meta"`: `{ v=1, meso, redMeso, challengeCoin=3, energy={amount=5, lastRefillAt}, metaGrowth={stats={atk,exp,loot}, equips={weapon,armor,charm}} }` (C-25 반영)
- 키 `"progress"` (내용 스키마는 ModeStageLogic 소유, 접근은 Section API만): `{ v=1, cleared={stageId:bool}, bestTime={stageId:ms}, lastPlayedStageId }`
- 규율: 입장 GetAndWait 1회 → 인메모리 캐시 → dirty + 30s debounce flush → 퇴장 SetAndWait. 킬/프레임 단위 호출 금지(**코드 리뷰 blocking**). `errorCode` 분기 필수. 런 상태(장비/전리품/리롤/확장/성장) 절대 저장 금지.

---

## 7. 밸런스 테이블 통합본 (단일 표 — 구현은 이 값만 사용)

**[P]** = 기획서 명시 (변경 금지), **[A]** = ARCHITECTURE 확정 (변경 금지), **[D]** = 설계 결정 (플레이테스트 후 조정 가능 — 상수 위치만 바꿔서 조정).

### 7.1 스테이지 (StageCatalogLogic.STAGES — 단일 소스, C-6/C-7)

| stageId | 이름 | monstersPerZen | 구성 orange:golem | bossZen | failThreshold | modifiers |
|---|---|---|---|---|---|---|
| `1-1` | 버섯 언덕 | 3 | 100:0 | 20 [P] | 40 [D] | — |
| `1-2` | 버섯 숲 | 4 | 100:0 | 20 | 40 | — |
| `1-3` | 돌의 정원 | 4 | 75:25 | 20 | 40 | — |
| `1-4` | 진화의 숲 | 4 | 90:10 | 20 | 40 | `evolveZen=7` |
| `1-5` | 골렘 채석장 | 4 | 60:40 | 20 | 38 | `golemSplitRate=1.5` (증식 확률 0.50→0.75) |
| `1-6` | 머쉬맘의 안식처 | 5 | 70:30 | 20 | 36 | `bossSummonRate=1.5` (소환 0.35→0.525) |

GetStageConfig 반환 스키마: `{ themeId, boardW=7, boardH=7, monstersPerZen, spawnWeights, bossZen, failThreshold, bossModelId="mushmom", repositionMonstersOnZen=false, modifiers={evolveZen=10, golemSplitRate=1.0, bossSummonRate=1.0} }`.

모드: STORY(에너지 1, 이어하기 1회 [D]) / CHALLENGE(코인 1 [P], 이어하기 불가 [P], 클리어 환급 [D]) / TIME_ATTACK(에너지 1, 팝업 중 타이머 비정지 [D]). 해금: 1-1 기본, 직전 클리어 시 해금; 비스토리 모드는 스토리 클리어 스테이지만 [D].

### 7.2 보드/젠 (BoardConfig)

| 상수 | 값 | 출처 |
|---|---|---|
| GRID_COLS/ROWS = 7, CELL_SIZE = 0.8, BOARD_CENTER = (0, 0.3) | — | [A] |
| `ZEN_COOLDOWN_SECONDS` | 1.0 | [D] |
| `REPOSITION_MONSTERS_ON_ZEN` | false | [D] p.8 기본 채택, p.9 해석은 플래그 |
| 렌더 순서 | OrderInLayer = 2 + (rows-1-row) | [D] |

### 7.3 전투 연출 (CombatConfig)

| 상수 | 값 | | 상수 | 값 |
|---|---|---|---|---|
| `CAST_INTERVAL` | 0.6s [D] | | `DEFAULT_COMBAT_MODE` | "MANUAL" [D] |
| `SEQUENCE_START_DELAY` | 0.3s [D] | | `DEFAULT_DIRECTION` | "RIGHT" [D] |
| `HIT_FX_DURATION` | 0.4s [D] | | 방향 | 4방 (대각선 없음) [D] |

### 7.4 스킬 (SkillDataLogic — Lv.1/2/3 히트당 데미지)

1차 액티브 + 재료 (전부 [D] 수치, 명칭 [P] p.12):

| skillId | 이름 | 직업 | shape | range | hits | dmg | 비고 |
|---|---|---|---|---|---|---|---|
| `warrior_power_strike` | 파워 스트라이크 | warrior | ADJACENT4_SINGLE | 1 | 1 | 4/6/9 | |
| `warrior_slash_blast` | 슬래시 블러스트 | warrior | ADJACENT4 | 1 | 1 | 2/3/5 | |
| `archer_arrow_blow` | 애로우 블로우 | archer | LINE | 7 | 1 | 2/3/5 | linePierce=true, directional |
| `archer_double_shot` | 더블샷 | archer | LINE | 7 | 2 | 2/3/4 | directional |
| `archer_ice_shot` | 아이스샷 (재료) | archer | LINE | 7 | 1 | 3/4/6 | ICE, 최초 선택지 미등장 |
| `mage_energy_bolt` | 에너지 볼트 | mage | ADJACENT8 | 1 | 1 | 2/3/4 | |
| `mage_magic_claw` | 매직 클로 | mage | RANGED_TARGET | 3 | 2 | 1/2/3 | |
| `thief_double_stab` | 더블 스텝 | thief | RANGED_TARGET | 2 | 2 | 2/3/4 | |
| `thief_lucky_seven` | 럭키 세븐 | thief | RANGED_TARGET | 5 | 2 | 2/3/4 | 크리 +10%p |

패시브 4종 [D]: `warrior_power_mastery` FLAT_DAMAGE +1/+2/+3 · `archer_critical_shot` CRIT_CHANCE +10/20/30%p · `mage_spell_mastery` FLAT_DAMAGE +1/+2/+3 · `thief_nimble_body` EXTRA_ACTION 5/10/15%.

합성 결과 4종 [D] (레시피: 더블샷+아이스샷→더블아이스샷 [P p.13], 나머지 3종 [D]):

| skillId | shape/range/hits | dmg | 레시피 |
|---|---|---|---|
| `warrior_power_blast` | ADJACENT4 / 1 / 1 | 6/8/11 | power_strike + slash_blast |
| `archer_double_ice_shot` | LINE / 7 / 2 | 4/5/7 | double_shot(Lv.3 측) + ice_shot |
| `mage_energy_claw` | ADJACENT8 / 1 / 2 | 2/3/4 | energy_bolt + magic_claw |
| `thief_triple_seven` | RANGED_TARGET / 5 / 3 | 3/4/5 | lucky_seven + double_stab |

마법사 tier-2 분기 3종 (C-26 신설, 전부 [D] 수치; branch 매핑 [P p.12]):

| skillId | 이름 | shape/range/hits | dmg | branch |
|---|---|---|---|---|
| `mage_fire_arrow` | 파이어 애로우 | LINE(pierce) / 7 / 1 | 4/6/8 | `firepoison` (불독) |
| `mage_thunder_bolt` | 썬더 볼트 | ADJACENT8 / 1 / 1 | 3/4/6 | `icelightning` (썬콜) |
| `mage_bless` | 블레스 | PASSIVE FLAT_DAMAGE | +2/+3/+4 | `bishop` (비숍) |

상수: `SKILL_MAX_LEVEL=3` [P] · `FUSION_CHOICE_CHANCE=0.30` [D] · `BASE_CRIT_CHANCE=0.10` [D] · `CRIT_MULTIPLIER=2.0` [D] · `MAX_OWNED_SKILLS=8` [D] · 활성화 조건 = `(lvA==3 and owned(B)) or (lvB==3 and owned(A))` [P p.13 대칭 해석].

### 7.5 성장/선택지/전직 (GrowthConfig)

| 상수 | 값 | 출처 |
|---|---|---|
| `EXP_TO_NEXT(L)` | `4 + 2*(L-1)`, 캡 20 | [D] |
| 슬롯 수 | 3 → 확장 5 | [P] |
| 장비 등장 확률 | 0.10 → 확장 0.15 | [P]/[D, C-31] |
| 노출당 장비 카드 상한 | 3슬롯 1 / 5슬롯 2 | [D] |
| `ADV_EXPOSURE_THRESHOLD` | 3회 (전직 성공 시 0 리셋) | [P]/[D] |
| `MAX_JOB_TIER` | 4 | [P] |
| `ADV_COST` (전리품) | {2차 3, 3차 5, 4차 8} | [D, C-22] |
| `CHOICE_EXPAND_LOOT_COST` | 5 | [D] |
| 직업 루트 | 전사 검사→파이터→크루세이더→히어로 / 궁수 아처→사수→저격수→신궁 / 마법사 분기(불독·썬콜·비숍, 첫 tier-2 픽이 고정) / 도적 로그→어쌔신→허밋→나이트로드 | [P p.12 + D] |

### 7.6 동료 (CompanionConfig)

| 상수 | 값 | 출처 |
|---|---|---|
| `MAX_COMPANIONS` | 2 | [D] |
| `JOB_GROUP_CARD_COUNT` | 3 (4직업군 중 균등 3장) | [D] |
| `SECOND_JOB_POOL` | 전사 PAGE/FIGHTER/SPEARMAN [P p.15] · 마법사 FP_WIZARD/IL_WIZARD/CLERIC · 궁수 HUNTER/CROSSBOWMAN · 도적 ASSASSIN/BANDIT | [P]/[D] |
| 초기 스킬 | 2차 직업 계열 1차 스킬 2종 중 균등 Lv.1 | [D] |
| 트리거 기본 | `1-3`: AFTER_JOB_ADV / `1-6`: BEFORE_NAMED_BOSS (안내 텍스트 포함) | [D] — stageId는 §7.1 어휘 |
| 공격 | 젠 시퀀스 내 자동 (본캐 후 companionId 순) | C-13 |

### 7.7 몬스터/보스 (MonsterBalance)

| typeId | HP | exp (C-5) | 드랍 | 10젠 행동 |
|---|---|---|---|---|
| `orangemushroom` | 10 [P] | 2 | 갓 30% [D] | 진화→zombiemushroom 50% [D] (1회 판정) |
| `stonegolem` | 15 [P] | 4 | 돌 30% [D] | 증식 50% [D] (인접 우선) |
| `zombiemushroom` | 20 [D] | 4 | 갓 50% [D] | 없음 |
| `mushmom` | 100 [P] | 0 (클리어 보상 대체) | 메소 100 80% / 레드메소 1 20% [D, C-32] + 전리품 3 확정 [D] | 분열 100% [P] (본체 ceil(h/2), 분신 floor(h/2)) |
| `mushmom_split` | 분열 시 계산 | 5 | 메소 50 [D] | 없음 |

공통: `EVOLVE_MULTIPLY_ZEN_AGE=10` [P] · `BOSS_SPLIT_ZEN_AGE=10` [P] · `BOSS_AUTO_SPAWN_ZEN=20` [P] · `BOSS_HEAL_RATIO=0.10` [P] · 보스 패턴 젠당 1롤: 소환 0.35 / 회복 0.25 / 대기 0.40 [D] · `DISSOLVE_DURATION=0.5s` [D] · zenAge는 `zenIndex - spawnZen` 차분 [D] · 보스 1셀 점유 + Scale 1.5 [D] · 클리어 = 본체 처치 기준 [D].

### 7.8 내실 (MetaGrowthBalance — 전부 [D], 상한 검증: atkMul 총합 +7% < 장비 카드 1장 +13%)

능력치 3트랙 (최대 Lv.10, 비용 `floor(100×1.5^Lv)` 메소): atk +0.5%/Lv · exp +1%/Lv · loot +0.3%p/Lv.
내실 장비 3슬롯 (최대 강화 5, 비용 `300×Lv` 메소, Lv4→5 레드메소 1 추가): 수련용 목검 1,000(atk +0.4%/Lv) · 수련복 1,500(exp +0.8%/Lv) · 수련 명패 2,000(loot +0.4%p/Lv).

### 7.9 장비 카드 8종 (EquipmentBalance — 글라디우스만 [P p.16], 나머지 [D]; 중복 합연산, 슬롯 무제한)

`eq_old_gladius` 공격력 +13% · `eq_fruit_knife` atk +8% & atkSpeed +10% · `eq_maple_staff` skillDmg +20% · `eq_battle_bow` range +1 · `eq_work_gloves` crit +10%p · `eq_red_whip` target +1 · `eq_old_maple_book` exp +15% · `eq_lucky_charm` lootDrop +10%p.

### 7.10 경제/BM (BmBalance, LootBalance)

| 상수 | 값 | 출처 |
|---|---|---|
| `LOOT_DROP_CHANCE_NORMAL` | 0.20 | [D] |
| `MESO_DROP_CHANCE_NORMAL` | 0.30, 1~3 | [D] |
| `MESO_STAGE_CLEAR_BONUS` | 50 | [D] |
| 에너지 | MAX 5, 600초/1, 소모 1 (시작/다시/이어) [P 소모처], 레드메소 1 풀충전 | [D] |
| 리롤 | 스테이지당 3회 [P], 배치+선택지 합산 [D], 결과 무조건 랜덤 [P] | |
| 챌린지 코인 | 초기 3, 입장 1 소모, 클리어 환급 | [D, C-25] |

### 7.11 UI 상수 (#8 §3.3/3.4 그대로 채택)

1920×1080 기준, SAFE_MARGIN 60/40, 터치 88×88, 젠 버튼 280×150 하단 중앙, 카드 300×460(모바일 260×400), HP Bar 70×10 / `HPBAR_POOL_SIZE=60` / `HPBAR_OFFSET_Y=-0.45`, 카드 등급 NORMAL #9E9E9E / RARE #3B7BFF / EPIC #A24BFF + BurstNova.

---

## 8. 구현 웨이브 & 워커 분할 (파일 소유권 — 배타적)

> 웨이브 사이에 **오케스트레이터가 Maker refresh** 수행 (`.mlua` → `.codeblock` 생성 → `.model`/`.ui`의 script 참조 가능, builder-protocol §2.5). 워커는 자기 파일만 생성/수정 — 타 워커 파일 수정 발견 = blocking. 모든 워커 공통 의무: `.mlua` 작성 전 msw-scripting SKILL + verify-checklist 전문 Read, builder 사용 전 builder-protocol 전문 Read, RUID는 msw-search (실패 시 "RUID 필요" 마킹), `log()` 체크포인트 삽입, maker_* 호출 금지.

### Wave 1 — 서버/공용 .mlua + 전체 이벤트 (9 워커 병렬)

| 워커 | 파일 (RootDesk/MyDesk/) |
|---|---|
| **W1-core-state** | `Zengard/Core/ZengardGameLogic.mlua`, `Zengard/Core/StageCatalogLogic.mlua`, `Zengard/Core/ModeStageLogic.mlua`, `Zengard/Events/StageStartedEvent.mlua`, `Zengard/Events/StageEndedEvent.mlua` |
| **W1-board-wave** | `Zengard/Board/BoardConfig.mlua`, `Zengard/Board/BoardLogic.mlua`, `Zengard/Board/WaveLogic.mlua`, `Zengard/Events/ZenStartedEvent.mlua` |
| **W1-monsters-boss** | `Zengard/Monsters/MonsterBalance.mlua`, `Zengard/Monsters/MonsterLogic.mlua`, `Zengard/Monsters/BossLogic.mlua`, `Zengard/Monsters/MonsterUnit.mlua`, `Zengard/Events/MonsterKilledEvent.mlua`, `Zengard/Events/MonsterEvolvedEvent.mlua`, `Zengard/Events/BossSpawnedEvent.mlua`, `Zengard/Events/BossKilledEvent.mlua` |
| **W1-combat-jobs** | `Zengard/Combat/CombatConfig.mlua`, `Zengard/Combat/AttackPatternLogic.mlua`, `Zengard/Combat/CombatLogic.mlua`, `Zengard/Combat/CombatFxLogic.mlua`, `Zengard/Jobs/JobLogic.mlua`, `Zengard/Events/JobSelectedEvent.mlua`, `Zengard/Events/AttackSequenceStartedEvent.mlua`, `Zengard/Events/AttackSequenceEndedEvent.mlua` |
| **W1-skills-fusion** | `Zengard/Skills/SkillDataLogic.mlua`, `Zengard/Skills/SkillInventoryLogic.mlua`, `Zengard/Skills/SkillFusionLogic.mlua`, `Zengard/Skills/SkillChoiceLogic.mlua`, `Zengard/Skills/SkillStatLogic.mlua`, `Zengard/Events/FusionActivatedEvent.mlua`, `Zengard/Events/SkillFusedEvent.mlua` |
| **W1-growth-choice** | `Zengard/Growth/GrowthConfig.mlua`, `Zengard/Growth/GrowthLogic.mlua`, `Zengard/Events/LevelUpEvent.mlua`, `Zengard/Events/ChoiceResolvedEvent.mlua`, `Zengard/Events/JobAdvancedEvent.mlua` |
| **W1-companion** | `Zengard/Companion/CompanionConfig.mlua`, `Zengard/Companion/CompanionLogic.mlua`, `Zengard/Companion/CompanionComponent.mlua`, `Zengard/Events/CompanionJoinedEvent.mlua`, `Zengard/Events/CompanionOrderChangedEvent.mlua` |
| **W1-persistence-bm** | `Zengard/Meta/PlayerDataLogic.mlua`, `Zengard/Bm/EnergyLogic.mlua`, `Zengard/Bm/RerollLogic.mlua`, `Zengard/Bm/BmBalance.mlua`, `Zengard/Events/RerollUsedEvent.mlua` |
| **W1-loot-equip-meta** | `Zengard/Loot/LootLogic.mlua`, `Zengard/Equipment/EquipmentLogic.mlua`, `Zengard/Equipment/EquipmentBalance.mlua`, `Zengard/Meta/MetaGrowthLogic.mlua`, `Zengard/Meta/MetaGrowthBalance.mlua`, `Zengard/Events/LootChangedEvent.mlua`, `Zengard/Events/ChoiceExpandedEvent.mlua`, `Zengard/Events/EquipmentGrantedEvent.mlua` |

→ **refresh #1** (전 .mlua codeblock 생성, build 로그 0 에러 확인)

### Wave 2 — .model + 맵/플레이어 (2 워커 병렬; script.MonsterUnit/CompanionComponent 참조 가능 시점)

| 워커 | 파일 |
|---|---|
| **W2-monster-models** | `Models/Monsters/OrangeMushroom.model`, `Models/Monsters/StoneGolem.model`, `Models/Monsters/ZombieMushroom.model`, `Models/Monsters/Mushmom.model` (RUID는 msw-search로 확보; ModelBuilder 경유) |
| **W2-board-map-player** | `Models/MapObjects/BoardBackdrop.model`, `Models/MapObjects/BoardCell.model`, `Models/MapObjects/DirectionIndicator.model`, `Models/Companions/Companion.model`, `map/map01.map` (Backdrop 1 + BoardCell 49 placeModel + 고정 카메라 (0,0.3)), `Global/DefaultPlayer.model` (**Rigidbody/PlayerController Enable=false — ModelBuilder 경유, ARCHITECTURE §4-4 유일 예외; 이 작업이 전투/배치 테스트 선행 조건**) |

→ **refresh #2** (모델 등록 확인; 스폰 스모크 테스트는 오케스트레이터)

### Wave 3 — .ui + 클라 UI 컨트롤러 .mlua (5 워커 병렬; 컨트롤러와 .ui 동일 워커 — C-21)

| 워커 | 파일 |
|---|---|
| **W3-shell-routing** | `Zengard/UI/UIRouterLogic.mlua`, `Zengard/UI/UILobbyLogic.mlua`, `Zengard/UI/UIStageSelectLogic.mlua`, `ui/LobbyGroup.ui`, `ui/StageSelectGroup.ui` |
| **W3-hud-toast** | `Zengard/UI/UIGameHudLogic.mlua`, `Zengard/UI/UIHpBarManagerLogic.mlua`, `Zengard/UI/UIToastLogic.mlua`, `ui/GameHUDGroup.ui`, `ui/WorldHpBarGroup.ui`, `ui/ToastGroup.ui` |
| **W3-popups** | `Zengard/UI/UIChoicePopupLogic.mlua`, `Zengard/UI/UIJobAdvancePopupLogic.mlua`, `Zengard/UI/UICompanionPopupLogic.mlua`, `ui/ChoicePopupGroup.ui`, `ui/JobAdvancePopupGroup.ui`, `ui/CompanionPopupGroup.ui` |
| **W3-combat-result** | `Zengard/UI/UICombatControlLogic.mlua`, `Zengard/UI/UIResultLogic.mlua`, `ui/CombatControlHUD.ui`, `ui/ResultGroup.ui` |
| **W3-side-panels** | `Zengard/UI/UISkillHudLogic.mlua`, `Zengard/UI/UICompanionPanelLogic.mlua`, `Zengard/UI/UIMetaHudLogic.mlua`, `Zengard/UI/UIMetaGrowthPopupLogic.mlua`, `ui/SkillHUD.ui`, `ui/CompanionPanel.ui`, `ui/MetaHud.ui`, `ui/MetaGrowthPopup.ui` |

→ **refresh #3** → Phase 4 검증 루프 (§9; play/logs/screenshot은 오케스트레이터 전담)

---

## 9. 검증 체크리스트 (기획서 페이지 → 확인 방법)

> 절차: refresh → `logs(category="build")` 0 에러 → play → 시나리오 입력 → 런타임 로그 키워드 확인 → screenshot 시각 대조. blocking 이슈 0이 될 때까지 수정 루프 (실패 시 해당 워커 재작업 → 리뷰 → 재검증).

| # | 기획서 | 요구 | 확인 방법 (로그 키워드 / 스크린샷 포인트) |
|---|---|---|---|
| V1 | p.4, p.21 | 7×7 퍼즐판 + 헤네시스 배경, 고정 카메라, 모바일 수용 | screenshot: 보드 49셀 + 배경 가시 (p.4 시안 대조). 모바일 해상도 screenshot — 상하 클리핑 확인 |
| V2 | p.8 | 젠 버튼 클릭 → 몬스터 5(스테이지별) 랜덤 배치, 캐릭터 랜덤 재배치 | `[WaveLogic] zen started:`, `monster spawned:` ×n; screenshot: 젠 버튼(하단 중앙) p.8 대조 |
| V3 | p.9 | 처치 무관 다음 젠, 몬스터 누적, 임계 초과 실패 | 연속 RequestZen → `MonsterCount` 단조 증가 로그 → `stage failed: monster_overflow` |
| V4 | p.9, p.20 | 20젠 보스 등장, 처치 시 클리어 / 미처치 실패 | `boss spawned: mushmom` (zen 20), `BossKilledEvent` → `stage cleared`; ResultGroup screenshot |
| V5 | p.10 | 직업 4종 선택, 직업별 패턴 (전사4칸/궁수직선/마법사8칸/도적원거리) | StageSelect에서 4직업 각 1런; `cast skill:` 로그의 타겟 셀 수로 패턴 확인 |
| V6 | p.10~11 | 수동(방향/순서 지정)·자동(랜덤) 전투 | `RequestSetCombatConfig` 로그 + 수동 방향 고정 vs 자동 방향 변동 로그 비교; DirectionIndicator screenshot |
| V7 | p.11~12 | 1차 스킬 2택, 스킬 Lv.3 만렙, 패시브 선택지 등장 | `GrantSkill`, `LevelUpSkill→false(만렙)`, 선택지 후보 로그에 패시브 포함 |
| V8 | p.13 | 합성: 활성화(Lv.3+보유)/완료(선택지 선택) 분리, 재료 삭제 | `[Fusion] activated: recipe_archer_double_ice` → 합성 카드 선택 → `[Fusion] completed` + 보유 목록에서 재료 2종 소멸 확인 |
| V9 | p.14 | 경험치/레벨업/선택지 3개(스킬90%/장비10%), 노출 3회 → 전직 활성, 전리품 부족 보류 | `LevelUp(n)`, `ChoiceOffered(setId, 3)`, `JobAdvanced(tier)` / `AdvanceDeferred` 로그 |
| V10 | p.14, p.16 | 선택지 3→5 확장(전리품 5), 확장 시 장비 확률 0.15 | `Expanded(5)` 로그 + 5장 screenshot (1920 내 수용) |
| V11 | p.15 | 동료: 트리거(전직 후/보스 전) 합류, 직업군 선택지, 2차 랜덤, 방향/순서 지정, 자동 공격 | `companion joined: <secondJob>` 로그 (1-3 전직 후 / 1-6 보스 젠 직전), CompanionPanel 입력 → `CompanionOrderChangedEvent` 로그 |
| V12 | p.16 | 장비 카드 10% 등장·고효율·스테이지 종료 시 소멸 | `equipment granted:` 로그 → 데미지 로그 배수 확인 → 재입장 후 `GetEquipStatMultipliers` 0 확인 |
| V13 | p.17 | 내실: 계정 귀속, 영향 ≤ +7% | `MetaGrowthPopup` 강화 → 재접속 후 값 유지 (`data loaded` 로그) |
| V14 | p.18 | 에너지 소모(시작/다시/이어), 리롤 3회 제한 | `energy consumed:` ×3 사유별, `RerollUsedEvent remaining=2,1,0` → 4번째 거부 로그 |
| V15 | p.19 | 주황버섯 HP10/스톤골렘 HP15, 드랍, 10젠 진화/증식, HP Bar, 디졸브 | `ApplyDamage` HP 추이, `evolved`/`multiplied` 로그 (10젠 방치 런), screenshot: 셀 하단 HP Bar (p.19/23 대조), 처치 디졸브 |
| V16 | p.20 | 머쉬맘 HP100, 소환/회복 패턴, 10젠 분열, 메소/레드메소 드랍 | `boss pattern: summon|heal|idle` 젠별 로그, `boss split` (보스 10젠 방치), `BossKilledEvent drops` |
| V17 | p.22 | 모드 3종: 챌린지 코인 1 소모·환급·이어하기 불가, 타임어택 기록 | 입장 검증 로그, `RequestContinue` 거부(챌린지), `best time` 갱신 로그 |
| V18 | p.23 | 로비/HUD/체력바 레이아웃 | screenshot: 로비 3버튼, HUD(젠 버튼/WAVE 카운터/EXP 바/임계 카운터) p.23 시안 대조 |
| V19 | p.7 | 스테이지 [1-1]~[1-6] 해금 진행, 최근 플레이 포커스 | 1-1 클리어 → 1-2 해금 로그, 재진입 시 포커스 노드 확인 |
| V20 | 공통 | 로그라이크 리셋: 재입장 시 Lv.1/스킬/장비/동료 초기화 | `InitForStage` 후 `GetLevel==1`, 보유 스킬 0, 동료 0 확인 |

---

## 10. 오픈 리스크 (검증 단계 집중 항목)

1. **DefaultPlayer 물리 비활성 후 ATTACK 모션**: Rigidbody/PlayerController Enable=false 상태에서 `StateComponent:ChangeState("ATTACK")` 재생 여부 미검증 — 실패 시 AvatarRenderer 직접 액션 재생 폴백 (W1-combat-jobs + W2-board-map-player 교차 검증).
2. **모바일 세로 클리핑**: 보드 5.6 unit > Mobile 5.4 unit — 카메라 OrthographicSize 미세 확대로 흡수, V1에서 모바일 screenshot 필수.
3. **RUID 확보 불확실** (헤네시스 배경/몬스터 클립/스킬 아이콘 다수): msw-search 실패 시 "RUID 필요" 마킹, 배경은 msw-painter 폴백. `SpriteRUID` 빈 문자열 금지.
4. **서버 @Logic의 `wait()` 시퀀스 블로킹**: ExecuteZenCombat 5스킬 ≈ 3초 — 구현 시 `_TimerService` 타이머 체인 대체 검토, 최소한 processingZen 가드로 재진입 차단.
5. **@Logic Client RPC 푸시 레이스**: UI OnBeginPlay 타이밍 — 클라발 `RequestSync` 1회로 완화, 멀티유저 푸시 누락은 검증 항목.
6. **HP Bar 60개 1/60 동기화 성능**: 임계 40 기준 정상 범위지만 V15에서 프레임 확인.
7. **기획서 이미지 전용 수치** (p.16 장비 카드 7종, p.11 데미지 연출 등): [D] 값으로 확정 — 이미지 판독 가능해지면 §7만 교체.
8. **p.8 vs p.9 몬스터 재배치 서술 차이**: `REPOSITION_MONSTERS_ON_ZEN=false` 기본 + 플래그 — 기획 확인 시 플래그만 변경.
9. **DataStorage 크레딧 규율**: 킬/프레임 단위 호출 금지 — 코드 리뷰 blocking 기준 (리뷰어 체크리스트 등재).
10. **밸런스 [D] 값 다수**: 데이터 주도 격리 완료 — 플레이테스트 후 §7 테이블만 수정.
11. **유저 입장/퇴장 네이티브 이벤트 시그니처**: 구현 시 `Environment/NativeScripts/Event/` `.d.mlua` 실물 확인 후 확정 (추측 금지).
12. **디졸브 material 카탈로그**: 구현 턴에 material.md + MCP retriever로 셰이더 확정, 실패 시 Color 알파 트윈 폴백.
