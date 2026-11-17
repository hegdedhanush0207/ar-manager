/**
 * Converts a Claude Code session transcript (.jsonl) into a readable Markdown
 * log for ai-logs/ (brief section 4.17).
 *
 *   node --env-file=.env.local scripts/export-transcript.mjs <session.jsonl> <output.md>
 *
 * Keeps the user's messages, the assistant's replies and every tool call with
 * its result (long results are shortened). Leaves out the hidden context the
 * tool attaches automatically (<system-reminder> blocks), and masks email
 * addresses and the workspace id if they ever appear.
 */
import fs from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node --env-file=.env.local scripts/export-transcript.mjs <session.jsonl> <output.md>');
  process.exit(1);
}

const MAX_RESULT = 2500; // characters of each tool result to keep
const MAX_INPUT = 4000; // characters of each tool call's input to keep

function redact(s) {
  let out = s.replace(/[A-Za-z0-9._%+-]+@gmail\.com/g, '[email removed]');
  const ws = process.env.AR_WORKSPACE_ID;
  if (ws) out = out.split(ws).join('[workspace id removed]');
  // Extra private words to mask, comma-separated, e.g. REDACT_TERMS="myname,other" (never committed).
  for (const term of (process.env.REDACT_TERMS ?? '').split(',').map((t) => t.trim()).filter(Boolean)) {
    out = out.split(term).join('[removed]');
  }
  return out;
}

const stripReminders = (s) => s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… [${s.length - n} more characters not shown]` : s);
const fence = (s) => '```\n' + s.replace(/```/g, '` ` `') + '\n```';

function textOf(content) {
  if (typeof content === 'string') return content;
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

function resultText(c) {
  if (typeof c.content === 'string') return c.content;
  if (Array.isArray(c.content)) return c.content.map((x) => (x.type === 'text' ? x.text : `[${x.type}]`)).join('\n');
  return '';
}

function describeInput(name, input) {
  if (name === 'Write' && input.file_path) return `file: ${input.file_path}\n\n${input.content ?? ''}`;
  if (name === 'Edit' && input.file_path) return `file: ${input.file_path}\n--- replace:\n${input.old_string}\n--- with:\n${input.new_string}`;
  if ((name === 'Bash' || name === 'PowerShell') && input.command) return `${input.description ? `# ${input.description}\n` : ''}${input.command}`;
  return JSON.stringify(input, null, 2);
}

const records = fs
  .readFileSync(input, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => (r.type === 'user' || r.type === 'assistant') && !r.isSidechain);

const parts = [
  '# Claude Code session log — AR Manager',
  '',
  'Full conversation from the Claude Code session of 17-Nov-2026 that built steps 3–12 of the brief: the user\'s messages, the assistant\'s replies, and every tool call (file edits, commands) with its result. Long tool results are shortened. Hidden context that Claude Code attaches automatically is left out. No credentials appear: the workspace id was never printed during the session.',
  '',
];

let turn = 0;
for (const r of records) {
  const content = r.message?.content;
  if (!content) continue;
  if (r.type === 'user') {
    if (typeof content === 'string' || content.some((c) => c.type === 'text')) {
      const t = stripReminders(textOf(content));
      if (t) {
        turn++;
        parts.push(`---\n\n## User message ${turn}\n`, t.replace(/<\/?pasted_content[^>]*>/g, ''), '');
      }
    }
    if (Array.isArray(content)) {
      for (const c of content) {
        if (c.type === 'tool_result') {
          const t = stripReminders(resultText(c));
          parts.push(`<details><summary>Result${c.is_error ? ' (error)' : ''}</summary>\n`, fence(clip(t, MAX_RESULT)), '\n</details>\n');
        }
      }
    }
  } else {
    for (const c of Array.isArray(content) ? content : [{ type: 'text', text: content }]) {
      if (c.type === 'text' && c.text.trim()) parts.push(`**Assistant:**\n\n${c.text.trim()}\n`);
      if (c.type === 'tool_use') parts.push(`**Tool call — ${c.name}**\n`, fence(clip(describeInput(c.name, c.input ?? {}), MAX_INPUT)), '');
    }
  }
}

const md = redact(parts.join('\n')) + '\n';
fs.writeFileSync(output, md);
console.log(`Wrote ${output}: ${turn} user messages, ${(md.length / 1024).toFixed(0)} KB`);
