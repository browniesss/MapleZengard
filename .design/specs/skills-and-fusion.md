# skills-and-fusion — 스킬 & 스킬 합성 시스템 상세 스펙

> 기준 문서: `.design/ARCHITECTURE.md` (시스템 #3, 기획서 p.11~13)
> 기획서: `20260612_모아요_MSW 협업 월드_5차 게임 기획서.pdf` — 요구사항의 단일 진실
> 본 스펙은 구현 직전 단계 산출물이다. 이 단계에서 구현 파일(.mlua/.model/.ui)은 생성하지 않는다.
> 최종 이벤트/모델 id 명세는 `MASTER_PLAN.md`가 단일 진실 — 충돌 시 MASTER_PLAN 우선.

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (페이지 인용) | 구현 항목 |
|---|---|---|
| R1 | "최초 선택지는 클래식 메이플스토리의 1차 스킬로 등장하며 모든 직업군은 2개의 선택지 등장" (p.11) | `SkillChoiceLogic:GetInitialChoices()` — 직업별 공격 스킬 2종 1택 |
| R2 | "궁수는 '더블샷', '애로우블로우' 중 선택" + "궁수 직업군 선택 시 최초 선택지는 공격 스킬로 등장" (p.11) | 최초 선택지 풀 = 공격 스킬만 (패시브/재료 스킬 제외) |
| R3 | "최초 스킬 선택 이후, 공격 방향은 플레이어가 직접 설정 가능(이후부터는 랜덤)" (p.11) | 방향 입력은 jobs-and-combat 소유. 본 시스템은 `directional` 플래그를 스킬 데이터에 제공 (§5 계약) |
| R4 | "1차 스킬 또한 스킬마다 스킬 효과가 다름" (p.11) | 스킬별 shape/hits/damage/element 데이터 구조 (§3) |
| R5 | 직업별 1차 스킬 카탈로그: 전사 파워 스트라이크·슬래시 블러스트 / 궁수 애로우 블로우·더블샷 / 마법사 에너지 볼트·매직 클로 / 도적 더블 스텝·럭키 세븐 (p.12) | 8종 스킬 데이터 (§3.2). 명칭은 기획서 표기 그대로 |
| R6 | "각 직업군마다 가지고 있는 패시브 스킬은 선택지에서 선택 가능한 스킬로 등장" (p.12) | 직업별 패시브 1종 (§3.3) — 레벨업 선택지 풀에 포함 |
| R7 | "2차 전직 스킬을 고를 경우, 해당 스킬을 사용하는 2차 전직 루트가 활성화 … 전직 루트는 고정" (p.12) | 본 시스템 범위 밖 (level-choice-jobadv 소유). 스킬 데이터 스키마에 `jobTier`/`advRoute` 필드만 예약 (§3.1) |
| R8 | "활성화 조건과 완료 조건이 따로 존재" (p.13) | 활성화/완료 2단계 상태 머신 (§4.1) |
| R9 | "단일 스킬 LV.3 보유(만렙) + 합성 대상 스킬 보유(레벨 무관, LV.1도 가능) ⇒ 스킬 합성 시스템 활성화 조건" (p.13) | `RefreshFusionActivation()` 판정 (§7.2). `SKILL_MAX_LEVEL = 3` |
| R10 | "선택지에 활성화된 합성 스킬이 등장(확률적으로 등장하며, 무조건 등장하는 것은 X)" (p.13) | 합성 선택지 확률 등장 (§7.1). 확률값은 미명시 → [설계 결정 D5] |
| R11 | "합성 스킬 선택지를 선택 시, 스킬 합성이 완료" (p.13) | `TryCompleteFusion()` (§7.3) |
| R12 | "모든 스킬이 합성되는 것은 아니고 고정된 합성 조합식이 존재" (p.13) | 고정 레시피 테이블 (§4.2) — 데이터 주도 |
| R13 | 합성 예시: "더블샷 Lv.3 + 아이스샷 = 더블 아이스샷" (p.13) | 궁수 레시피로 그대로 수록. 아이스샷은 궁수 선택지 풀에 등장하는 재료 스킬 (§3.2) |
| R14 | "선택지에서 합성 스킬이 나타나고 + 선택해야 스킬 사용이 가능" (p.13) | 활성화만으로는 사용 불가 — 선택 전까지 인벤토리 미부여 |
| R15 | "합성 대상 스킬들은 스킬 합성 시 삭제" (p.13) | `TryCompleteFusion()`에서 재료 2종 제거 후 결과 스킬 Lv.1 부여 |
| R16 | "이전에 등장한 스킬 재등장 및 패시브 스킬도 선택지로 등장" (p.14) | 선택지 후보 = 신규 + 보유 스킬 레벨업 + 패시브 + 활성화된 합성 (§7.1) |
| R17 | "레벨업 시 스킬 포인트 획득 및 선택지 등장" (p.14) / "선택지 구성은 스킬 90% 확률, 장비 10% 확률" (p.14) | 90/10 추첨은 level-choice-jobadv 소유. 본 시스템은 스킬 슬롯 후보만 공급 (§5) |
| R18 | "스테이지 입장 시 Lv.1부터 시작, 스테이지 종료 시 초기화" (p.14, ARCHITECTURE §0) | `ResetUser()` — `StageEndedEvent` 수신 시 전원 초기화 |

**[설계 결정] 목록** (기획서 미명시 — 프로토타입 관점에서 확정, 질문 없이 결정):

| ID | 결정 | 근거 |
|---|---|---|
| D1 | 스킬별 데미지/사거리/히트 수 수치 전체 (§3.2~3.4) | 기획서에 수치 없음 (p.11 예시 이미지의 "113", "1 111"은 데미지 연출 예시로만 해석). 몬스터 HP 10/15/100 (기획서 p.19~20, ARCHITECTURE §2 #7) 기준으로 역산 |
| D2 | 패시브 스킬 구성: 직업당 1종, 효과는 FLAT_DAMAGE / CRIT_CHANCE / EXTRA_ACTION 3유형 | p.12는 "패시브 스킬 등장"만 명시. 프로토타입 최소 구성 |
| D3 | 직업당 합성 레시피 1종 (§4.2). 궁수는 기획서 명시 조합(R13), 나머지 3직업은 카탈로그 내 조합으로 신규 재료 스킬 추가 최소화 | "직업당 최소 1개" 요구. 아이스샷 외 재료 스킬 추가는 콘텐츠 비용 대비 검증 가치 낮음 |
| D4 | 합성 결과 스킬도 Lv.1로 부여, Lv.3까지 성장 가능. 합성 스킬의 재합성 레시피는 프로토타입에 없음 | p.13에 결과 스킬 레벨 미명시 — 성장 루프 유지 위해 Lv.1 시작 |
| D5 | 합성 선택지 등장 확률: 활성화된 레시피가 1개 이상이면 레벨업 선택지 생성 시 30% 확률로 슬롯 1개를 합성 후보로 치환 | p.13 "확률적으로 등장" — 수치 미명시. 평균 3~4회 레벨업 내 노출되도록 30% |
| D6 | 기본 크리티컬 확률 10%, 크리티컬 배율 ×2.0 | 미명시. 패시브(크리티컬 샷) 가치가 체감되는 최소 기준선 |
| D7 | 쿨다운 없음 — 스킬은 플레이어가 지정한 순서(수동) 또는 랜덤 순서(자동)로 순환 사용 | p.10 "스킬 순서 설정"이 핵심 인터랙션이므로 쿨다운보다 순서 큐가 적합 |
| D8 | 속성(element)은 데이터 태그 + 이펙트 차별화만. 프로토타입에서 속성별 추가 상태이상 없음 | ICE 등 속성 효과 기획 미명시. 합성 재료 식별/연출용으로만 사용 |
| D9 | 보유 스킬 상한 8 (패시브 포함) | HUD 표시 한계. 상한 도달 시 신규 스킬 후보 제외, 레벨업/합성 후보만 등장 |
| D10 | RANGED_TARGET 타겟 선정: 사거리 내 최근접 몬스터, 동률 시 랜덤 | p.10 도적 "타겟 선택 공격" — 자동 전투 시 선정 규칙 미명시 |
| D11 | 2차+ 스킬(파이어애로우/썬더볼트/블레스 등, p.12)은 데이터 스키마만 예약하고 본 스펙 데이터에 미수록 | 전직은 시스템 #4(level-choice-jobadv) 소유. 스키마 호환만 보장 |

---

## 2. 시스템 경계

| 책임 | 소유 시스템 |
|---|---|
| 스킬 데이터(데미지/범위/속성), 보유/레벨, 합성 상태 머신, 선택지 후보 공급 | **skills-and-fusion (본 스펙)** |
| 스킬 실행(범위 셀 판정, 데미지 적용, HP 차감, 이펙트 재생), 공격 방향 입력 | jobs-and-combat |
| 레벨업 감지, 선택지 3개 구성(스킬 90%/장비 10%), 선택지 카드 UI 호출 | level-choice-jobadv |
| 선택지 카드 팝업 `.ui` | ui-modes-stages (`ChoicePopupGroup`) |
| cell(col,row) ↔ world 변환 | BoardLogic (board-and-wave) |

본 시스템은 **데이터와 상태의 단일 소스**이고, 실행과 연출은 소비자 시스템이 담당한다.
단, 범위 shape → 셀 오프셋 해석 규약(§8.3)은 본 스펙이 정의하고 jobs-and-combat이 준수한다.

---

## 3. 스킬 데이터 구조 & 밸런스 테이블

### 3.1 스킬 데이터 스키마 (`SkillDataLogic` 상수 테이블)

```lua
-- skillId(string) → record
{
  skillId      = "archer_double_shot",  -- string, 전역 유일
  displayName  = "더블샷",               -- 게임 내 노출 텍스트 (한국어)
  job          = "archer",              -- "warrior"|"archer"|"mage"|"thief"|"common"
  jobTier      = 1,                     -- 1차 스킬. 2차+는 D11에 따라 예약만
  advRoute     = "",                    -- 2차 전직 루트 키 (D11 예약 필드, 1차는 빈 문자열)
  kind         = "ACTIVE",              -- "ACTIVE" | "PASSIVE" | "FUSION"
  shape        = "LINE",                -- §3.5 shape 키
  range        = 7,                     -- shape별 의미 (§3.5)
  hits         = 2,                     -- 1회 시전당 타격 횟수
  damagePerLv  = { 2, 3, 4 },           -- Lv.1~3 히트당 데미지 (SKILL_MAX_LEVEL=3)
  element      = "NONE",                -- "NONE" | "ICE" | "FIRE" | "LIGHTNING" | "HOLY" (D8: 태그만)
  directional  = true,                  -- 방향 입력 대상 여부 (R3)
  passiveType  = "",                    -- PASSIVE 전용: "FLAT_DAMAGE"|"CRIT_CHANCE"|"EXTRA_ACTION"
  passiveValuePerLv = {},               -- PASSIVE 전용 수치
  iconRuid     = "",                    -- §11에서 검색. 빈 값 금지 — 구현 시 확보 실패면 "RUID 필요" 마킹
  effectRuid   = "",                    -- 시전/타격 이펙트
  soundRuid    = "",
}
```

### 3.2 1차 액티브 스킬 8종 + 재료 스킬 1종 — 밸런스 [설계 결정 D1]

> 기준: 주황버섯 HP 10, 스톤골렘 HP 15, 보스 머쉬맘 HP 100 (기획서 p.19~20 수치 그대로).
> Lv.1 단일기로 주황버섯 2~3회 처치, Lv.3 광역기로 1~2회 정리되도록 설계.

| skillId | 이름 | 직업 | shape | range | hits | 데미지 Lv.1/2/3 (히트당) | element | directional |
|---|---|---|---|---|---|---|---|---|
| `warrior_power_strike` | 파워 스트라이크 | 전사 | ADJACENT4_SINGLE | 1 | 1 | 4 / 6 / 9 | NONE | false |
| `warrior_slash_blast` | 슬래시 블러스트 | 전사 | ADJACENT4 | 1 | 1 | 2 / 3 / 5 | NONE | false |
| `archer_arrow_blow` | 애로우 블로우 | 궁수 | LINE (관통) | 7 | 1 | 2 / 3 / 5 | NONE | true |
| `archer_double_shot` | 더블샷 | 궁수 | LINE (최근접 1체) | 7 | 2 | 2 / 3 / 4 | NONE | true |
| `archer_ice_shot` | 아이스샷 (재료) | 궁수 | LINE (최근접 1체) | 7 | 1 | 3 / 4 / 6 | ICE | true |
| `mage_energy_bolt` | 에너지 볼트 | 마법사 | ADJACENT8 | 1 | 1 | 2 / 3 / 4 | NONE | false |
| `mage_magic_claw` | 매직 클로 | 마법사 | RANGED_TARGET | 3 | 2 | 1 / 2 / 3 | NONE | false |
| `thief_double_stab` | 더블 스텝 | 도적 | RANGED_TARGET | 2 | 2 | 2 / 3 / 4 | NONE | false |
| `thief_lucky_seven` | 럭키 세븐 | 도적 | RANGED_TARGET | 5 | 2 | 2 / 3 / 4 | NONE | false |

- 명칭은 기획서 p.12 표기 그대로 (도적 "더블 스텝" 포함).
- `archer_ice_shot`은 1차 카탈로그 외 재료 스킬 — 최초 선택지(R2)에는 미등장, 레벨업 선택지 풀에만 등장.
- 마법사 ADJACENT8은 p.10 "캐릭터 주변 8칸, 범위 공격" 명시를 에너지 볼트에 배정 [설계 결정]. 매직 클로는 클래식 메이플의 2히트 단일기 정체성 유지.
- 도적 RANGED_TARGET은 p.10 "비교적 긴 사거리로 타겟 선택 공격" 반영. 럭키 세븐은 추가로 크리티컬 확률 +10%p 보정 (스킬 고유 보너스, §6 데미지 식 참조) [설계 결정].

### 3.3 패시브 스킬 4종 [설계 결정 D2]

| skillId | 이름 | 직업 | passiveType | 수치 Lv.1/2/3 |
|---|---|---|---|---|
| `warrior_power_mastery` | 워리어 마스터리 | 전사 | FLAT_DAMAGE | +1 / +2 / +3 (히트당) |
| `archer_critical_shot` | 크리티컬 샷 | 궁수 | CRIT_CHANCE | +10%p / +20%p / +30%p |
| `mage_spell_mastery` | 스펠 마스터리 | 마법사 | FLAT_DAMAGE | +1 / +2 / +3 (히트당) |
| `thief_nimble_body` | 님블 바디 | 도적 | EXTRA_ACTION | 행동 시 5% / 10% / 15% 확률로 동일 스킬 1회 추가 시전 |

- 패시브는 자기 직업 스킬에만 적용. 레벨업 선택지 풀에 액티브와 동일 가중치로 등장 (R6, R16).
- EXTRA_ACTION 추가 시전의 재귀 발동 금지 (§9 E8).

### 3.4 합성 결과 스킬 4종 [설계 결정 D1·D4]

| skillId | 이름 | 직업 | shape | range | hits | 데미지 Lv.1/2/3 (히트당) | element |
|---|---|---|---|---|---|---|---|
| `warrior_power_blast` | 파워 블러스트 | 전사 | ADJACENT4 | 1 | 1 | 6 / 8 / 11 | NONE |
| `archer_double_ice_shot` | 더블 아이스샷 | 궁수 | LINE (최근접 1체) | 7 | 2 | 4 / 5 / 7 | ICE |
| `mage_energy_claw` | 에너지 클로 | 마법사 | ADJACENT8 | 1 | 2 | 2 / 3 / 4 | NONE |
| `thief_triple_seven` | 트리플 세븐 | 도적 | RANGED_TARGET | 5 | 3 | 3 / 4 / 5 | NONE |

- 합성 스킬 Lv.1은 재료 Lv.3 단일기보다 총 데미지 기대값이 높도록 설계 (재료 2종 삭제 비용 보상).
- `archer_double_ice_shot`은 기획서 p.13 명시 조합의 결과물 — 명칭 그대로.

### 3.5 shape 정의 (jobs-and-combat과의 공유 규약)

| shape | range 의미 | 대상 판정 |
|---|---|---|
| `ADJACENT4` | 고정 1 | 자신 셀 기준 상/하/좌/우 4칸 전체 (p.10 전사) |
| `ADJACENT4_SINGLE` | 고정 1 | 상/하/좌/우 4칸 중 몬스터 1체 (최대 HP 우선, 동률 랜덤) |
| `ADJACENT8` | 고정 1 | 주변 8칸 전체 (p.10 마법사) |
| `LINE` | 직선 길이(셀 수) | 바라보는 방향 직선 (p.10 궁수). 관통(`hits` 무관, 라인 전체) 또는 최근접 1체 — 스킬별 `linePierce` boolean 필드로 구분: `archer_arrow_blow`만 true |
| `RANGED_TARGET` | 체비셰프 거리 상한 | 사거리 내 최근접 몬스터 1체, 동률 랜덤 [D10] (p.10 도적) |

- 거리 척도: 체비셰프 거리(`max(|dc|,|dr|)`) [설계 결정] — 8방향 인접을 1로 취급해 ADJACENT8과 일관.
- 셀 → world 변환은 BoardLogic 단일 소스 (ARCHITECTURE §1). 본 시스템은 셀 오프셋까지만 정의.

### 3.6 상수 테이블

| 상수 | 값 | 출처 |
|---|---|---|
| `SKILL_MAX_LEVEL` | 3 | 기획서 p.13 "LV.3 보유(만렙)" |
| `INITIAL_CHOICE_COUNT` | 2 | 기획서 p.11, p.14 "최초 스테이지 진입 시: 2개 중 1개 선택" |
| `LEVELUP_CHOICE_COUNT` | 3 | 기획서 p.14 "3개 선택지 중 1개 선택" (선택지 3→5 확장은 시스템 #4 소유) |
| `FUSION_CHOICE_CHANCE` | 0.30 | [설계 결정 D5] |
| `BASE_CRIT_CHANCE` | 0.10 | [설계 결정 D6] |
| `CRIT_MULTIPLIER` | 2.0 | [설계 결정 D6] |
| `LUCKY_SEVEN_CRIT_BONUS` | 0.10 | [설계 결정] §3.2 |
| `MAX_OWNED_SKILLS` | 8 | [설계 결정 D9] |

---

## 4. 합성 시스템 상태 머신

### 4.1 레시피 상태 (per user × recipe)

```
LOCKED ──(재료A Lv.3 도달 AND 재료B 보유)──▶ ACTIVATED ──(선택지 등장+선택)──▶ COMPLETED
   ▲                                            │
   └──(재료 조건 상실 — 방어적 재검증, §9 E3)────┘
```

- **활성화 조건** (R9): `level(materialA) == 3 AND owned(materialB)` — materialB 레벨 무관(Lv.1 가능).
- 레시피는 무순서가 아님: materialA가 "Lv.3 필요" 슬롯, materialB가 "보유만" 슬롯. 단, 양쪽 모두 Lv.3이면 어느 쪽이든 충족 → 판정은 `(lvA==3 and owned(B)) or (lvB==3 and owned(A))` [설계 결정 — 기획서 "단일 스킬 LV.3 + 합성 대상 스킬 보유"를 대칭으로 해석].
- **완료 조건** (R10·R11·R14): ACTIVATED 레시피의 결과 스킬이 선택지에 확률 등장 → 플레이어가 선택 → COMPLETED. 활성화만으로는 사용 불가.
- **완료 처리** (R15): 재료 2종 인벤토리에서 삭제, 결과 스킬 Lv.1 부여, `SkillFusedEvent` 발신.

### 4.2 고정 합성 레시피 테이블 (R12·R13, [설계 결정 D3])

| recipeId | materialA | materialB | result | 비고 |
|---|---|---|---|---|
| `recipe_archer_double_ice` | `archer_double_shot` | `archer_ice_shot` | `archer_double_ice_shot` | **기획서 p.13 명시 조합** |
| `recipe_warrior_power_blast` | `warrior_power_strike` | `warrior_slash_blast` | `warrior_power_blast` | [설계 결정] |
| `recipe_mage_energy_claw` | `mage_energy_bolt` | `mage_magic_claw` | `mage_energy_claw` | [설계 결정] |
| `recipe_thief_triple_seven` | `thief_lucky_seven` | `thief_double_stab` | `thief_triple_seven` | [설계 결정] |

- 레시피는 비공개 — "정보를 공개하거나 유저가 모험을 통해 알아간다" (p.13). 프로토타입에서는 UI에 레시피 목록을 노출하지 않고, 활성화 시 알림만 표시 [설계 결정].
- 데이터 주도 구조이므로 레시피 추가는 테이블 행 추가만으로 가능.

---

## 5. 파일 매니페스트

모든 `.mlua`는 `RootDesk/MyDesk/Zengard/Skills/` 하위 (ARCHITECTURE §3). 게임 상태는 서버 권위 (ARCHITECTURE §4-8).

| 파일 | 타입 | ExecSpace | 책임 |
|---|---|---|---|
| `RootDesk/MyDesk/Zengard/Skills/SkillDataLogic.mlua` | `@Logic` | 메서드 ExecSpace 미지정 (서버/클라 공용 읽기) | §3 스킬 데이터·레시피·상수 테이블의 단일 소스. 순수 조회만, 상태 없음 |
| `RootDesk/MyDesk/Zengard/Skills/SkillInventoryLogic.mlua` | `@Logic` | 상태 변경 `ServerOnly`, HUD 통지 `@ExecSpace("Client")` RPC | per-user 보유 스킬/레벨/스킬 순서 큐. `ResetUser` (R18). `SkillAcquiredEvent`/`SkillLevelUpEvent` 발신 |
| `RootDesk/MyDesk/Zengard/Skills/SkillFusionLogic.mlua` | `@Logic` | `ServerOnly` | 레시피 활성화 판정(§7.2), 합성 실행(§7.3), `FusionActivatedEvent`/`SkillFusedEvent` 발신 |
| `RootDesk/MyDesk/Zengard/Skills/SkillChoiceLogic.mlua` | `@Logic` | `ServerOnly` | 최초/레벨업 선택지 후보 추첨(§7.1), 선택 적용·재검증. level-choice-jobadv가 호출 |
| `RootDesk/MyDesk/Zengard/Skills/SkillStatLogic.mlua` | `@Logic` | 메서드 ExecSpace 미지정 (서버 호출 전제) | 패시브 합산 데미지/크리 계산 (§8.4). jobs-and-combat이 호출 |
| `RootDesk/MyDesk/Zengard/Skills/Events/SkillAcquiredEvent.mlua` | `@Event` | — | `{ userId: string, skillId: string, level: integer }` |
| `RootDesk/MyDesk/Zengard/Skills/Events/SkillLevelUpEvent.mlua` | `@Event` | — | `{ userId: string, skillId: string, newLevel: integer }` |
| `RootDesk/MyDesk/Zengard/Skills/Events/FusionActivatedEvent.mlua` | `@Event` | — | `{ userId: string, recipeId: string }` |
| `RootDesk/MyDesk/Zengard/Skills/Events/SkillFusedEvent.mlua` | `@Event` | — | `{ userId: string, recipeId: string, resultSkillId: string }` |
| `RootDesk/MyDesk/Zengard/Skills/UI/SkillHUDComponent.mlua` | `@Component` | `ClientOnly` | `ui/SkillHUD.ui` 루트에 부착. 보유 스킬 아이콘/레벨 표시, 합성 활성화 뱃지 |
| `ui/SkillHUD.ui` | UI | — | 좌하단 보유 스킬 슬롯 8칸 + 레벨 표기 + 합성 알림 뱃지. **UIBuilder 경유 작성** |

- `.model` 산출물 없음 — 스킬 이펙트는 `_EffectService:PlayEffect(RUID)`로 재생(엔티티 모델 불필요), 투사체 모델은 jobs-and-combat 소유.
- 선택지 카드 팝업 `.ui`는 ui-modes-stages 소유 (`ChoicePopupGroup`) — 본 시스템은 후보 데이터만 공급.
- 밸런스 테이블은 프로토타입에선 `SkillDataLogic` 내 Lua 상수 테이블로 유지 [설계 결정] — `.userdataset` 분리는 밸런싱 단계 과제로 이연 (§10 위험 참조).

---

## 6. API / 이벤트 계약

### 6.1 노출 API (다른 시스템이 호출)

```lua
-- SkillDataLogic (ExecSpace 미지정 — 양측 조회 가능, 순수 데이터)
_SkillDataLogic:GetSkillData(skillId: string) -> table        -- §3.1 레코드. 미존재 시 nil
_SkillDataLogic:GetJobInitialSkillIds(jobId: string) -> table -- 직업별 공격 스킬 2종 (R1·R2)
_SkillDataLogic:GetJobSkillPool(jobId: string) -> table       -- 신규 획득 가능 풀 (액티브+재료+패시브)
_SkillDataLogic:GetRecipe(recipeId: string) -> table          -- §4.2 행
_SkillDataLogic:GetRecipesByJob(jobId: string) -> table

-- SkillInventoryLogic (ServerOnly)
_SkillInventoryLogic:GetOwnedSkills(userId: string) -> table  -- { {skillId, level}, ... }
_SkillInventoryLogic:GetSkillLevel(userId: string, skillId: string) -> integer  -- 미보유 0
_SkillInventoryLogic:GrantSkill(userId: string, skillId: string)               -- Lv.1 부여
_SkillInventoryLogic:LevelUpSkill(userId: string, skillId: string) -> boolean  -- 만렙이면 false
_SkillInventoryLogic:RemoveSkill(userId: string, skillId: string)              -- 합성 시 재료 삭제 전용
_SkillInventoryLogic:GetSkillOrder(userId: string) -> table   -- 시전 순환 큐 (D7)
_SkillInventoryLogic:SetSkillOrder(userId: string, orderedSkillIds: table)     -- 수동 모드 (p.10)
_SkillInventoryLogic:ResetUser(userId: string)                -- 스테이지 종료 초기화 (R18)

-- SkillFusionLogic (ServerOnly)
_SkillFusionLogic:GetActivatedRecipeIds(userId: string) -> table
_SkillFusionLogic:RefreshFusionActivation(userId: string)     -- 인벤토리 변경 후 재판정 (§7.2)
_SkillFusionLogic:TryCompleteFusion(userId: string, recipeId: string) -> boolean  -- §7.3

-- SkillChoiceLogic (ServerOnly) — level-choice-jobadv가 호출
_SkillChoiceLogic:GetInitialChoices(userId: string, jobId: string) -> table
--   반환: { {skillId, kind="NEW"}, {skillId, kind="NEW"} }  (항상 2개, R1)
_SkillChoiceLogic:GetChoiceCandidates(userId: string, slotCount: integer) -> table
--   반환: { {skillId, kind="NEW"|"LEVELUP"|"FUSION", recipeId?}, ... }  최대 slotCount개.
--   후보 고갈 시 부족분만큼 짧은 리스트 반환 — 대체(장비/재화)는 호출 측 책임 (§9 E1)
_SkillChoiceLogic:ApplyChoice(userId: string, choice: table) -> boolean
--   choice = GetChoiceCandidates가 반환한 원소 그대로. 적용 시점 재검증 실패 시 false (§9 E2)

-- SkillStatLogic (서버 호출 전제) — jobs-and-combat이 호출
_SkillStatLogic:ComputeHitDamage(userId: string, skillId: string) -> table
--   반환: { damage: integer, isCritical: boolean }  (히트 1회분, §8.4)
_SkillStatLogic:RollExtraAction(userId: string) -> boolean    -- 님블 바디 추가 행동 (§3.3)
```

> 주의: RPC 경계를 넘는 파라미터에 `any` 금지, 엔진 enum 금지 (msw-scripting §6) — 모든 계약은 string/integer/table로 구성했다. `kind`/`shape`/`element`는 string 키.

### 6.2 발신 이벤트

| 이벤트 | 발신 주체 | 페이로드 | 주 소비자 |
|---|---|---|---|
| `SkillAcquiredEvent` | SkillInventoryLogic | userId, skillId, level | SkillHUD(클라 갱신), jobs-and-combat(시전 큐 갱신) |
| `SkillLevelUpEvent` | SkillInventoryLogic | userId, skillId, newLevel | SkillHUD |
| `FusionActivatedEvent` | SkillFusionLogic | userId, recipeId | SkillHUD(뱃지/토스트), ui-modes-stages |
| `SkillFusedEvent` | SkillInventoryLogic 경유 SkillFusionLogic | userId, recipeId, resultSkillId | SkillHUD, jobs-and-combat(시전 큐 재구성), 연출 |

이벤트 구독은 `@EventSender("Logic", "<LogicName>")` 또는 `ConnectEvent` — 클라 HUD 갱신은 `@ExecSpace("Client")` RPC(대상 userId 지정)로 직렬화된 테이블 전달.

### 6.3 의존하는 외부 계약

| 외부 계약 | 소유 | 용도 |
|---|---|---|
| `LevelUpEvent` / 선택지 트리거 | level-choice-jobadv | 레벨업 시 `GetChoiceCandidates` 호출 주체. 90% 스킬/10% 장비 추첨도 그쪽 소유 (R17) |
| `StageEndedEvent` | ZengardGameLogic (ARCHITECTURE §5) | 수신 시 전 유저 `ResetUser` (R18) |
| `BoardLogic` cell↔world 변환 | board-and-wave | §8.3 셀 판정 결과의 월드 좌표화 (시전 연출은 combat 소유) |
| 플레이어 직업 조회 `GetUserJob(userId)` | jobs-and-combat | 선택지 풀 필터링. MASTER_PLAN에서 시그니처 확정 필요 |
| 보드 점유 상태 조회 `GetMonsterAt(col,row)` 등 | board-and-wave | §8.3 범위 판정은 combat이 수행하나 규약 검증용으로 참조 |
| 공격 방향 상태 (최초 수동 1회, 이후 랜덤 — R3) | jobs-and-combat | 본 시스템은 `directional` 플래그만 제공 |

---

## 7. 핵심 알고리즘 의사코드

### 7.1 레벨업 선택지 후보 추첨 — `GetChoiceCandidates(userId, slotCount)`

```
pool ← []
job ← GetUserJob(userId)
owned ← GetOwnedSkills(userId)

-- (1) 신규 스킬 후보 (직업 풀 - 보유, 패시브 포함: R6·R16)
if #owned < MAX_OWNED_SKILLS then
    for skill in GetJobSkillPool(job) do
        if not owned[skill.skillId] and skill.kind ~= "FUSION" then
            pool.add({skillId, kind="NEW", weight=1})

-- (2) 레벨업 후보 (보유 중 만렙 미만: R16 "재등장")
for s in owned do
    if s.level < SKILL_MAX_LEVEL then
        pool.add({s.skillId, kind="LEVELUP", weight=1})

-- (3) 중복 없는 가중치 추첨으로 slotCount개 선발
result ← weightedSampleWithoutReplacement(pool, slotCount)

-- (4) 합성 슬롯 치환 (R10, D5): 활성화 레시피가 있으면 30% 확률로 1슬롯 치환
activated ← GetActivatedRecipeIds(userId)
if #activated > 0 and RandomDouble() < FUSION_CHOICE_CHANCE and #result > 0 then
    recipe ← activated[RandomIntegerRange(1, #activated)]
    result[RandomIntegerRange(1, #result)] ←
        {skillId=recipe.result, kind="FUSION", recipeId=recipe.recipeId}

return result   -- 후보 부족 시 #result < slotCount 가능 (§9 E1)
```

### 7.2 합성 활성화 판정 — `RefreshFusionActivation(userId)`

`GrantSkill` / `LevelUpSkill` / `RemoveSkill` 직후 항상 호출.

```
for recipe in GetRecipesByJob(GetUserJob(userId)) do
    lvA ← GetSkillLevel(userId, recipe.materialA)
    lvB ← GetSkillLevel(userId, recipe.materialB)
    satisfied ← (lvA == SKILL_MAX_LEVEL and lvB >= 1)
             or (lvB == SKILL_MAX_LEVEL and lvA >= 1)     -- §4.1 대칭 해석
    if satisfied and state[recipe] == LOCKED then
        state[recipe] ← ACTIVATED
        emit FusionActivatedEvent(userId, recipe.recipeId)
        log("[Fusion] activated: " .. recipe.recipeId)     -- ARCHITECTURE §4-9
    elseif not satisfied and state[recipe] == ACTIVATED then
        state[recipe] ← LOCKED                             -- 방어적 강등 (§9 E3)
```

### 7.3 합성 실행 — `TryCompleteFusion(userId, recipeId)` (ApplyChoice의 FUSION 분기)

```
recipe ← GetRecipe(recipeId)
-- 선택 시점 재검증 (§9 E2): 노출 시점과 상태가 달라졌을 수 있다
if state[recipe] ~= ACTIVATED then return false
if not (조건 재판정 §7.2 satisfied) then state[recipe] ← LOCKED; return false

RemoveSkill(userId, recipe.materialA)      -- R15: 재료 삭제
RemoveSkill(userId, recipe.materialB)
GrantSkill(userId, recipe.result)          -- D4: Lv.1 부여
state[recipe] ← COMPLETED
emit SkillFusedEvent(userId, recipeId, recipe.result)
log("[Fusion] completed: " .. recipeId)
RefreshFusionActivation(userId)            -- 연쇄 영향 재판정
return true
```

### 7.4 범위 셀 판정 규약 — `ResolveSkillCells(skillId, originCell, facingDir)` (실행은 jobs-and-combat, 규약은 본 스펙)

```
data ← GetSkillData(skillId)
switch data.shape:
  ADJACENT4:        return { (0,+1), (0,-1), (+1,0), (-1,0) } + origin
  ADJACENT4_SINGLE: cells ← 위 4칸 중 몬스터 존재 셀
                    return { argmax(cells, monster.hp) }      -- 동률 랜덤
  ADJACENT8:        return 주변 8칸 + origin
  LINE:             cells ← origin + facingDir × (1..data.range)   -- 보드 경계에서 절단
                    if data.linePierce then return 몬스터 있는 모든 셀
                    else return { 첫 번째 몬스터 셀 }          -- 없으면 빈 집합(miss)
  RANGED_TARGET:    cand ← 모든 몬스터 셀 where chebyshev(origin, cell) <= data.range
                    return { argmin(cand, distance) }          -- 동률 랜덤 (D10)
```

### 7.5 히트 데미지 계산 — `ComputeHitDamage(userId, skillId)`

```
data ← GetSkillData(skillId)
lv ← GetSkillLevel(userId, skillId)
dmg ← data.damagePerLv[lv]

-- 패시브 합산 (자기 직업 스킬에만, §3.3)
for p in ownedPassives(userId, data.job) do
    if p.passiveType == "FLAT_DAMAGE" then dmg += p.passiveValuePerLv[p.level]

critChance ← BASE_CRIT_CHANCE
            + Σ CRIT_CHANCE 패시브 수치
            + (skillId == "thief_lucky_seven" and LUCKY_SEVEN_CRIT_BONUS or 0)
isCrit ← RandomDouble() < critChance
if isCrit then dmg ← floor(dmg × CRIT_MULTIPLIER)
return { damage=dmg, isCritical=isCrit }
-- 호출 측(combat)이 data.hits 만큼 반복 호출 (히트별 독립 크리 판정)
```

---

## 8. 엣지 케이스

| ID | 케이스 | 처리 |
|---|---|---|
| E1 | **선택지 후보 고갈** — 보유 전부 만렙 + 신규 풀 소진 + 합성 완료 | `GetChoiceCandidates`가 부족분만큼 짧은 리스트(또는 빈 리스트) 반환. 대체 슬롯(장비/메소)은 level-choice-jobadv 책임 — 계약에 명시 (§6.1) |
| E2 | **선택지 노출 ↔ 선택 사이 상태 변화** — 멀티 유저/연쇄 적용으로 FUSION 후보가 무효화 | `ApplyChoice`에서 전 항목 재검증. 실패 시 `false` 반환 → 호출 측이 해당 슬롯 재추첨. 재검증 없는 적용 금지 |
| E3 | **합성 재료 소실** — 정상 경로상 스킬 삭제는 합성뿐이지만(레시피 간 재료 공유 가능성 포함), ACTIVATED 후 재료가 사라진 경우 | `RefreshFusionActivation`이 ACTIVATED → LOCKED 강등 (§7.2). `TryCompleteFusion`도 재판정 후 거부 |
| E4 | **동일 선택지 내 스킬 중복** | `weightedSampleWithoutReplacement` — skillId 기준 비복원 추첨 (§7.1) |
| E5 | **보유 상한(8) 도달** | NEW 후보 생성 차단 (D9). LEVELUP/FUSION 후보는 계속 등장 — 합성은 순보유 -1이므로 상한과 무충돌 |
| E6 | **멀티플레이어 동시 레벨업** | per-user 테이블 완전 분리. 모든 ServerOnly API는 userId 키 필수. 클라발 RPC가 생기는 경우 `senderUserId` 검증 |
| E7 | **스테이지 종료/실패 중 선택지 팝업 잔류** | `StageEndedEvent` 수신 시 `ResetUser` — 진행 중 선택지 무효화는 level-choice-jobadv와 공동 처리. `ApplyChoice`는 스테이지 비활성 상태면 false |
| E8 | **님블 바디 추가 행동의 재귀 발동** | `RollExtraAction`은 본 행동에만 적용, 추가 시전에는 미적용 (호출 규약으로 명시 — combat이 추가 시전 시 재호출 금지) |
| E9 | **LINE 방향에 몬스터 없음 / RANGED_TARGET 사거리 내 몬스터 없음** | 빈 집합 반환 = miss. 행동 소모 여부는 combat 소유 — 권고: 소모(자동 전투 템포 유지) |
| E10 | **보드 가득 참(실패 임계 직전) 상태에서의 광역 동시 처치** | 본 시스템 무관 — `MonsterKilledEvent` 다중 발생 및 경험치 정산은 board-and-wave/level-choice 소유. 단 §7.4 판정이 1시전 1스냅샷(판정 시점 보드 상태 고정)임을 규약화해 동시성 모호성 제거 |
| E11 | **합성 직후 시전 순서 큐 정합성** | 재료 삭제 시 `GetSkillOrder` 큐에서 제거하고 결과 스킬을 같은 위치에 삽입 [설계 결정]. `SkillFusedEvent` 소비자(combat)는 큐 재조회 |
| E12 | **패시브만 남는 상태** | 불가능 설계: 최초 선택이 공격 스킬 강제(R2), 합성은 액티브→액티브 교체. 방어적으로 `GetSkillOrder`가 빈 큐면 combat은 기본 공격 폴백 — MASTER_PLAN에서 확정 필요 |
| E13 | **Lv.3 스킬이 LEVELUP 후보로 등장** | §7.1 (2)에서 `level < SKILL_MAX_LEVEL` 필터. `LevelUpSkill`도 만렙이면 false 반환 (이중 방어) |

---

## 9. 검증 포인트 (Phase 4 연계)

- `log()` 체크포인트 (ARCHITECTURE §4-9): 스킬 획득/레벨업/합성 활성화/합성 완료/선택지 후보 생성 결과.
- 시나리오: ① 궁수로 더블샷 Lv.3 + 아이스샷 Lv.1 도달 → `[Fusion] activated` 로그 → 레벨업 반복으로 합성 선택지 등장 → 선택 → 보유 목록에서 더블샷/아이스샷 소멸 + 더블 아이스샷 Lv.1 확인 (R9~R15 전체 경로). ② 4직업 각각 레시피 1회 완주. ③ 스테이지 재입장 시 스킬 초기화 (R18).

## 10. 위험 (risks)

§12 StructuredOutput과 동일 — 본문 참조용 요약:

1. 데미지/확률 수치 대부분이 [설계 결정] — 기획서에 수치 부재. 플레이테스트 후 밸런스 재조정 전제 (테이블 구조는 데이터 주도로 격리).
2. p.11 더블샷/애로우블로우 사용 예시는 이미지 기반 — 텍스트 추출로 데미지 연출 수치("113", "1 111")의 정확한 의도 해석 불가. 더블샷 2히트 / 애로우블로우 관통만 반영.
3. level-choice-jobadv·jobs-and-combat과의 API 시그니처는 MASTER_PLAN 확정 전 잠정 — 특히 `GetUserJob`, 선택지 호출 주체, miss 시 행동 소모(E9), 빈 큐 폴백(E12).
4. 스킬 아이콘/이펙트/사운드 RUID 미확보 — 구현 단계에서 msw-search 필수, 실패 시 "RUID 필요" 마킹 (ARCHITECTURE §4-5).
5. 2차+ 전직 스킬(p.12)은 스키마 예약만 — 시스템 #4 스펙과 `jobTier`/`advRoute` 필드 정합성 상호 검토 필요.
6. 밸런스 테이블을 Lua 상수로 유지(D11 아님, §5) — 스킬 수 증가 시 `.userdataset` 이관 비용 발생.
