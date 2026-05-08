# 43bosang 레거시 적응 규칙

기존 인포마인드 UX팀 작업물 `emrdl7/43bosang`을 KRDS+INFOMIND 기준으로 번역하기 위한 참조다. 신규 코드 생성 전, 사용자가 기존 작업물이나 43보상 스타일을 언급하면 이 문서를 먼저 적용한다.

## 핵심 원칙

- 기존 구조는 학습 자산이다. 바로 금지하지 말고 신규 컴포넌트와 토큰으로 번역한다.
- 새 코드에는 SCSS, raw hex/rgb/px, inline event, `herf`, `alt` 누락을 만들지 않는다.
- 접근성은 호환보다 우선한다.
- 기존 클래스명은 전환기 JS hook으로만 병행하고, 새 스타일은 KRDS BEM 클래스에 작성한다.

## 구조 매핑

| 43bosang | 신규 기준 |
|----------|-----------|
| `.skip_navi` | `.skip-to-content` |
| `#header` | `.header` |
| `button.main-menu` | `.main-menu__trigger` |
| `nav#main-menu.menu/allMenu` | `.main-menu` + `.is-open`/`aria-expanded` |
| `#content` | `<main id="main-content">` |
| `.contentsOutline` | `.container` 안 콘텐츠 영역 |
| `.btn.main` | `.btn.btn--primary` |
| `.btn.sub` | `.btn.btn--secondary` 또는 `.btn.btn--tertiary` |
| `.pagenation` | `.pagination` |
| `.layerPop`, `.signPop`, `.mainPop` | `.modal` |
| `dl.form`, `dl.form2`, `dl.form3` | `.form`, `.form__group`, `.form__label`, `.form__control` |
| `.select-outline` | `.select` |
| `.tableOutline` | `.table` |

## 토큰 매핑 방향

| 기존 값 | 신규 토큰 |
|---------|-----------|
| `#5680CC`, `#2C8CCB` | `--color-primary`, `--krds-light-color-primary-*` |
| `#505b6e`, `#1f222d` | `--color-bg-inverse`, `--color-text-bolder` |
| `#fff`, `#f4f4f4`, `#efefef` | `--color-bg`, `--color-surface-subtler`, `--color-bg-subtle` |
| `#bbb`, `#ccc`, `#d4d4d4` | `--color-border`, `--color-border-light` |
| `#555`, `#777`, `#999` | `--color-text-subtle`, `--color-text-disabled` |
| `height: 38px` | KRDS size-height 중 의미상 가장 가까운 값. 모바일 44px 이상 우선 |
| `z-index: 1200`, `10000` | `--z-sticky`, `--z-modal`, `--z-modal-backdrop` |

전체 상세는 `site/guides/legacy-43bosang-adoption.md`와 `prompts/legacy-43bosang.md`를 참조한다.
