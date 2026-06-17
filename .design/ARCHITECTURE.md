# 메이플 젠가드 (가제) — 프로토타입 아키텍처 기준 문서

> 이 문서는 모든 설계/구현/리뷰 에이전트가 작업 전 반드시 전문을 읽어야 하는 공통 기준이다.
> 기획서 원본: `C:/Users/user/Documents/카카오톡 받은 파일/20260612_모아요_MSW 협업 월드_5차 게임 기획서.pdf` (24p)
> 목표: 기획서에 명시된 모든 시스템을 MSW에서 동작하는 프로토타입으로 100% 구현.

## 0. 게임 요약 (기획서 p.4~9)

- 메이플스토리 + 퍼즐 + 로그라이크. 퍼즐판(그리드) 위에 몬스터가 '젠(WAVE)' 단위로 등장.
- 플레이어는 '젠' 버튼 클릭 → 몬스터/캐릭터 랜덤 배치 → 자동 공격 (수동 모드: 공격 방향·스킬 순서 지정).
- 몬스터 처치 → 경험치 → 레벨업 시 선택지 3개 (스킬 90% / 장비 10%).
- 20젠 또는 특수 조건 → 보스 등장 → 처치 시 스테이지 클리어. 몬스터 수 임계치 초과 또는 보스 미처치 시 실패.
- 스테이지 입장 시 Lv.1 초기화 (로그라이크). 계정 누적은 '내실'만.

## 1. 플랫폼 확정 사항 (변경 금지)

| 항목 | 결정 | 근거 |
|---|---|---|
| 맵 | 기존 `map/map01.map` 사용, `TileMapMode = 0` (MapleTile) 유지 | 보드 게임이라 물리 이동 없음. 모드 전환은 Maker 수동 작업이므로 회피 |
| 퍼즐판 | **월드 엔티티 방식**: 보드 배경 스프라이트 + 셀 좌표 계산으로 엔티티 배치 | UI 방식보다 아바타/이펙트 활용 유리 |
| 그리드 | 기본 **7×7** (스테이지별 설정 가능 구조), 셀 크기 **0.8 world unit**, 보드 중심 (0, 0.3) | PC 화면 12.8×7.2 / Mobile 9.6×5.4 안에 수용 (기획서 p.21 모바일 최적화) |
| 몬스터 | `.model`: Transform + SpriteRenderer + script (Body/Movement **없음** — 이동 안 하므로 LEA-3004 무관) | 정적 배치, 위치는 스크립트가 설정 |
| 캐릭터(보드 말) | DefaultPlayer 아바타 사용. `PlayerControllerComponent`/`RigidbodyComponent` Enable=false (ModelBuilder Values), 위치는 게임 로직이 설정 | 직업별 메이플 아바타 표현 (기획서 p.10) |
| 전투 | **커스텀 데미지 시스템** (서버 @Logic이 HP 관리). 엔진 HitComponent 파이프라인 미사용 | 그리드 기반 범위/방향 계산이 핵심이므로 |
| 카메라 | 보드 전체가 보이는 고정 카메라 | 퍼즐판 게임 |
| 영속 데이터 | `_DataStorageService` — 내실/에너지/메소/스테이지 진행도 | 기획서 p.17~18 |
| 좌표 | 1 world unit = 100px. 셀(col,row) → world 변환은 BoardLogic 단일 소스 | platform.md §5 |

## 2. 시스템 분할 (기획서 섹션 매핑)

| # | 시스템 | 기획서 페이지 | 핵심 |
|---|---|---|---|
| 1 | board-and-wave | p.4, 8, 9, 21 | 퍼즐판, 젠 시스템, 랜덤 배치, 몬스터 누적, 실패 조건 |
| 2 | jobs-and-combat | p.10, 11 | 직업 4종, 공격 방향/범위 (궁수 직선·마법사 8칸·전사 4칸·도적 원거리 타겟), 수동/자동 |
| 3 | skills-and-fusion | p.11, 12, 13 | 1차 스킬 2종/직업, 스킬 Lv.3 만렙, 합성 (활성화/완료 조건 분리, 고정 조합식) |
| 4 | level-choice-jobadv | p.14, 16 | 레벨/경험치, 선택지 3개(스킬90%/장비10%), 선택지 3→5 확장, 전직 (3회 노출 시 활성, 전리품 재료, 최대 4차 구조) |
| 5 | companion | p.15 | 동료 합류 (전직 후/보스 전 선택지), 2차 전직 기준 랜덤, 본캐 유사 능력치, 방향/스킬순서 지정 |
| 6 | loot-equip-growth-bm | p.16, 17, 18 | 장비(스테이지 한정, 10% 확률, 고효율), 전리품(전직 재료/선택지 확장), 내실(계정 귀속, 영향 낮음), BM(에너지/리롤 3회/내실) |
| 7 | monsters-boss | p.19, 20 | 주황버섯 HP10(10젠 미처치 시 진화), 스톤골렘 HP15(증식), 보스 머쉬맘 HP100(소환/10%회복/분열), HP Bar, 디졸브, 메소/레드메소 드랍 |
| 8 | ui-modes-stages | p.7, 22, 23 | 테마-스테이지 구조(헤네시스, 5~6 스테이지), 로비(스토리/챌린지/타임어택), 스테이지 선택(단풍의전설 레퍼런스), HUD(젠 버튼/체력Bar), 선택지 카드 팝업 |

## 3. 파일 배치 규칙

| 종류 | 경로 |
|---|---|
| 게임 스크립트 `.mlua` | `RootDesk/MyDesk/Zengard/` (도메인별 하위 폴더 가능: `Zengard/Core/`, `Zengard/Combat/`, `Zengard/UI/` 등) |
| 몬스터/오브젝트 `.model` | `RootDesk/MyDesk/Models/Monsters/`, `Models/MapObjects/`, `Models/Effects/` |
| UI | `ui/*.ui` — **UIBuilder 경유만 허용** |
| 맵 | `map/map01.map` — **MapBuilder 경유만 허용** |
| 설계 문서 | `.design/specs/*.md`, 마스터플랜 `.design/MASTER_PLAN.md` |

## 4. 전 에이전트 공통 제약 (위반 = blocking)

1. **MCP Maker 도구 (`maker_*`: play/stop/refresh/logs/screenshot/입력) 호출 금지.** Maker는 단일 공유 자원 — 오케스트레이터만 호출한다. 에이전트는 파일 작성/수정까지만.
2. `.model`/`.ui`/`.map`은 builder CJS 경유만. 호출 전 `builder-protocol.md` 전문 Read 필수.
   - MapBuilder: `C:/Users/user/AI 테스트/.claude/skills/msw-general/scripts/map/msw_map_builder.cjs`
   - ModelBuilder: `C:/Users/user/AI 테스트/.claude/skills/msw-general/scripts/model/msw_model_builder.cjs`
   - UIBuilder: `C:/Users/user/AI 테스트/.claude/skills/msw-ui-system/scripts/msw_ui_builder.cjs`
3. `.mlua` 작성 전 `msw-scripting/SKILL.md` + `references/verify-checklist.md` 전문 Read 필수.
4. `.codeblock` 생성/수정 금지 (Maker refresh가 생성). `Environment/`, `Global/` 수정 금지 — 단, 마스터플랜이 명시한 `Global/DefaultPlayer.model`의 ModelBuilder 경유 수정만 예외.
5. `SpriteRUID` 빈 문자열 금지. 리소스 RUID는 `msw-search` 스킬 절차로 검색 (`.claude/skills/msw-search/`). 검색 실패 시 스펙/구현 노트에 "RUID 필요" 마킹.
6. 식별자/코드/주석 영어, 게임 내 노출 텍스트는 한국어. 주석은 '왜'만 (what 설명 주석 금지).
7. 매직 넘버는 밸런스 테이블 상수로 (기획서 수치는 그대로: HP 10/15/100, 20젠, 90%/10%, 리롤 3회 등).
8. 서버 권위: 게임 상태(HP/exp/선택지/재화)는 서버 @Logic. UI는 클라이언트. `_LocalizationService` 등 ClientOnly API를 서버에서 호출 금지.
9. `log()`를 핵심 체크포인트에 삽입 (OnBeginPlay, 젠 시작, 처치, 레벨업, 클리어/실패) — 검증 단계가 로그로 확인한다.
10. 다른 워커 소유 파일 수정 금지 (마스터플랜의 파일 소유권 준수).

## 5. 통합 계약 (감독관이 MASTER_PLAN.md에서 최종 확정)

- 서버 상태 머신: `ZengardGameLogic` (@Logic) — Lobby → StageSelect → InStage(Zen N) → BossPhase → Clear/Fail
- 보드 수학: `BoardLogic` — cell(col,row) ↔ world position 단일 변환 소스
- 이벤트 (잠정): `ZenStartedEvent`, `MonsterKilledEvent`, `LevelUpEvent`, `ChoiceResolvedEvent`, `BossSpawnedEvent`, `StageEndedEvent`
- UI 그룹 (잠정): `LobbyGroup`, `StageSelectGroup`, `GameHUDGroup`, `ChoicePopupGroup`, `ResultGroup`, `GrowthGroup`
- 이름/이벤트/모델 id의 최종 명세는 MASTER_PLAN.md가 단일 진실 — 구현 에이전트는 그것만 따른다.

## 6. 검증 기준 (Phase 4)

- 기획서 페이지별 요구사항 → 체크리스트 매핑 (감독관이 작성)
- Maker `refresh` → build 로그 0 에러 → `play` → 런타임 로그로 플로우 확인 → `screenshot`으로 기획서 시안(p.4 보드, p.8 젠 버튼, p.23 HUD/체력바)과 시각 대조
- 사용자 확인 없이 blocking 이슈 0이 될 때까지 수정 루프
