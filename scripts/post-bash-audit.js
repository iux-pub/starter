#!/usr/bin/env node

// Bash 도구 후 후행 검사 — Bash가 검사 영역(src/, site/, starter/src/, starter/site/)
// 안의 css/md/html/njk를 변경했다면 check-violations.js로 검사하고
// error 1+ 시 exit 2 + stderr로 강한 메시지를 보낸다.
//
// 라운드15 §"Bash 우회 결함"의 후행 신호 레이어.
// PreToolUse Write|Edit|MultiEdit는 차단, PostToolUse Bash는 후행 검출.

const { execFileSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const SCOPE_RE = /^(src\/|site\/|starter\/src\/|starter\/site\/).+\.(css|md|html|njk)$/

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    return error.stdout ? String(error.stdout).trim() : ''
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
  })
}

function changedFiles() {
  const out = run('git', ['status', '--short'])
  if (!out) return []
  return out.split('\n')
    .map(line => line.slice(3).trim())
    .map(file => file.replace(/^"|"$/g, ''))
    .filter(Boolean)
    .filter(file => !file.includes(' -> '))
    .filter(file => SCOPE_RE.test(file))
}

async function main() {
  // stdin은 무시해도 동작 (hook payload는 참고용일 뿐 git 상태가 진실).
  await readStdin().catch(() => '')

  const files = changedFiles()
  if (files.length === 0) {
    process.exit(0)
  }

  const { runOnSynthesized } = require('./check-violations.js')
  // synthesizeFinalContent는 Write/Edit/MultiEdit 위주이므로,
  // 여기선 단순히 디스크 상태를 직접 검사한다 (Bash가 이미 디스크에 썼음).
  const fs = require('fs')
  let totalErrors = 0
  let totalWarns = 0
  const allFindings = []

  for (const f of files) {
    const abs = path.resolve(ROOT, f)
    if (!fs.existsSync(abs)) continue
    const content = fs.readFileSync(abs, 'utf8')
    const r = runOnSynthesized({
      tool_name: 'Write',
      tool_input: { file_path: abs, content }
    })
    totalErrors += r.errorCount
    totalWarns += r.warningCount
    if (r.findings.length) allFindings.push(...r.findings)
  }

  if (totalErrors === 0 && totalWarns === 0) {
    process.exit(0)
  }

  const { formatFindings } = require('./check-violations.js')
  process.stderr.write(`[post-bash-audit] Bash 도구 후 검사 영역에 위반 ${totalErrors}건(error), ${totalWarns}건(warning) 발견:\n\n`)
  process.stderr.write(formatFindings(allFindings, { color: false }))
  process.stderr.write('\n\n→ Bash redirect/sed 등으로 PreToolUse 차단을 우회한 변경. Write/Edit 도구로 다시 작성하거나 위반을 즉시 수정할 것.\n')

  if (totalErrors > 0) process.exit(2)
  process.exit(0)
}

main()
