# 기존 인포마인드 작업물 적응 규칙

기존 인포마인드 UX팀 작업물 `emrdl7/43bosang`, `emrdl7/ccenter`, `emrdl7/samdasoo`를 KRDS+INFOMIND 기준으로 번역하기 위한 참조다. 사용자가 기존 작업물, 43보상, 문화예술진흥원 공연예매, 삼다수 주문관리 스타일을 언급하면 이 문서를 먼저 적용한다.

## 핵심 원칙

- 기존 구조는 학습 자산이다. 바로 금지하지 말고 신규 컴포넌트와 토큰으로 번역한다.
- 새 코드에는 SCSS, raw hex/rgb/px, inline event, `herf`, `alt` 누락을 만들지 않는다.
- 접근성은 호환보다 우선한다.
- 기존 클래스명은 전환기 JS hook으로만 병행하고, 새 스타일은 KRDS BEM 클래스에 작성한다.

## 구조/클래스 매핑

| 기존 | 신규 기준 |
|------|-----------|
| `.skip_navi` | `.skip-to-content` |
| `#header` | `.header` |
| `.head-tools` | `.header__tools` 또는 utility nav |
| `button.main-menu` | `.main-menu__trigger` |
| `nav#main-menu.menu/allMenu` | `.main-menu` + `.is-open`/`aria-expanded` |
| `#content` | `<main id="main-content">` |
| `.btn.main`, `button.main`, `.submit` | `.btn.btn--primary` |
| `.btn.sub`, `button.sub` | `.btn.btn--secondary` 또는 `.btn.btn--tertiary` |
| `.btn-set`, `.button-set`, `.btns` | 버튼 묶음 layout object |
| `.pagenation` | `.pagination` |
| `.layerPop`, `.signPop`, `.mainPop`, `.modal` | `.modal` |
| `dl.form`, `.input-box` | `.form`, `.form__group`, `.form__label`, `.form__control` |
| `.select-outline` | `.select` |
| `.tableOutline` | `.table` |
| `.main-swiper`, `.swiper-slide` | `.carousel` |
| `.order-list`, `.order-detail`, `.order-info` | `.list`/`.table`/`.card` 조합 |
| `.seat`, `.seat-disabled`, `.seat-distancing` | 좌석 컴포넌트 승인 필요. 임시 구현은 native button/disabled/a11y 우선 |

## 토큰 매핑 방향

| 기존 값 | 신규 토큰 |
|---------|-----------|
| `#5680CC`, `#2C8CCB`, `#719df2` | `--color-primary`, `--krds-light-color-primary-*` |
| `#505b6e`, `#1f222d`, `#303339` | `--color-bg-inverse`, `--color-text-bolder` |
| `#fff`, `#f4f4f4`, `#efefef`, `#f1f3f8` | `--color-bg`, `--color-surface-subtler`, `--color-bg-subtle` |
| `#bbb`, `#ccc`, `#d4d4d4`, `#c3dae5` | `--color-border`, `--color-border-light` |
| `#555`, `#777`, `#999`, `#aaa` | `--color-text-subtle`, `--color-text-disabled` |
| `#74C8FF`, `#91DCD2`, `#88C46F`, `#FFCE48`, `#8FABE3` | 의미 토큰이 없으면 `infomind-overrides.json`에 사유와 함께 추가 |
| `height: 38px` | KRDS size-height 중 의미상 가장 가까운 값. 모바일 44px 이상 우선 |
| `z-index: 1200`, `10000` | `--z-sticky`, `--z-modal`, `--z-modal-backdrop` |

전체 상세는 `site/guides/legacy-infomind-adoption.md`와 `prompts/legacy-infomind.md`를 참조한다.
