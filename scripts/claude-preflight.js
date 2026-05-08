#!/usr/bin/env node

// Claude PreToolUse hook — Write/Edit/MultiEdit 결과를 합성해 error만 차단한다.

const path = require('path')
const { runOnSynthesized } = require('./check-violations.js')

const ROOT = path.resolve(__dirname, '..')

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
  })
}

function normalizeRel(filePath) {
  if (!filePath) return ''
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(ROOT, filePath)
  return path.relative(ROOT, abs).replace(/\\/g, '/')
}

function shouldInspect(relPath) {
  if (!relPath || relPath.startsWith('..')) return false

  if (/^(src\/styles\/|starter\/src\/styles\/).+\.css$/.test(relPath)) return true

  return /^(src\/|site\/|starter\/src\/|starter\/site\/).+\.(html|md|njk)$/.test(relPath)
}

function toToolPayload(raw) {
  const payload = JSON.parse(raw || '{}')
  const toolName = payload.tool_name || payload.toolName || ''
  const toolInput = payload.tool_input || payload.toolInput || {}
  const relPath = normalizeRel(toolInput.file_path)

  return {
    tool_name: toolName,
    tool_input: {
      ...toolInput,
      file_path: relPath
    }
  }
}

function summarize(result) {
  const counts = `오류 ${result.errorCount}개, 경고 ${result.warningCount}개`
  return result.summary ? `${counts}\n\n${result.summary}` : counts
}

async function main() {
  const raw = await readStdin()
  let payload

  try {
    payload = toToolPayload(raw)
  } catch (error) {
    console.error(`[claude-preflight] hook input JSON 파싱 실패: ${error.message}`)
    process.exit(0)
  }

  const relPath = payload.tool_input.file_path || ''
  if (!['Write', 'Edit', 'MultiEdit'].includes(payload.tool_name) || !shouldInspect(relPath)) {
    process.exit(0)
  }

  const result = runOnSynthesized(payload, { strict: false })

  if (result.blocked) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[info-design preflight] ${relPath} 변경이 error 규칙을 위반했습니다.\n\n${summarize(result)}`
    }))
    process.exit(0)
  }

  if (result.warningCount > 0) {
    console.error(`[info-design preflight] ${relPath} 경고 ${result.warningCount}개\n\n${result.summary}`)
  }
}

main()
