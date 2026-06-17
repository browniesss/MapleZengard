# SPEC — ui-modes-stages (테마&스테이지 / 게임 모드 / UI 전체)

> 시스템 #8 (ARCHITECTURE.md §2). 기획서 근거 페이지: p.7, p.9, p.22, p.23 (보조: p.8, p.21).
> ARCHITECTURE.md §1 플랫폼 확정 사항과 §4 공통 제약을 전제로 하며 변경하지 않는다.
> 이 문서는 스펙만 정의한다 — 구현 파일(.mlua/.model/.ui)은 이 단계에서 만들지 않는다.

---

## 0. 범위 / 비범위

**범위 (이 시스템 소유):**
- 테마-스테이지 데이터 구조 (헤네시스 테마, 스테이지 [1-1]~[1-6])와 해금/진행도 저장
- 게임 모드 3종 (Story / Challenge / TimeAttack) 규칙과 입장 검증
- 화면 라우팅 (로비 → 스테이지 선택 → 인게임 HUD → 결과)
- 모든 `.ui` 파일과 그 클라이언트 컨트롤러 `.mlua` (선택지 카드 팝업, 전직/동료 팝업, 몬스터 체력 Bar 포함)

**비범위 (외부 시스템 소유 — UI는 표시/입력 전달만):**
- 선택지 추첨 로직(스킬 90%/장비 10%) → #4 level-choice-jobadv
- 전직 조건 판정/동료 후보 선정 → #4, #5
- 젠 실행/몬스터 배치/실패 임계 카운트 → #1 board-and-wave
- 몬스터 HP 수치 관리(서버) → #7 monsters-boss (HP Bar의 *표시*만 이 시스템)
- 에너지/메소/코인 잔액 관리 → #6 loot-equip-growth-bm

---

## 1. 기획서 요구사항 → 구현 항목 매핑

| # | 기획서 요구사항 (페이지) | 구현 항목 |
|---|---|---|
| R1 | 메이플 PC 레벨 디자인 동선과 동일하게 난이도 설정 (p.7) | 스테이지 컨셉을 헤네시스 인근 사냥터 동선 순서로 배치, 난이도 파라미터 단조 증가 (§3.1) |
| R2 | 1개 테마당 5~6개 스테이지, 테마(지역)–스테이지(지역 사냥터) 매칭 (p.7) | **[설계 결정]** 6개로 확정: [1-1]~[1-6] (§3.1) |
| R3 | `[2-3]` 표기 기준 — 앞 숫자 테마, 뒤 숫자 스테이지 (p.7) | stageId 포맷 `"{theme}-{stage}"` 문자열, UI 노출 표기 `[1-3]` (§3.1) |
| R4 | 입장 UI는 '단풍의전설' 레퍼런스 (p.7, p.23) | StageSelectGroup: 챕터 배너 + 스테이지 노드 리스트 + 직업 선택 + 모험하기 버튼 (§4.3) |
| R5 | 보스 처치 성공 시 스테이지 성공 / 몬스터 수 임계 초과 시 실패 (p.7, p.9) | `StageEndedEvent(result)` 수신 → ResultGroup 클리어/실패 분기 (§6.2) |
| R6 | '헤네시스' 테마 안에 스테이지 형태로 구현 (p.7) | THEMES 테이블 단일 항목 `henesys` (§3.1) |
| R7 | 던전앤파이터처럼 매 스테이지 조금씩 컨셉 다르게 (p.7) | 스테이지별 몬스터 구성/젠당 수/특수 규칙 차등 (§3.1) |
| R8 | 가장 최근까지 플레이한 테마의 스테이지를 선택하여 입장 (p.9) | `lastPlayedStageId` DataStorage 저장, StageSelect 진입 시 해당 노드 포커스 (§7.1) |
| R9 | 직업 선택 및 1차 공격 스킬 선택(2가지 중 1가지) (p.9) | StageSelectGroup 하단 직업 4종 카드 + 스킬 2택 선택 (§4.3) — 데이터는 #2/#3 계약 |
| R10 | '젠' 클릭 시 몬스터 생성·랜덤 배치 (p.8, p.9) | HUD 하단 중앙 젠(WAVE) 버튼 → `BoardWaveLogic:RequestZen()` (§4.4) |
| R11 | 수동: 공격 방향/스킬 순서 지정, 자동: 방향 지정 불가 (p.8, p.9) | HUD 자동/수동 토글 버튼 → `CombatLogic:SetAutoMode(bool)` (§4.4) |
| R12 | 레벨업 시 3개의 선택지 등장 (스킬 90%, 장비 10%) (p.9) | ChoicePopupGroup 카드 3장 기본, 전리품 확장 시 최대 5장 (§4.5) — 확률 수치는 #4 소유 |
| R13 | 20젠 또는 특수 조건 후 보스 등장 (p.9) | 젠 카운터 HUD `WAVE n/20` 표시, `BossSpawnedEvent` 수신 시 보스 연출 (§4.4) |
| R14 | 게임 모드 3종: 스토리(일반)/챌린지(이어하기 불가, 1코인 제한)/타임어택(젠 빠른 클리어) (p.22) | MODES 테이블 + 모드별 입장 검증/종료 처리 (§3.2, §7.2) |
| R15 | 체력은 Bar 형태로 현재 체력 표시 (p.23) | WorldHpBarGroup — 셀 하단 정렬 Filled 게이지, 풀링 (§4.9) |
| R16 | 로비 화면: 스토리/챌린지/타임어택 버튼 구성 (p.23) | LobbyGroup 모드 3버튼 세로 스택 (§4.2). 레퍼런스 미확정("논의 필요") → **[설계 결정]** §4.2 레이아웃으로 확정 |
| R17 | 테마 내 스테이지는 보드 크기 고정, 모바일 최적화 Max 크기 (p.21) | 헤네시스 전 스테이지 7×7 고정 (ARCHITECTURE §1), UI는 1920×1080 기준 + safe area (§4.1) |
| R18 | 전직 / 동료 합류 (p.14~16, ARCHITECTURE §2 #4/#5) | JobAdvancePopupGroup / CompanionPopupGroup — 표시 전용 쉘 제공 (§4.6, §4.7) |
| R19 | 리롤 3회 (ARCHITECTURE §4.7) | ChoicePopup 리롤 버튼 + 잔여 횟수 표시, HUD 요약 표시 (§4.5) |

기획서에 명시되지 않아 **[설계 결정]** 으로 확정한 항목 전체 목록은 §2.

---

## 2. [설계 결정] 목록 (기획서 미명시 → 프로토타입 기준 확정)

| ID | 결정 | 근거 |
|---|---|---|
| D1 | 스테이지 수 6개 ([1-1]~[1-6]) | 기획서 "5~6개" — 최대치로 확정해 동선 곡선을 길게 |
| D2 | 몬스터 수 실패 임계치 = 보드 점유 **40마리** (7×7=49셀 중) | 기획서 "일정 수치" 미명시. 캐릭터 1 + 동료 최대 2 + 여유 6셀 확보 |
| D3 | 스토리 모드: 실패 시 **이어하기 1회** (해당 젠부터 재개), 재도전 무제한 | 챌린지가 "이어하기 불가"로 차별화되려면 스토리는 가능해야 함 |
| D4 | 챌린지 코인: 계정당 보유, 초기 3개, 입장 시 1개 소모, 클리어 시 1개 환급 | "1코인 제한"의 프로토타입 해석. 잔액 관리는 #6 BMLogic 계약 |
| D5 | 타임어택: 입장~보스 처치까지 총 경과 시간 기록, 스테이지별 베스트 기록 저장. 선택지 팝업 동안에도 타이머 **계속 진행** | "젠을 빠르게 클리어" = 플레이어 조작 속도 경쟁. 팝업 중 정지 시 악용 여지 |
| D6 | 젠 버튼 쿨다운 1.0초 (전 모드 동일) | 연타 RPC 폭주 방지. 타임어택 차별화는 기록 측정으로 충분 |
| D7 | 카드 등급 3단계: NORMAL(회색)/RARE(파랑)/EPIC(보라+파티클) | "카드 등급 연출" 요구의 최소 구현. 등급 판정 규칙은 §7.5 |
| D8 | 스테이지 해금: [1-1] 기본 해금, 이후 직전 스테이지 클리어 시 해금. 챌린지/타임어택 모드는 **스토리 클리어한 스테이지만** 입장 가능 | 표준 진행 구조 |
| D9 | 화면 라우터는 단일 진실 — 동시에 1개의 주 화면(Group)만 표시 | UIGroup Enable 충돌 방지 |
| D10 | HP Bar는 Screen-mode UI 풀(60개)을 매 프레임 World→Screen 좌표 동기화로 부착 | runtime-patterns.md §11 패턴. 몬스터 .model에 UI 컴포넌트 부착 금지(클라 전용 규칙) |
| D11 | 스테이지별 컨셉 차이는 §3.1 파라미터(몬스터 구성비/젠당 수/특수 규칙)로 표현. 보스는 전 스테이지 머쉬맘(HP 100) 공통 | 프로토타입 몬스터 풀이 주황버섯/스톤골렘/머쉬맘 3종(p.19~20)이므로 |
| D12 | 타임어택 실패 조건은 스토리와 동일(임계 초과/보스 미처치). 별도 제한시간 없음 | "빠른 클리어" 모드이지 "시간 내 클리어" 모드가 아님 |
| D13 | 모험하기 버튼 = 스테이지 선택 화면의 입장 버튼. 자동/수동 토글 = HUD 우하단 | 단풍의전설 레퍼런스의 "모험하기" 위치 관례 |

---

## 3. 데이터 테이블

### 3.1 테마 / 스테이지 (`StageCatalogLogic` 상수)

THEMES:

| themeId | 이름(노출) | 보드 | 비고 |
|---|---|---|---|
| `1` | 헤네시스 | 7×7 고정 (ARCHITECTURE §1) | 프로토타입 유일 테마 (p.7) |

STAGES — 기획서 명시 수치: 보스 등장 20젠(p.9), 주황버섯 HP 10 / 스톤골렘 HP 15 / 머쉬맘 HP 100 (ARCHITECTURE §2 #7). 그 외 수치는 전부 [설계 결정]:

| stageId | 노출 표기 | 이름(노출) | 컨셉 (R7) | 젠당 몬스터 수 | 몬스터 구성 (주황버섯:스톤골렘) | 보스 젠 | 실패 임계 | 특수 규칙 |
|---|---|---|---|---|---|---|---|---|
| `1-1` | [1-1] | 버섯 언덕 | 입문 — 주황버섯만 | 3 | 100 : 0 | 20 | 40 | 없음 |
| `1-2` | [1-2] | 버섯 숲 | 물량 증가 | 4 | 100 : 0 | 20 | 40 | 없음 |
| `1-3` | [1-3] | 돌의 정원 | 스톤골렘 첫 등장 | 4 | 75 : 25 | 20 | 40 | 없음 |
| `1-4` | [1-4] | 진화의 숲 | 진화 압박 | 4 | 90 : 10 | 20 | 40 | 주황버섯 진화 카운트 10젠 → **7젠** |
| `1-5` | [1-5] | 골렘 채석장 | 증식 압박 | 4 | 60 : 40 | 20 | 38 | 스톤골렘 증식 빈도 ×1.5 |
| `1-6` | [1-6] | 머쉬맘의 안식처 | 종합 + 보스전 집중 | 5 | 70 : 30 | 20 | 36 | 보스 HP 100 (공통), 보스 소환 패턴 빈도 ×1.5 |

> 특수 규칙 열의 배율은 #7 monsters-boss가 `GetStageConfig(stageId).modifiers` 로 읽어 적용한다 (§6.1).
> "레벨 디자인 동선과 동일 난이도"(R1): 1-1→1-6으로 젠당 수·골렘 비율·임계 강하가 단조 증가/감소.

### 3.2 게임 모드 (p.22 — 기획서 수치 그대로)

| modeId | 이름(노출) | 기획서 정의 (p.22) | 입장 비용 | 이어하기 | 종료 기록 |
|---|---|---|---|---|---|
| `STORY` | 스토리 모드 | 일반 모드로 정해진 테마/스테이지 플레이 | 에너지 1 [설계 결정] | 가능 — 1회 (D3) | 클리어 여부, 해금 갱신 |
| `CHALLENGE` | 챌린지 모드 | **이어하기가 불가능한, 1코인 제한 모드** | 챌린지 코인 **1** (기획서) | **불가** (기획서) | 클리어 여부, 코인 환급 (D4) |
| `TIME_ATTACK` | 타임어택 모드 | **'젠'을 빠르게 클리어하는 모드** | 에너지 1 [설계 결정] | 불가 [설계 결정] | 클리어 시간(ms), 베스트 기록 (D5) |

### 3.3 공용 상수 (`UIConstants` — 기획서 수치는 그대로 인용)

| 상수 | 값 | 출처 |
|---|---|---|
| `BOSS_ZEN_COUNT` | 20 | 기획서 p.9 "20젠" |
| `CHOICE_CARD_BASE` | 3 | 기획서 p.9 "3개의 선택지" |
| `CHOICE_CARD_MAX` | 5 | ARCHITECTURE §2 #4 "선택지 3→5 확장" |
| `REROLL_MAX_PER_RUN` | 3 | ARCHITECTURE §4.7 "리롤 3회" |
| `FAIL_MONSTER_THRESHOLD` | 스테이지별 (§3.1) | 기획서 "일정 수치" → D2 |
| `ZEN_BUTTON_COOLDOWN` | 1.0 (초) | D6 |
| `CHALLENGE_COIN_INIT` | 3 | D4 |
| `STORY_CONTINUE_LIMIT` | 1 | D3 |
| `HPBAR_POOL_SIZE` | 60 | D10 (임계 40 + 보스/연출 여유) |
| `HPBAR_OFFSET_Y` | -0.45 (world unit) | 셀 크기 0.8 → 셀 하단 바로 아래 |

### 3.4 UI 레이아웃 상수 (기준 해상도 1920×1080, templates.md 공통 규칙)

| 상수 | 값 |
|---|---|
| `SAFE_MARGIN_X / Y` | 60 / 40 px (모바일 노치 회피, ui-fundamentals §9) |
| `TOUCH_MIN` | 88×88 px (SKILL.md ALWAYS #7) |
| 모드 버튼 (로비) | 520×140, 세로 간격 40 |
| 젠 버튼 (HUD) | 280×150, 하단 중앙, bottom margin 40 |
| 자동/수동 토글 | 150×150, 우하단 |
| 경험치 바 | 420×28, Filled Horizontal |
| 선택지 카드 | 300×460, 간격 24 (5장 시 총폭 1596 ≤ 1920−2×60) |
| 몬스터 HP Bar | 70×10 px |
| 스테이지 노드 | 180×180, 6개 지그재그 2행 배치 |
| 챕터 배너 | 480×820, 좌측 |

---

## 4. 화면 플로우 & UI 그룹 설계

### 4.1 라우팅과 그룹 오더

```
Lobby ──모드 선택──▶ StageSelect ──모험하기──▶ InGame(HUD) ──StageEnded──▶ Result
  ▲                       ▲   │                                     │
  └───────뒤로가기──────────┘   └──────── 뒤로가기(런 포기 확인) ◀──────┴── 로비로/다음 스테이지
```

| UIGroup | GroupOrder | DefaultShow | 역할 |
|---|---|---|---|
| `LobbyGroup` | 0 | true | 모드 3버튼 |
| `StageSelectGroup` | 1 | false | 챕터 배너+노드+직업선택+모험하기 |
| `WorldHpBarGroup` | 2 | false | 몬스터 HP Bar 풀 (HUD 아래 레이어) |
| `GameHUDGroup` | 5 | false | 인게임 HUD |
| `ChoicePopupGroup` | 10 | false | 선택지 카드 (모달) |
| `JobAdvancePopupGroup` | 11 | false | 전직 연출 (모달) |
| `CompanionPopupGroup` | 11 | false | 동료 합류 (모달, 전직과 동시 표시 없음) |
| `ResultGroup` | 20 | false | 클리어/실패 결과 (모달) |
| `ToastGroup` | 30 | true | 안내 토스트 |

- 주 화면(Lobby/StageSelect/HUD)은 `UIRouterLogic`이 1개만 Enable (D9).
- 모달은 루트에 `CanvasGroup(BlocksRaycasts=true)` + 반투명 Dimmer (component-api.md 모달 패턴).
- `DefaultShow=false` 그룹의 컨트롤러 스크립트는 그룹 **외부**(@Logic)에 둔다 (runtime-patterns Caveat #5).
- 모든 UI Logic/Component는 `@ExecSpace("ClientOnly")` (Caveat #3). 비주얼 스타일: **style-1-black 번들 기반** + 헤네시스 컬러(녹색 계열) 틴트 — templates.md Style-Source Decision 규칙에 따라 선택하고 사용자에게 고지.

### 4.2 LobbyGroup (R16, p.23)

```
┌──────────────────────────────┐
│        [게임 로고 배너]        │  상단 중앙 720×200
│                              │
│       ┌────────────┐         │
│       │ 스토리 모드  │         │  중앙 세로 스택 520×140 ×3
│       ├────────────┤         │  (p.23 목업: 스토리/챌린지/타임어택)
│       │ 챌린지 모드  │         │  챌린지 버튼 우측에 보유 코인 뱃지
│       ├────────────┤         │
│       │ 타임어택 모드 │         │
│       └────────────┘         │
│ [에너지 ⚡n]        [메소 🪙n] │  하단 좌/우 (외부 계약 #6 표시 전용)
└──────────────────────────────┘
```

- 모드 버튼: `b.button` 단일 엔티티 (Sprite Sliced + Text MiddleCenter + Button) — component-api 권장 조합.
- 클릭 → `UIRouterLogic:GoStageSelect(modeId)`. 챌린지 코인 0이면 버튼 `Transition.Disabled` 색 + 클릭 시 토스트 "챌린지 코인이 부족합니다".

### 4.3 StageSelectGroup (R4, R8, R9 — 단풍의전설 레퍼런스)

```
┌──────────────────────────────────────────┐
│ [←뒤로]      테마 1. 헤네시스     [모드 뱃지] │
│ ┌────────┐  ┌────────────────────────────┐│
│ │        │  │  (1-1)─(1-2)─(1-3)         ││  노드 180×180 지그재그
│ │ 챕터    │  │        │                   ││  잠금: 자물쇠 / 클리어: 단풍잎 체크
│ │ 배너    │  │  (1-6)─(1-5)─(1-4)         ││  선택: 외곽 글로우
│ │(헤네시스)│  └────────────────────────────┘│
│ │ 480×820│  ┌────────────────────────────┐│
│ │        │  │ 직업: [전사][궁수][마법사][도적]││  아바타 카드 4종 (AvatarGUIRenderer)
│ │        │  │ 스킬: [스킬A] / [스킬B] 2택   ││  선택 직업의 1차 스킬 2택 (R9)
│ └────────┘  └────────────────────────────┘│
│                              [ 모험하기 ▶ ]│  우하단 360×120
└──────────────────────────────────────────┘
```

- 진입 시 `lastPlayedStageId` 노드 자동 선택 (R8). 노드 6개는 수동 배치 (≤10개 — ScrollLayout 불필요).
- 직업/스킬 목록은 `JobLogic:GetJobs()` / `GetPrimarySkills(jobId)` 외부 계약(#2, #3)으로 채움.
- 모험하기 클릭 → `ModeStageLogic:RequestEnterStage(modeId, stageId, jobId, skillId)` (Server RPC). 성공 응답 시 라우터가 HUD로 전환.
- 타임어택 모드일 때 노드에 베스트 기록(mm:ss.ms) 표기.

### 4.4 GameHUDGroup (R10, R11, R13, R19)

```
┌──────────────────────────────────────────┐
│ Lv.7 [■■■■□□ EXP]      WAVE 12/20   ⏱01:23│  좌상단 레벨/경험치, 상단 중앙 젠 카운터
│ (보스 임박: 18젠부터 카운터 적색 점멸)  ⚡n 🔁n ⏸│  우상단 에너지/리롤 잔여/일시정지(나가기)
│                                          │
│            (월드: 7×7 보드)               │  카메라 고정 — UI는 보드 영역을 가리지 않음
│                                          │
│ 몬스터 n/40                                │  좌하단 임계 카운터 (35+ 적색)
│            ┌──────────┐        ┌────┐    │
│            │ 젠(WAVE)  │        │자동 │    │  하단 중앙 젠 버튼 280×150 / 우하단 토글
│            └──────────┘        └────┘    │
└──────────────────────────────────────────┘
```

- 젠 버튼: `ButtonComponent` + `KeyCode=Space` (PC). 클릭 → `BoardWaveLogic:RequestZen()`. 쿨다운 1.0초 동안 Radial360 Filled 오버레이 (runtime-patterns §10).
- 자동/수동 토글: 상태에 따라 SpriteSwap, `CombatLogic:SetAutoMode(bool)` 호출. 자동 중에는 방향 지정 입력 차단 안내 토스트 (p.8 "자동 플레이 기준 공격 방향 설정 불가").
- 젠 카운터: `ZenStartedEvent(zenIndex)` 수신 → `WAVE {n}/{BOSS_ZEN_COUNT}`. `BossSpawnedEvent` 수신 → `BOSS` 표기 + 배너 연출.
- 경험치 바: Sprite Filled Horizontal + `LevelUpEvent`/`ExpChangedEvent` 반영.
- 타이머(⏱)는 TIME_ATTACK 모드에서만 표시 — 클라 표시용은 로컬 경과, 판정은 서버 기록 (§7.3).
- 일시정지(⏸) → 확인 다이얼로그("런을 포기하고 나가시겠습니까?") → `ModeStageLogic:AbandonRun()`.

### 4.5 ChoicePopupGroup (R12, R19 — 카드 3~5장)

```
┌────────── Dimmer (모달) ──────────┐
│        레벨 업! 선택지를 고르세요     │
│  [카드1] [카드2] [카드3] ([4][5])  │  300×460, 중앙 가로 배치
│        [ 🔁 리롤 (남은 2회) ]       │
└──────────────────────────────────┘
```

- 카드 구성: 등급 프레임(D7) + 아이콘 + 이름 + 설명 + 등급 리본. EPIC은 `UISpriteParticleComponent(BurstNova)` 연출.
- 카드 데이터/장수(3~5)는 `ChoiceLogic`(#4)이 `ShowChoices(cards, rerollLeft)` Client RPC로 전달 — 추첨 확률(90%/10%)은 #4 소유.
- 카드 클릭 → `ChoiceLogic:SelectChoice(choiceId)` (Server). 리롤 클릭 → `ChoiceLogic:RequestReroll()`; 잔여 0이면 버튼 Disabled.
- 카드 5장 시 카드 간격 자동 축소 없음 — §3.4 상수로 1920 내 수용 확인 완료. 모바일은 카드 260×400으로 축소 변형 (ActivePlatform 분기).

### 4.6 JobAdvancePopupGroup (R18 — 표시 쉘)

- 중앙 패널 760×640: 직업 일러스트 영역(AvatarGUIRenderer), "2차 전직!" 타이틀, 전직 직업명, 획득 스킬 요약, [확인] 버튼.
- `JobAdvanceLogic`(#4)이 `ShowJobAdvance(jobInfo)` 로 오픈. 확인 → `ConfirmJobAdvance()` 콜백.

### 4.7 CompanionPopupGroup (R18 — 표시 쉘)

- 중앙 패널: "동료가 합류합니다!" + 후보 카드(들). `CompanionLogic`(#5)이 `ShowCompanionJoin(candidates)` 로 오픈, 선택 → `SelectCompanion(candidateId)`.
- 전직 팝업과 동시 오픈 금지 — 라우터의 모달 큐로 직렬화 (§7.6).

### 4.8 ResultGroup (R5)

| 분기 | 내용 |
|---|---|
| 클리어 | "STAGE CLEAR!" + 통계(도달 젠/처치 수/획득 메소/클리어 시간) + 버튼: [다음 스테이지](1-6 제외) / [로비로] |
| 실패 | "STAGE FAILED" + 실패 사유 텍스트("몬스터가 너무 많아졌습니다" / "보스를 처치하지 못했습니다") + 버튼: STORY는 [이어하기(1회)] + [다시하기] + [로비로], CHALLENGE/TIME_ATTACK은 [다시하기] + [로비로] |
| 타임어택 클리어 | 추가로 큰 시간 표기 + "NEW RECORD!" 뱃지(베스트 갱신 시) |

### 4.9 WorldHpBarGroup (R15 — 셀 하단 체력 Bar)

- Screen-mode 바 60개 풀 (D10). 각 바: 배경 Sprite(검정 70%) + Fill 자식(stretch, `Type=Filled(3)`, `FillMethod=Horizontal(0)`, `FillOrigin=Left`).
- 색상: HP 비율 >0.5 녹색 / >0.2 노랑 / ≤0.2 빨강 (runtime-patterns §3 패턴).
- #7 monsters-boss가 클라에서 `UIHpBarManagerLogic:Attach(entity, maxHp)` / `UpdateHp(entity, cur)` / `Release(entity)` 호출. 위치 동기화는 §7.4.
- 보스(머쉬맘 HP 100)는 전용 대형 바 1개 (HUD 상단 중앙 600×24, 보스명 표기) — `AttachBoss(entity, maxHp)`.

---

## 5. 파일 매니페스트

> `.ui`는 UIBuilder 경유, 작성 전 builder-protocol.md §3 전문 Read (ARCHITECTURE §4.2). `.mlua` 작성 전 msw-scripting + verify-checklist Read (§4.3). `.model` 없음 — 이 시스템은 월드 엔티티를 만들지 않는다.

### .mlua (`RootDesk/MyDesk/Zengard/`)

| 파일 | 종류 | ExecSpace | 책임 |
|---|---|---|---|
| `Zengard/Core/StageCatalogLogic.mlua` | @Logic | (기본 — 서버/클라 공용) | §3.1~3.3 상수 테이블 단일 소스. 읽기 전용 getter만 제공 |
| `Zengard/Core/ModeStageLogic.mlua` | @Logic | 메서드별: 검증/저장 `@ExecSpace("ServerOnly")`, 입장 요청 수신 `@ExecSpace("Server")`, 결과 통지 `@ExecSpace("Client")` | 모드 규칙(입장 검증·코인·이어하기·타임어택 기록), 스테이지 해금/진행도/`lastPlayedStageId` DataStorage 저장, `StageEndedEvent` 수신 후 정산 |
| `Zengard/UI/UIRouterLogic.mlua` | @Logic | ClientOnly | 주 화면 1개만 Enable (D9), 모달 큐 직렬화 (§7.6) |
| `Zengard/UI/UILobbyLogic.mlua` | @Logic | ClientOnly | 로비 버튼 바인딩, 에너지/메소/코인 표시 |
| `Zengard/UI/UIStageSelectLogic.mlua` | @Logic | ClientOnly | 노드 상태(잠금/클리어/선택), 직업·스킬 선택 상태, 모험하기 요청 |
| `Zengard/UI/UIGameHudLogic.mlua` | @Logic | ClientOnly | 젠 버튼/쿨다운, 자동 토글, 젠 카운터, 레벨/경험치, 임계 카운터, 타이머 |
| `Zengard/UI/UIChoicePopupLogic.mlua` | @Logic | ClientOnly | 카드 3~5장 렌더, 등급 연출, 리롤 버튼 |
| `Zengard/UI/UIJobAdvancePopupLogic.mlua` | @Logic | ClientOnly | 전직 팝업 쉘 |
| `Zengard/UI/UICompanionPopupLogic.mlua` | @Logic | ClientOnly | 동료 합류 팝업 쉘 |
| `Zengard/UI/UIResultLogic.mlua` | @Logic | ClientOnly | 결과 팝업 분기/버튼 |
| `Zengard/UI/UIHpBarManagerLogic.mlua` | @Logic | ClientOnly | HP Bar 풀 + 보스 바, 좌표 동기화 (§7.4) |
| `Zengard/UI/UIToastLogic.mlua` | @Logic | ClientOnly | 토스트 (runtime-patterns §2 패턴) |

> UI 컨트롤러를 전부 @Logic으로 두는 이유: 모든 화면이 월드 세션 전체에서 단일 인스턴스로 살아야 하고(맵 1개 고정), `DefaultShow=false` 그룹 내부 스크립트는 OnBeginPlay가 돌지 않기 때문 (Caveat #5).

### .ui (`ui/`)

| 파일 | 내용 |
|---|---|
| `ui/LobbyGroup.ui` | §4.2 |
| `ui/StageSelectGroup.ui` | §4.3 |
| `ui/GameHUDGroup.ui` | §4.4 |
| `ui/ChoicePopupGroup.ui` | §4.5 (카드 5장 슬롯 — 4·5번은 enable=false 시작) |
| `ui/JobAdvancePopupGroup.ui` | §4.6 |
| `ui/CompanionPopupGroup.ui` | §4.7 |
| `ui/ResultGroup.ui` | §4.8 (클리어/실패 패널 2종) |
| `ui/WorldHpBarGroup.ui` | §4.9 (바 템플릿 1개 enable=false + 보스 바) |
| `ui/ToastGroup.ui` | style 템플릿 기반 토스트 |

### .model

없음.

---

## 6. API / 이벤트 계약

### 6.1 이 시스템이 노출 (다른 시스템이 호출)

```lua
-- ModeStageLogic (server side)
method table GetStageConfig(string stageId)
--   returns { themeId, boardW, boardH, monstersPerZen, monsterRatio={orange,golem},
--             bossZen, failThreshold, modifiers={evolveZen, golemSplitRate, bossSummonRate} }
--   호출자: #1 board-and-wave (젠 구성), #7 monsters-boss (modifiers)
method string GetCurrentMode()          -- "STORY" | "CHALLENGE" | "TIME_ATTACK"
method void NotifyStageResult(boolean cleared, table stats)
--   호출자: ZengardGameLogic — StageEndedEvent 직후 정산(해금/코인/기록/저장) 위임 가능
--   (또는 ModeStageLogic이 StageEndedEvent를 직접 구독 — MASTER_PLAN에서 택1 확정)

-- UIHpBarManagerLogic (client side) — 호출자: #7 monsters-boss 클라 컴포넌트
method void Attach(Entity monster, number maxHp)
method void UpdateHp(Entity monster, number currentHp)
method void Release(Entity monster)
method void AttachBoss(Entity boss, number maxHp)

-- UIChoicePopupLogic (client) — 호출자: #4 의 Client RPC
method void ShowChoices(table cards, integer rerollLeft)
--   cards[i] = { choiceId, kind="SKILL"|"EQUIP", name, desc, iconRuid, grade="NORMAL"|"RARE"|"EPIC" }
method void CloseChoices()

-- UIJobAdvancePopupLogic / UICompanionPopupLogic (client) — 호출자: #4 / #5
method void ShowJobAdvance(table jobInfo)
method void ShowCompanionJoin(table candidates)

-- UIToastLogic (client) — 모든 시스템 공용
method void ShowMessage(string msg)

-- UIGameHudLogic (client)
method void SetExp(integer level, number expRatio)   -- 호출자: #4 Client RPC
method void SetMonsterCount(integer count)           -- 호출자: #1 Client RPC
method void SetEnergy(integer n) / SetRerollLeft(integer n)  -- 호출자: #6, #4
```

### 6.2 이 시스템이 구독하는 이벤트 (발신자: ZengardGameLogic / #1 / #7 — ARCHITECTURE §5)

| 이벤트 | 페이로드(잠정) | UI 반응 |
|---|---|---|
| `ZenStartedEvent` | `zenIndex` | 젠 카운터 갱신, 18젠+ 적색 점멸 |
| `MonsterKilledEvent` | `monsterId, byWhom` | (직접 사용 없음 — exp는 #4 경유) |
| `LevelUpEvent` | `newLevel` | 레벨 텍스트 + 레벨업 플래시 |
| `BossSpawnedEvent` | `bossEntityId` | BOSS 배너, 보스 HP 바는 #7의 AttachBoss 호출로 |
| `StageEndedEvent` | `result="CLEAR"|"FAIL", reason, stats` | ResultGroup 오픈 (§4.8) |
| `ChoiceResolvedEvent` | `choiceId` | ChoicePopup 닫기 |

### 6.3 이 시스템이 의존하는 외부 API

| 계약 | 소유 | 용도 |
|---|---|---|
| `BoardWaveLogic:RequestZen()` (Server) | #1 | 젠 버튼 |
| `CombatLogic:SetAutoMode(boolean)` (Server) | #2 | 자동/수동 토글 |
| `JobLogic:GetJobs()`, `GetPrimarySkills(jobId)` | #2/#3 | 직업/스킬 선택 UI 데이터 |
| `ChoiceLogic:SelectChoice(id)`, `RequestReroll()` (Server) | #4 | 카드 선택/리롤 |
| `CompanionLogic:SelectCompanion(id)` (Server) | #5 | 동료 선택 |
| `BMLogic:GetEnergy()`, `SpendEnergy(1)`, `GetCoins()`, `SpendCoin(1)`, `RefundCoin(1)`, `GetMeso()` (Server) | #6 | 입장 비용/표시 |
| `_DataStorageService` | 플랫폼 | `zengard/progress/{userId}` 키: 해금/클리어/베스트기록/lastPlayedStageId |

> 최종 시그니처는 MASTER_PLAN.md가 단일 진실 (ARCHITECTURE §5). 위 표는 본 시스템의 요구안.

---

## 7. 핵심 알고리즘 의사코드

### 7.1 스테이지 해금/포커스 판정 (D8, R8)

```
function GetStageNodeStates(progress, modeId):
    states = []
    for i, stage in STAGES:
        unlocked = (i == 1) or progress.cleared[STAGES[i-1].stageId]
        if modeId != "STORY":
            unlocked = unlocked and progress.cleared[stage.stageId]   -- D8
        states[i] = { stageId, unlocked, cleared = progress.cleared[stage.stageId],
                      best = progress.bestTime[stage.stageId] }
    focus = progress.lastPlayedStageId
    if focus == nil or not states[focus].unlocked: focus = first unlocked-and-not-cleared, else "1-1"
    return states, focus
```

### 7.2 모드 입장 검증 (ServerOnly — D3, D4)

```
function RequestEnterStage(userId, modeId, stageId, jobId, skillId):
    assert mode/stage exist; assert GetStageNodeStates(...)[stageId].unlocked
    if modeId == "CHALLENGE":
        if BMLogic.GetCoins(userId) < 1: return fail("NO_COIN")
        BMLogic.SpendCoin(userId, 1)
    else:
        if BMLogic.GetEnergy(userId) < 1: return fail("NO_ENERGY")
        BMLogic.SpendEnergy(userId, 1)
    progress.lastPlayedStageId = stageId; save()
    runState = { modeId, stageId, continueLeft = (modeId=="STORY") and 1 or 0,
                 startedAt = serverNow() }
    ZengardGameLogic.StartStage(userId, stageId, jobId, skillId, runState)   -- 외부 계약
    return ok
```

### 7.3 스테이지 종료 정산 (ServerOnly — D4, D5)

```
on StageEndedEvent(result, reason, stats):
    if result == "CLEAR":
        progress.cleared[stageId] = true
        if modeId == "CHALLENGE": BMLogic.RefundCoin(userId, 1)
        if modeId == "TIME_ATTACK":
            elapsed = serverNow() - runState.startedAt          -- 팝업 중 비정지 (D5)
            isNewRecord = elapsed < (progress.bestTime[stageId] or INF)
            if isNewRecord: progress.bestTime[stageId] = elapsed
        save()
    -- FAIL: 차감분 환급 없음. STORY 이어하기는 ResultUI → RequestContinue()
function RequestContinue(userId):                                -- STORY 전용
    if runState.modeId != "STORY" or runState.continueLeft < 1: return fail
    runState.continueLeft -= 1
    ZengardGameLogic.ResumeStage(userId)                         -- 외부 계약: 해당 젠부터 재개
```

### 7.4 HP Bar 풀 좌표 동기화 (ClientOnly — D10, R15)

```
every frame (1/60 repeat timer, runtime-patterns Caveat #11):
    for (monster, bar) in activeBars:
        if not monster.isValid: Release(monster); continue
        wp = monster.TransformComponent.WorldPosition
        screen = _UILogic:WorldToScreenPosition(Vector2(wp.x, wp.y + HPBAR_OFFSET_Y))
        bar.UITransformComponent.anchoredPosition = _UILogic:ScreenToUIPosition(screen)
function Attach(monster, maxHp):
    if pool.empty: log("[HpBar] pool exhausted"); return   -- 엣지 E7
    bar = pool.pop(); bar.Enable = true; activeBars[monster] = bar
function UpdateHp(monster, cur):
    bar.fill.FillAmount = clamp(cur/maxHp, 0, 1); bar.fill.Color = green/yellow/red by ratio
```

### 7.5 카드 등급 연출 매핑 (ClientOnly — D7; 추첨 자체는 #4)

```
function ResolveGrade(card):
    if card.grade given by #4: use it                      -- 우선 외부 값
    else: kind=="EQUIP" → "EPIC" (10% 희귀 트랙, p.9)        -- 폴백 규칙
          kind=="SKILL" and isUpgradeToMax → "RARE", else "NORMAL"
frame color: NORMAL=#9E9E9E, RARE=#3B7BFF, EPIC=#A24BFF + BurstNova particle
```

### 7.6 모달 큐 직렬화 (ClientOnly — D9)

```
queue = []   -- {popupId, payload}
function EnqueueModal(id, payload):
    push; if no modal open: openNext()
function openNext():
    head = queue.peek(); show head            -- Choice > JobAdvance > Companion > Result 순 우선
    단, Result가 enqueue되면 Choice/JobAdvance/Companion 큐를 모두 폐기하고 Result만 표시 (엣지 E3)
on modal closed: queue.pop(); openNext()
```

---

## 8. 엣지 케이스

| ID | 케이스 | 처리 |
|---|---|---|
| E1 | 보드 가득 참(빈 셀 0) 상태에서 젠 버튼 클릭 | 버튼은 활성 유지하되 서버 `RequestZen` 응답 실패 → 토스트 "배치할 공간이 없습니다". 실패 임계 판정은 #1 소유 — UI는 임계 카운터 적색 표시만 |
| E2 | 젠 쿨다운 중 연타 / 클라-서버 쿨다운 불일치 | 클라 쿨다운은 연출일 뿐, 서버 `RequestZen`이 `ZEN_BUTTON_COOLDOWN` 재검증 (서버 권위, ARCHITECTURE §4.8) |
| E3 | 선택지 팝업 떠 있는데 `StageEndedEvent` 도착 (보스 처치/임계 초과 동시) | 모달 큐 폐기 후 Result만 표시 (§7.6). 선택 미완료 카드는 서버에서 무효 처리(#4 계약) |
| E4 | 클리어와 실패 조건 동시 충족 (보스 처치 프레임에 임계 초과) | `StageEndedEvent`는 서버가 단 1회만 발화(첫 판정 승) — UI는 두 번째 이벤트 수신 시 무시(이미 Result 열림이면 drop + log) |
| E5 | 챌린지 중 앱 종료/접속 끊김 | 이어하기 불가(p.22) → 재접속 시 런 상태 없음, 코인 환급 없음. 로비로 복귀 + 토스트 안내 |
| E6 | 스토리 이어하기 후 재실패 | `continueLeft=0` → Result에서 이어하기 버튼 숨김, 다시하기만 노출 |
| E7 | HP Bar 풀 고갈 (몬스터 61마리+) | 신규 Attach 무시 + log (임계 40이라 정상 플레이에선 도달 불가 — 도달 시 #1 버그 신호) |
| E8 | 처치 직후 같은 프레임에 UpdateHp 호출 (이미 Release된 바) | activeBars에 없으면 조용히 return (no-op) |
| E9 | 리롤 잔여 0에서 리롤 클릭 | 버튼 Disabled가 기본. 경합으로 요청이 가도 서버(#4)가 거부 → 토스트 |
| E10 | 선택지 5장인데 모바일 화면 폭 부족 | ActivePlatform Mobile 변형(카드 260×400) 적용 — §4.5 |
| E11 | `lastPlayedStageId`가 가리키는 스테이지가 (데이터 리셋 등으로) 잠김 | §7.1 폴백: 첫 미클리어 해금 스테이지, 없으면 1-1 |
| E12 | 타임어택 베스트 기록 동률 | 갱신 안 함 (엄격히 작을 때만 NEW RECORD) |
| E13 | 직업/스킬 미선택 상태에서 모험하기 클릭 | 직전 런 선택값 기본 적용, 최초 플레이면 모험하기 Disabled + 안내 토스트 |
| E14 | 전직 팝업과 동료 팝업이 같은 레벨업에서 동시 트리거 | 모달 큐 직렬화 — 전직 → 동료 순 (§7.6) |
| E15 | 결과 팝업 표시 중 서버가 다음 상태로 전이 시도 | `ModeStageLogic`이 Result 확인(버튼 입력) 전까지 로비 전환 RPC를 보내지 않음 — 전이는 항상 클라 버튼 → 서버 요청 방향 |

---

## 9. 필요 리소스 (msw-search 키워드 — 구현 단계에서 RUID 확정, 실패 시 "RUID 필요" 마킹)

| 용도 | 검색 키워드 |
|---|---|
| 챕터 배너/로비 배경 | `헤네시스`, `henesys`, `단풍`, `숲 배경` |
| 스테이지 노드/클리어 마크 | `단풍잎`, `maple leaf`, `자물쇠`, `lock icon`, `체크` |
| 모드 버튼/패널/카드 프레임 | style-1-black `ruid-map.md` 우선 (templates.md RUID 우선순위 규칙) — 부족분만 `버튼 프레임`, `패널`, `카드 프레임` |
| 직업 아이콘 | `검 아이콘`, `활 아이콘`, `지팡이 아이콘`, `단검 아이콘` |
| 에너지/코인/메소/리롤 아이콘 | `번개`, `lightning`, `코인`, `coin`, `메소`, `새로고침`, `refresh icon` |
| 타이머/기록 | `시계`, `clock icon`, `스톱워치` |
| 젠 버튼 | `버섯 아이콘`, `소환`, `포탈` (버튼 위 아이콘) |
| HP Bar | 단색 사각 스프라이트면 충분 — style 템플릿 gauge RUID 재사용, 부족 시 `게이지`, `gauge bar` |
| 카드 등급 연출 | `반짝임`, `sparkle`, `글로우` (EPIC 파티클은 UISpriteParticle 내장 프리셋 BurstNova 우선) |
| 보스 배너 | `머쉬맘`, `mushmom`, `경고`, `warning` |
| UI 사운드 | ui-sound.md 기본 클릭/호버 SFX RUID 우선, 부족분 `버튼 클릭`, `팡파레`, `실패 효과음` |

---

## 10. 검증 포인트 (Phase 4 체크리스트 입력)

1. 로비 → 모드 선택 → 스테이지 선택 → 모험하기 → HUD 표시 → 젠 버튼 → 젠 카운터 증가 — 로그로 확인 (`log()` 체크포인트: 화면 전환, 입장 검증 결과, 젠 요청)
2. 챌린지 코인 0 입장 거부 / 코인 1 소모·클리어 환급 로그
3. 타임어택 클리어 시간 기록·베스트 갱신 로그
4. 선택지 3장 표시 → 카드 선택 → 닫힘; 리롤 3회 차감; 5장 확장 시 레이아웃 1920 내 수용 (screenshot 대조: 기획서 p.23 HUD/체력바, p.8 젠 버튼)
5. 몬스터 HP Bar가 셀 하단에 부착·HP 비율 색상 전환·처치 시 회수
6. 실패 시 STORY만 이어하기 버튼 노출, 1회 소모 후 숨김
