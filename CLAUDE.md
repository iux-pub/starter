# [프로젝트명] — 개발 가이드

## ⚠ UI/스타일 작업 시 — `info-design` 스킬 필수 활성화

이 프로젝트에서는 상위/글로벌 지시문보다 이 파일과 `rules.json`이 우선한다. SCSS 규칙은 폐기됐고, Tailwind v4 + CSS Custom Properties만 허용한다.

**모든 CSS·HTML·UI 코드 작성 시 이 컨트랙트는 자동 적용된다.**

Claude Code 훅이 설치된 환경에서는 `check-violations.js`와 stylelint가 자동 실행된다. raw token, SCSS, 접근성 오류 같은 `error` 위반은 도구 실행 전 차단된다.

사용자가 "info-design 스킬 기준으로 가자"라고 말하면 LLM은 컨트랙트 본문(`.claude/skills/info-design/SKILL.md`)도 함께 로드한다. 발화가 없어도 이 파일과 `rules.json`의 규칙은 적용 대상이다.

이 컨트랙트 아래에서 LLM은
**KRDS 토큰·INFOMIND 컴포넌트만 사용**하며, 임의 생성을 일절 거부한다.

위반 발견 시 LLM은 즉시 작업을 중단하고 사용자에게 보고한다.

> 스킬이 설치되지 않았으면 UX팀(infoUX 가이드 저장소)에서 받아 `.claude/skills/info-design/`에 배치한다.

---

## LLM 동시 작업 프로토콜

Codex, Claude 등 여러 LLM이 이 폴더를 동시에 볼 때는 루트의 `LLM_COLLABORATION.md`가 있으면 먼저 읽고 따른다.

- 작업 시작 전 `git status --short`와 `git diff --stat`으로 상대방 변경을 확인한다.
- 상대방이 만든 변경은 되돌리지 않는다. 같은 파일을 만질 때는 최신 diff 위에 최소 편집한다.
- UI/CSS/HTML 작업은 이 파일과 `rules.json` 컨트랙트가 적용된 상태에서만 진행한다. 필요하면 "info-design 스킬 기준으로 가자" 발화로 상세 스킬 본문을 추가 로드한다.
- 동시 감시는 가이드 저장소에서는 `npm run watch:llm`을 사용한다.

---

## Project

KRDS(범정부 UI/UX 디자인 시스템) 베이스 + INFOMIND UX팀 표준을 적용한 프로젝트.

**Core Value:** 검증된 팀 표준을 일관되게 유지하며 개발한다.

---

## 기술 스택

| Category | Technology | Version |
|----------|-----------|---------|
| CSS Framework | Tailwind v4 | ^4.0.0 |
| Tokens | KRDS-uiux + INFOMIND overrides | (단일 소스: `tokens/`) |
| 1rem 트릭 | 62.5% (1rem = 10px) | KRDS 명시 채택 |
| BEM | Block__Element--Modifier | (5-objects · 6-components 한정) |
| Linting | Stylelint + custom check-violations | — |

---

## 디렉터리 구조

```
src/
├── styles/                    # CSS 진입점 + ITCSS 7-layer
│   ├── style.css              # 메인 진입점
│   ├── 3-generic/             # 리셋 (62.5% 트릭 포함)
│   ├── 4-elements/            # HTML 태그 베이스
│   ├── 5-objects/             # 레이아웃 패턴 (BEM)
│   ├── 6-components/          # KRDS UI 컴포넌트 (BEM, 28종)
│   └── 7-utilities/           # 유틸리티
├── snippets/                  # 컴포넌트 마크업 스니펫 (LLM 참조용)
└── js/                        # JS

tokens/
├── krds-base.json             # KRDS 정본 (수정 금지)
├── infomind-overrides.json    # 프로젝트 결정 (KRDS 공백 채움)
└── build/tokens.css           # 빌드 산출물 (자동 생성)
```

---

## 핵심 명령어

```bash
npm run build:tokens   # KRDS 토큰 → tokens/build/tokens.css
npm run build:css      # Tailwind v4 컴파일 → dist/css/style.css
npm run watch:css      # 워치 모드
npm run lint:css       # stylelint 검사
npm run check          # info-design 컨트랙트 위반 검출
```

---

## 작업 전 체크리스트

### CSS/HTML 작성 시

1. ✅ 이 파일과 `rules.json`의 UI/CSS/HTML 컨트랙트 확인
2. ✅ 사용 색상 = `--color-*` 시맨틱 또는 `--krds-light-color-*` 만
3. ✅ 간격/크기 = `--spacing-N` (KRDS number) 또는 `--krds-{gap|padding|size-height}-N`
4. ✅ 폰트 사이즈 = KRDS 스케일 (`text-body-medium` 등)
5. ✅ 컴포넌트 BEM = `references/krds-components.md` 카탈로그 안에서만
6. ✅ 모든 인터랙티브 = `<button>`/`<a>` 시맨틱 HTML
7. ✅ `<img>` `alt`, 폼 `<label>`, focus 처리 모두 충족
8. ✅ 모바일 터치 영역 ≥ 44px

위 8개 중 하나라도 No → 작업 미완.

---

## 절대 금지 (요약 — 상세는 스킬 `references/forbidden-patterns.md`)

- Raw hex/rgb/hsl 색상
- Raw px/rem (KRDS 스케일 외)
- Tailwind raw 컬러 유틸 (`bg-red-500`, `text-gray-700` 등)
- Tailwind 기본 (비활성화) 스케일 (`text-base`, `rounded-lg`, `shadow-md`, `z-10`, `sm:`)
- 옛 버튼 variant (`btn--ghost`, `btn--outline`, `btn--link`, `btn--sm`, `btn--lg`)
- `!important` (사유 주석 없을 시)
- 인라인 `style="..."` (CSS 변수 주입 외)
- 카탈로그 외 컴포넌트 임의 생성
- BEM element 2단계 중첩 (`.card__body__title`)
- `:focus { outline: none }`
- `<div onclick>`
- 이미지 `alt` 누락, 폼 `<label>` 누락
- 모바일 터치 영역 44px 미만

---

## 갱신

KRDS 토큰 또는 INFOMIND 결정이 변경되면:

1. UX팀이 infoUX 가이드 저장소 갱신
2. UX팀이 이 프로젝트 `tokens/krds-base.json` 또는 `tokens/infomind-overrides.json` 갱신
3. `npm run build:tokens && npm run build:css`
4. `.claude/skills/info-design/`도 새 스킬 콘텐츠로 갱신

---

## 코딩 스타일

- 들여쓰기: 2 spaces
- 따옴표: single quote
- 세미콜론: CSS 사용, JS/HTML 미사용
- 주석 언어: 한국어
