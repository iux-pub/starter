#!/usr/bin/env node

// check-violations.js — info-design 컨트랙트 자동 검출
// KRDS 토큰 외 raw 값, 옛 시스템 흔적, 옛 variant, SCSS 잔재, 접근성 누락,
// 인포마인드 레거시 클래스(R-15) 검출.
//
// CLI 사용:
//   node scripts/check-violations.js [files...]
//   종료 코드: 0 = 통과/경고만, 2 = 오류, STRICT=1 시 경고도 1로 실패
//
// 모듈 사용 (PreToolUse preflight 등):
//   const { checkCssText, checkHtmlText, runOnSynthesized,
//           synthesizeFinalContent } = require('./check-violations.js')
//
//   findings: [{ severity: 'error'|'warning', file, line, message, code, ruleId }]

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const STYLES_DIR = path.join(ROOT, 'src/styles')
const SNIPPETS_DIR = path.join(ROOT, 'src/snippets')
const SITE_DIR = path.join(ROOT, 'site')

// ─── 출력 색상 (CLI 전용) ──────────────────────────────

const RESET = '\x1b[0m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'

// ─── findings 헬퍼 ────────────────────────────────────

function pushError(findings, file, line, message, code, ruleId) {
  findings.push({ severity: 'error', file, line: line || null, message, code: code || '', ruleId: ruleId || null })
}

function pushWarn(findings, file, line, message, code, ruleId) {
  findings.push({ severity: 'warning', file, line: line || null, message, code: code || '', ruleId: ruleId || null })
}

const rel = (p) => path.relative(ROOT, p)

// ─── 패턴 정의 ────────────────────────────────────────

// 1. SCSS 잔재 — info-design은 Tailwind v4 + CSS만 허용
const SCSS_USE = /@use\s+['"]/
const SCSS_FORWARD = /@forward\s+['"]/
const SCSS_VAR = /^\s*\$[\w-]+\s*:/

// 2. 옛 토큰명
const OLD_TOKEN_NAMES = [
  '--color-primary-light', '--color-primary-dark',
  '--color-text-secondary',
  '--color-bg-secondary',
  '--color-primary-alpha-8', '--color-primary-alpha-6', '--color-black-alpha-50',
  '--font-size-2xl', '--font-size-xl', '--font-size-lg', '--font-size-md',
  '--font-size-base', '--font-size-sm', '--font-size-xs',
  '--font-family-base',
  '--font-weight-medium', '--font-weight-semibold',
  '--leading-tight', '--leading-loose',
  '--spacing-xs', '--spacing-sm', '--spacing-md', '--spacing-lg', '--spacing-xl',
  '--spacing-2xl', '--spacing-3xl',
  '--radius-sm', '--radius-base', '--radius-lg', '--radius-xl', '--radius-full',
  '--shadow-sm', '--shadow-base', '--shadow-lg',
  '--transition-fast', '--transition-base', '--transition-slow'
]

// 3. 옛 버튼 variant
const OLD_BTN_VARIANTS = ['btn--ghost', 'btn--outline', 'btn--link', 'btn--sm', 'btn--lg', 'btn--hero']

// 4. Tailwind raw 컬러 유틸리티
const TW_RAW_COLOR = /\b(?:bg|text|border|ring|divide|hover:bg|hover:text|hover:border)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/

// 5. Tailwind 비활성 기본 스케일
const TW_DEFAULT_TEXT_SIZE = /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/
const TW_DEFAULT_FONT_WEIGHT = /\bfont-(?:thin|extralight|light|medium|semibold|extrabold|black)\b/
const TW_DEFAULT_RADIUS = /\brounded(?:-(?:sm|md|lg|xl|2xl|3xl|none|full))?\b/
const TW_DEFAULT_SHADOW = /\bshadow(?:-(?:xs|sm|md|lg|xl|2xl|inner|none))\b/
const TW_DEFAULT_ZINDEX = /\bz-(?:0|10|20|30|40|50|auto)\b/
const TW_DEFAULT_BREAKPOINT = /\b(?:sm|md|lg|xl|2xl):/

// 6. CSS hardcoded values
const HARDCODED_HEX = /:\s*#[0-9a-fA-F]{3,8}\b/
const HARDCODED_RGB = /:\s*rgba?\s*\(/
const HARDCODED_HSL = /:\s*hsla?\s*\(/
const HARDCODED_PX = /(?:^|\s)(?:padding|margin|gap|top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|font-size)\s*:\s*(\d+px)/
const ALLOWED_PX = /^(?:0|1|2|3|44|1px|2px|3px)$/

// 7. CSS 시스템 우회
const IMPORTANT_USED = /!important/
const FOCUS_OUTLINE_NONE = /:focus(?![-:\w])\s*\{[^}]*outline\s*:\s*(?:none|0)/

// 8. BEM 위반
const BEM_DOUBLE_ELEMENT = /\.([\w-]+)__([\w-]+)__([\w-]+)/

// 9. HTML 위반
const INLINE_STYLE = /\bstyle\s*=/
const INLINE_STYLE_CUSTOM_PROP = /\bstyle\s*=\s*["'][^"']*--[\w-]+:[^"']*["']/
const MISSING_ALT = /<img(?![^>]*\balt\s*=)[^>]*\bsrc\s*=[^>]*>/
const CLICK_ON_DIV = /<(?:div|span)[^>]+onclick/

// 10. R-15 — 인포마인드 레거시 클래스 (43bosang/ccenter/samdasoo)
//   기존 작업물은 적응 기간 허용, 신규 스타일링 도입은 warning.
//   js-legacy-* prefix는 전환기 JS hook이라 허용.
const LEGACY_INFOMIND_CLASSES = [
  'pagenation',
  'layerPop', 'signPop', 'mainPop',
  'btn-set', 'button-set', 'button-set2', 'btns',
  'select-outline', 'tableOutline',
  'skip_navi', 'allMenu'
]
// 복합 selector 패턴 (요소 + 클래스 결합)
const LEGACY_INFOMIND_COMPOUND = [
  /\bdl\.form\d?\b/, // dl.form, dl.form2, dl.form3
  /\b(?:button|a|input)?\.btn\.(?:main|sub)\b/,
  /\bbutton\.(?:main|sub)\b/
]
// "컴포넌트 승인 필요" warning 대상 — 도메인 prefix 클래스
const LEGACY_INFOMIND_PREFIX = [
  /\bseat-[\w-]+\b/,
  /\border-[\w-]+\b/
]
// 검사 제외 — js-legacy-*는 전환기 JS hook
const JS_LEGACY_ALLOWLIST = /\bjs-legacy-[\w-]+\b/

// ─── CSS 검사 ──────────────────────────────────────────

function checkCssText(content, relPath, opts = {}) {
  const findings = []
  const lines = content.split('\n')

  if (lines[0] && (lines[0].includes('AUTO-GENERATED') || lines[0].includes('자동 생성'))) {
    return findings
  }

  const isTokenFile = (opts.isTokenFile != null) ? opts.isTokenFile : (
    relPath.includes('1-settings') ||
    relPath.includes('_project-overrides') ||
    relPath.includes('tokens/build')
  )
  const isUtilities = relPath.includes('7-utilities')

  lines.forEach((line, i) => {
    const lineNum = i + 1
    const trimmed = line.replace(/\/\*.*?\*\//g, '').trim()
    if (!trimmed) return

    if (SCSS_USE.test(trimmed)) {
      pushError(findings, relPath, lineNum, 'SCSS @use 사용 금지. CSS @import 또는 Tailwind v4 @theme 사용.', trimmed, 'R-03')
    }
    if (SCSS_FORWARD.test(trimmed)) {
      pushError(findings, relPath, lineNum, 'SCSS @forward 사용 금지.', trimmed, 'R-03')
    }
    if (SCSS_VAR.test(trimmed)) {
      pushError(findings, relPath, lineNum, 'SCSS 변수 ($var) 금지. CSS 커스텀 프로퍼티 사용.', trimmed, 'R-03')
    }

    for (const oldName of OLD_TOKEN_NAMES) {
      if (trimmed.includes(`var(${oldName})`)) {
        pushWarn(findings, relPath, lineNum, `옛 토큰명 \`${oldName}\` 사용. KRDS 토큰으로 교체 필요.`, trimmed, 'R-01')
      }
    }

    for (const oldVar of OLD_BTN_VARIANTS) {
      if (trimmed.match(new RegExp(`\\.${oldVar.replace(/--/g, '\\-\\-')}\\b`))) {
        pushWarn(findings, relPath, lineNum, `옛 버튼 variant \`.${oldVar}\` 사용. KRDS 4 variant + 5 size로 교체.`, trimmed)
      }
    }

    // R-15 — 신규 CSS에 인포마인드 레거시 클래스 셀렉터 도입 검출
    if (!JS_LEGACY_ALLOWLIST.test(trimmed)) {
      for (const cls of LEGACY_INFOMIND_CLASSES) {
        if (trimmed.match(new RegExp(`\\.${cls}\\b`))) {
          pushWarn(findings, relPath, lineNum, `R-15: 인포마인드 레거시 클래스 \`.${cls}\` 신규 스타일링 금지. 신규 BEM/컴포넌트로 번역.`, trimmed, 'R-15')
        }
      }
      for (const re of LEGACY_INFOMIND_COMPOUND) {
        const m = trimmed.match(re)
        if (m) {
          pushWarn(findings, relPath, lineNum, `R-15: 레거시 복합 셀렉터 \`${m[0]}\` 신규 사용 금지. 신규 BEM/컴포넌트로 번역.`, trimmed, 'R-15')
        }
      }
      for (const re of LEGACY_INFOMIND_PREFIX) {
        const m = trimmed.match(re)
        if (m) {
          pushWarn(findings, relPath, lineNum, `R-15: 레거시 도메인 클래스 \`${m[0]}\` — 컴포넌트 승인/매핑 필요.`, trimmed, 'R-15')
        }
      }
    }

    if (!isTokenFile) {
      if (HARDCODED_HEX.test(trimmed)) {
        pushError(findings, relPath, lineNum, 'Raw hex 색상 금지. KRDS 토큰 var(--color-*) 또는 var(--krds-*) 사용.', trimmed, 'R-01')
      }
      if (HARDCODED_RGB.test(trimmed)) {
        pushError(findings, relPath, lineNum, 'Raw rgb/rgba 색상 금지. KRDS 토큰 사용.', trimmed, 'R-01')
      }
      if (HARDCODED_HSL.test(trimmed)) {
        pushError(findings, relPath, lineNum, 'Raw hsl/hsla 색상 금지. KRDS 토큰 사용.', trimmed, 'R-01')
      }
      const pxMatch = trimmed.match(HARDCODED_PX)
      if (pxMatch && !ALLOWED_PX.test(pxMatch[1])) {
        pushWarn(findings, relPath, lineNum, `하드코딩 \`${pxMatch[1]}\`. KRDS spacing 토큰 사용 권장.`, trimmed, 'R-01')
      }
    }

    if (IMPORTANT_USED.test(trimmed) && !isUtilities) {
      const hasJustification = trimmed.includes('/* ') || (lines[i - 1] || '').includes('/*')
      if (!hasJustification) {
        pushWarn(findings, relPath, lineNum, '!important 사용 시 사유 주석 필수.', trimmed, 'R-02')
      }
    }

    const bemMatch = trimmed.match(BEM_DOUBLE_ELEMENT)
    if (bemMatch) {
      pushError(findings, relPath, lineNum, `BEM 2단계 element 중첩 금지: .${bemMatch[1]}__${bemMatch[2]}__${bemMatch[3]}`, trimmed, 'R-05')
    }
  })

  const contentNoComments = content.replace(/\/\*[\s\S]*?\*\//g, '')
  if (FOCUS_OUTLINE_NONE.test(contentNoComments)) {
    const matchLine = lines.findIndex(l => l.match(/:focus(?![-:\w])\s*\{/))
    pushError(findings, relPath, matchLine + 1, ':focus { outline: none } 금지. KRDS 4px primary outline 유지.', '', 'R-11')
  }

  return findings
}

// ─── HTML/MD/NJK 검사 ──────────────────────────────────

function checkHtmlText(content, relPath, opts = {}) {
  const findings = []
  const lines = content.split('\n')

  const isMarkdown = (opts.isMarkdown != null) ? opts.isMarkdown : relPath.endsWith('.md')

  // frontmatter lint-ignore: true → 파일 전체 skip
  if (isMarkdown && /^---\s*\n[\s\S]*?\blint-ignore:\s*true\b[\s\S]*?\n---\s*\n/.test(content)) {
    return findings
  }

  let inFence = false
  let fenceSkip = false
  const FENCE_RE = /^\s*```(\S*)\s*(.*)$/
  const SKIP_LANG = /^(?:bad|forbidden|diff|example-bad|nope)$/i
  const SKIP_META = /\b(?:bad|forbidden|nope|do-not|금지|안\s*됨)\b/i
  const PRE_BAD_MARK = /<!--\s*(?:bad-example|forbidden|do-not)\s*-->|^\s*(?:나쁜|잘못된|금지)/i

  lines.forEach((line, i) => {
    const lineNum = i + 1
    const trimmed = line.trim()

    if (isMarkdown) {
      const m = line.match(FENCE_RE)
      if (m) {
        if (!inFence) {
          inFence = true
          const lang = m[1] || ''
          const meta = m[2] || ''
          const prev = (lines[i - 1] || '').trim()
          fenceSkip = SKIP_LANG.test(lang) || SKIP_META.test(meta) || PRE_BAD_MARK.test(prev)
        } else {
          inFence = false
          fenceSkip = false
        }
        return
      }
      if (inFence && fenceSkip) return
      // 펜스 밖 마크다운 본문은 자연어 — 검사 skip
      if (!inFence) return
    }

    if (!trimmed) return

    if (INLINE_STYLE.test(trimmed) && !INLINE_STYLE_CUSTOM_PROP.test(trimmed)) {
      pushWarn(findings, relPath, lineNum, '인라인 style 금지. BEM 클래스 또는 Tailwind 유틸 사용.', trimmed.slice(0, 100), 'R-07')
    }

    const bemMatch = trimmed.match(BEM_DOUBLE_ELEMENT)
    if (bemMatch) {
      pushWarn(findings, relPath, lineNum, 'BEM 2단계 element 중첩 클래스 금지.', trimmed.slice(0, 100), 'R-08')
    }

    if (MISSING_ALT.test(trimmed)) {
      pushError(findings, relPath, lineNum, '<img> alt 속성 누락. 장식이면 alt="".', trimmed.slice(0, 100), 'R-09')
    }

    if (CLICK_ON_DIV.test(trimmed)) {
      pushError(findings, relPath, lineNum, '<div>/<span> onclick 금지. <button> 또는 <a> 사용.', trimmed.slice(0, 100), 'R-10')
    }

    if (TW_RAW_COLOR.test(trimmed)) {
      const match = trimmed.match(TW_RAW_COLOR)
      pushError(findings, relPath, lineNum, `Tailwind raw 컬러 유틸 \`${match[0]}\` 금지. KRDS 시맨틱 사용.`, trimmed.slice(0, 100), 'R-01')
    }

    if (TW_DEFAULT_TEXT_SIZE.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_TEXT_SIZE)
      pushWarn(findings, relPath, lineNum, `Tailwind 기본 \`${match[0]}\` 비활성화됨. KRDS 스케일 사용.`, trimmed.slice(0, 100))
    }
    if (TW_DEFAULT_FONT_WEIGHT.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_FONT_WEIGHT)
      pushWarn(findings, relPath, lineNum, `KRDS는 400/700만 정의. \`${match[0]}\` 사용 시 적절한 두께로 교체.`, trimmed.slice(0, 100))
    }
    if (TW_DEFAULT_RADIUS.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_RADIUS)
      if (match[0] !== 'rounded-none') {
        pushWarn(findings, relPath, lineNum, `Tailwind 기본 \`${match[0]}\` 비활성화됨. KRDS rounded-* 사용.`, trimmed.slice(0, 100))
      }
    }
    if (TW_DEFAULT_SHADOW.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_SHADOW)
      pushWarn(findings, relPath, lineNum, `Tailwind 기본 \`${match[0]}\` 비활성화됨. INFOMIND shadow-{1|2|3} 사용.`, trimmed.slice(0, 100))
    }
    if (TW_DEFAULT_ZINDEX.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_ZINDEX)
      pushWarn(findings, relPath, lineNum, `Tailwind 기본 \`${match[0]}\` 사용 지양. INFOMIND z-* 사용.`, trimmed.slice(0, 100))
    }
    if (TW_DEFAULT_BREAKPOINT.test(trimmed)) {
      const match = trimmed.match(TW_DEFAULT_BREAKPOINT)
      pushWarn(findings, relPath, lineNum, `Tailwind 기본 \`${match[0]}\` 비활성화됨. KRDS small:/medium:/large:/xlarge:/xxlarge: 사용.`, trimmed.slice(0, 100))
    }

    for (const oldVar of OLD_BTN_VARIANTS) {
      if (trimmed.match(new RegExp(`\\b${oldVar.replace(/--/g, '\\-\\-')}\\b`))) {
        pushWarn(findings, relPath, lineNum, `옛 버튼 variant \`${oldVar}\` 사용. KRDS variant로 교체.`, trimmed.slice(0, 100))
      }
    }

    // R-15 — HTML/마크업의 인포마인드 레거시 클래스
    if (!JS_LEGACY_ALLOWLIST.test(trimmed)) {
      for (const cls of LEGACY_INFOMIND_CLASSES) {
        if (trimmed.match(new RegExp(`\\bclass\\s*=\\s*["'][^"']*\\b${cls}\\b[^"']*["']`))) {
          pushWarn(findings, relPath, lineNum, `R-15: 인포마인드 레거시 클래스 \`${cls}\` 사용. 신규 BEM/컴포넌트로 번역.`, trimmed.slice(0, 100), 'R-15')
        }
      }
    }
  })

  return findings
}

// ─── PreToolUse 합성 ──────────────────────────────────

function synthesizeFinalContent(payload) {
  const tool = payload.tool_name
  const input = payload.tool_input || {}
  const filePath = input.file_path || ''
  let content = ''

  if (tool === 'Write') {
    content = input.content || ''
  } else if (tool === 'Edit') {
    const base = filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
    if (input.replace_all) {
      content = base.split(input.old_string || '').join(input.new_string || '')
    } else {
      const idx = base.indexOf(input.old_string || '')
      content = idx === -1 ? base : (base.slice(0, idx) + (input.new_string || '') + base.slice(idx + (input.old_string || '').length))
    }
  } else if (tool === 'MultiEdit') {
    let buf = filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
    for (const e of (input.edits || [])) {
      if (e.replace_all) {
        buf = buf.split(e.old_string || '').join(e.new_string || '')
      } else {
        const idx = buf.indexOf(e.old_string || '')
        if (idx !== -1) buf = buf.slice(0, idx) + (e.new_string || '') + buf.slice(idx + (e.old_string || '').length)
      }
    }
    content = buf
  }

  let kind = 'other'
  if (filePath.endsWith('.css')) kind = 'css'
  else if (filePath.endsWith('.html') || filePath.endsWith('.njk') || filePath.endsWith('.md')) kind = 'html'

  return { content, filePath, kind, relPath: filePath ? rel(path.resolve(filePath)) : '' }
}

function runOnSynthesized(payload, opts = {}) {
  const { content, filePath, kind, relPath } = synthesizeFinalContent(payload)
  let findings = []
  if (kind === 'css') {
    findings = checkCssText(content, relPath, { isTokenFile: relPath.includes('1-settings') || relPath.includes('_project-overrides') || relPath.includes('tokens/build') })
  } else if (kind === 'html') {
    findings = checkHtmlText(content, relPath, { isMarkdown: filePath.endsWith('.md') })
  }
  const errors = findings.filter(f => f.severity === 'error')
  const warns = findings.filter(f => f.severity === 'warning')
  const blocked = errors.length > 0 || Boolean(opts.strict && warns.length > 0)
  const summary = formatFindings(findings, { color: false })
  return { findings, blocked, summary, errorCount: errors.length, warningCount: warns.length }
}

// ─── 출력 포맷 ────────────────────────────────────────

function formatFindings(findings, { color = true } = {}) {
  const c = (col, s) => color ? `${col}${s}${RESET}` : s
  return findings.map(f => {
    const tag = f.severity === 'error' ? c(RED, '[ERROR]') : c(YELLOW, '[WARN] ')
    const loc = f.line ? `${f.file}:${f.line}` : f.file
    const rid = f.ruleId ? ` (${f.ruleId})` : ''
    const codeLine = f.code ? `\n  ${color ? `${DIM}${f.code}${RESET}` : f.code}` : ''
    return `${tag} ${loc}${rid}\n  ${f.message}${codeLine}`
  }).join('\n')
}

// ─── 컴포넌트 인덱스 일관성 (CLI 전체 스캔 시만) ───────

function checkComponentIndex(findings) {
  const indexPath = path.join(STYLES_DIR, '6-components', 'index.css')
  if (!fs.existsSync(indexPath)) return
  const indexContent = fs.readFileSync(indexPath, 'utf-8')
  const componentsDir = path.join(STYLES_DIR, '6-components')
  const cssFiles = fs.readdirSync(componentsDir)
    .filter(f => f.endsWith('.css') && f !== 'index.css')
    .map(f => f.replace(/\.css$/, ''))
  const importedNames = []
  indexContent.split('\n').forEach(line => {
    const match = line.match(/@import\s+["']\.\/([^"']+)\.css["']/)
    if (match) importedNames.push(match[1])
  })
  cssFiles.forEach(name => {
    if (!importedNames.includes(name)) {
      pushError(findings, rel(indexPath), null, `${name}.css가 존재하지만 index.css에 @import 누락.`, '', 'index')
    }
  })
}

// ─── SCSS 잔재 ────────────────────────────────────────

function checkScssRemnants(findings) {
  const dirs = [path.join(ROOT, 'src'), path.join(ROOT, 'starter', 'src')]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const found = collectFiles(dir, '.scss', ['node_modules'])
    for (const f of found) {
      pushError(findings, rel(f), null, 'SCSS 파일 잔재. info-design은 CSS만 허용.', '', 'R-03')
    }
  }
}

function collectFiles(dir, ext, excludes = []) {
  if (!fs.existsSync(dir)) return []
  const results = []
  function walk(current) {
    fs.readdirSync(current).forEach(name => {
      const full = path.join(current, name)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) walk(full)
      else if (full.endsWith(ext) && !excludes.some(e => full.includes(e))) {
        results.push(full)
      }
    })
  }
  walk(dir)
  return results
}

// ─── CLI 메인 ──────────────────────────────────────────

function main() {
  console.log(`${CYAN}[check-violations]${RESET} info-design 컨트랙트 검사 시작...\n`)

  const targets = process.argv.slice(2)
  const findings = []

  if (targets.length > 0) {
    for (const target of targets) {
      const abs = path.resolve(target)
      if (!fs.existsSync(abs)) {
        console.error(`파일을 찾을 수 없음: ${target}`)
        process.exit(1)
      }
      const content = fs.readFileSync(abs, 'utf-8')
      const r = rel(abs)
      if (abs.endsWith('.css')) findings.push(...checkCssText(content, r))
      if (abs.endsWith('.html') || abs.endsWith('.njk') || abs.endsWith('.md')) {
        findings.push(...checkHtmlText(content, r))
      }
    }
  } else {
    const cssFiles = collectFiles(STYLES_DIR, '.css', ['node_modules'])
    cssFiles.forEach(f => {
      const c = fs.readFileSync(f, 'utf-8')
      findings.push(...checkCssText(c, rel(f)))
    })
    checkScssRemnants(findings)
    const htmlFiles = [
      ...collectFiles(SNIPPETS_DIR, '.md'),
      ...collectFiles(SITE_DIR, '.html', ['_site', 'node_modules']),
      ...collectFiles(SITE_DIR, '.njk', ['_site', 'node_modules']),
      ...collectFiles(path.join(ROOT, 'src/playground'), '.html')
    ]
    htmlFiles.forEach(f => {
      const c = fs.readFileSync(f, 'utf-8')
      findings.push(...checkHtmlText(c, rel(f)))
    })
    checkComponentIndex(findings)
  }

  const errors = findings.filter(f => f.severity === 'error')
  const warns = findings.filter(f => f.severity === 'warning')

  if (findings.length > 0) {
    console.log(formatFindings(findings, { color: true }))
    console.log('')
  }

  if (errors.length === 0 && warns.length === 0) {
    console.log(`${GREEN}✓ info-design 컨트랙트 위반 없음${RESET}`)
    process.exit(0)
  }
  if (errors.length > 0) {
    console.error(`${RED}오류 ${errors.length}개${RESET}${warns.length > 0 ? `, ${YELLOW}경고 ${warns.length}개${RESET}` : ''}`)
    process.exit(2)
  }
  console.warn(`${YELLOW}경고 ${warns.length}개${RESET} (오류 없음)`)
  process.exit(process.env.STRICT === '1' ? 1 : 0)
}

// ─── Export ────────────────────────────────────────────

module.exports = {
  checkCssText,
  checkHtmlText,
  synthesizeFinalContent,
  runOnSynthesized,
  formatFindings,
  // 패턴/상수도 노출 — 단위 테스트용
  patterns: {
    OLD_BTN_VARIANTS,
    OLD_TOKEN_NAMES,
    LEGACY_INFOMIND_CLASSES,
    LEGACY_INFOMIND_COMPOUND,
    LEGACY_INFOMIND_PREFIX,
    JS_LEGACY_ALLOWLIST
  }
}

if (require.main === module) {
  main()
}
