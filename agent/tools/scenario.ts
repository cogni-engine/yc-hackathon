/**
 * Scenario runner: end-to-end use-case tests against the RESIDENT agent.
 * Creates a fresh Supabase note (the agent auto-joins within its 15s poll),
 * simulates a human, then judges the outcome from the doc + timings.
 *
 *   npx tsx agent/tools/scenario.ts <scenario-name>
 *   npx tsx agent/tools/scenario.ts --list
 */
import { installDom } from '../dom';
import { loadEnv } from '../env';

installDom();
loadEnv();

const NOTE_JOIN_TIMEOUT = 40_000;

interface Ctx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  log: (...a: unknown[]) => void;
  sleep: (ms: number) => Promise<void>;
  /** ms from instruction start until first remote (AI) edit */
  tFirstRemote: () => number | null;
  /** ms from instruction start until the AI caret moved (any cursor change) */
  tCursorMove: () => number | null;
  markInstructionStart: () => void;
  humanBlocks: () => string[]; // markdown of blocks the fake human wrote
}

interface Scenario {
  name: string;
  /** markdown seeded into the doc before the agent reacts (typed fast). */
  seed?: string;
  /** the human instruction, typed slowly (still-typing window matters). */
  instruction: string;
  /** extra settle time after typing before judging (ms) */
  settleMs: number;
  judge: (finalMd: string, ctx: Ctx) => { verdict: string; evidence: string };
}

const SCENARIOS: Scenario[] = [
  {
    name: 'react-speed',
    instruction:
      '## デモの流れを整理したい。まず参加者がノートを開いて、それからAIが',
    settleMs: 25_000,
    judge: (md, ctx) => {
      const t = ctx.tFirstRemote();
      const c = ctx.tCursorMove();
      const grew = md.length > 60;
      return {
        verdict: t !== null && t < 20_000 && grew ? 'PASS' : 'FAIL',
        evidence: `cursorMove=${c}ms firstEdit=${t}ms docLen=${md.length}`,
      };
    },
  },
  {
    name: 'anticipation-diagram',
    seed: '# 認証フロー\n\n```mermaid\nflowchart LR\n    A["ログイン"] --> B["検証"]\n    B --> C["完了"]\n```\n',
    instruction: 'ここの図を修正したいんだけど、ステップをもう少し詳しくして',
    settleMs: 25_000,
    judge: (md, ctx) => {
      const c = ctx.tCursorMove();
      const edited = /flowchart/.test(md) && md !== '';
      return {
        verdict: c !== null && c < 3_000 && edited ? 'PASS' : c !== null && c < 8000 ? 'PARTIAL' : 'FAIL',
        evidence: `cursorMove=${c}ms diagramStill=${/mermaid/.test(md)}`,
      };
    },
  },
  {
    name: 'question-answer',
    instruction: 'Cognoさん、Y Combinatorとは何か一言で教えて',
    settleMs: 25_000,
    judge: (md, ctx) => {
      const humanKept = md.includes('Y Combinatorとは何か一言で');
      const answered = md.length > 80 && /(アクセラレ|スタートアップ|投資|VC|支援)/.test(md);
      return {
        verdict: humanKept && answered ? 'PASS' : humanKept ? 'PARTIAL' : 'FAIL',
        evidence: `humanTextKept=${humanKept} answered=${answered} len=${md.length}`,
      };
    },
  },
  {
    name: 'scaffold-heading',
    instruction: '## 発表当日のチェックリスト',
    settleMs: 25_000,
    judge: (md, ctx) => {
      const humanKept = md.includes('発表当日のチェックリスト');
      const scaffolded = /- \[ \]|^- /m.test(md);
      return {
        verdict: humanKept && scaffolded ? 'PASS' : humanKept ? 'PARTIAL' : 'FAIL',
        evidence: `humanKept=${humanKept} scaffolded=${scaffolded}`,
      };
    },
  },
  {
    name: 'diagram-generate',
    instruction: 'ユーザーがサインアップしてメール認証して初回ログインするまでの流れを図にして',
    settleMs: 40_000,
    judge: md => {
      const fence = md.match(/```mermaid\n([\s\S]*?)```/);
      const valid = !!fence && /flowchart (LR|TD)/.test(fence[1]) && /\["/.test(fence[1]);
      return {
        verdict: valid ? 'PASS' : fence ? 'PARTIAL' : 'FAIL',
        evidence: fence ? `mermaid present, quotedLabels=${/\["/.test(fence[1])}` : 'no mermaid block',
      };
    },
  },
  {
    name: 'diagram-partial-edit',
    seed: '# YCの流れ\n\n```mermaid\nflowchart LR\n    A["応募"] --> B["審査"]\n    B --> C["出資"]\n```\n',
    instruction: '図にDemo Dayのステップも追加して',
    settleMs: 40_000,
    judge: md => {
      const fence = md.match(/```mermaid\n([\s\S]*?)```/);
      const kept = !!fence && fence[1].includes('A["応募"] --> B["審査"]');
      const added = !!fence && /Demo ?Day/i.test(fence[1]);
      return {
        verdict: kept && added ? 'PASS' : added ? 'PARTIAL' : 'FAIL',
        evidence: `unchangedLinesKept=${kept} demoDayAdded=${added}`,
      };
    },
  },
  {
    name: 'human-text-protection',
    seed: '朝会メモ: リリースは金曜。QAは木曜まで。\n\n担当: 森脇=デモ、松岡=インフラ\n',
    instruction: 'このメモの続きを書こうと思っていて、まだ途中なんだけど',
    settleMs: 25_000,
    judge: md => {
      const memoKept = md.includes('リリースは金曜') && md.includes('森脇=デモ');
      const instructionKept = md.includes('まだ途中');
      return {
        verdict: memoKept && instructionKept ? 'PASS' : 'FAIL',
        evidence: `memoKept=${memoKept} instructionKept=${instructionKept}`,
      };
    },
  },
  {
    name: 'explicit-delete',
    seed: 'This paragraph is obsolete and should go away.\n\n議事録: 次回は火曜 10時から。\n',
    instruction: '上の英語の段落は要らないので消して',
    settleMs: 40_000,
    judge: md => {
      const englishGone = !md.includes('obsolete and should go away');
      const japaneseKept = md.includes('次回は火曜');
      return {
        verdict: englishGone && japaneseKept ? 'PASS' : japaneseKept ? 'PARTIAL' : 'FAIL',
        evidence: `englishDeleted=${englishGone} otherHumanTextKept=${japaneseKept}`,
      };
    },
  },
  {
    name: 'translate-follow',
    seed: 'Our demo shows realtime co-editing with an AI collaborator.\n\nThe AI has its own cursor and edits like a human.\n\n```mermaid\nflowchart LR\n    A["Human"] --> B["Editor"]\n```\n',
    instruction: 'この文章ぜんぶ日本語にして。図はそのままでいいよ',
    settleMs: 45_000,
    judge: md => {
      const translated = /(共同編集|コラボ|カーソル|編集)/.test(md) && !/Our demo shows/.test(md);
      const fence = md.match(/```mermaid\n([\s\S]*?)```/);
      const diagramUntouched = !!fence && fence[1].includes('A["Human"] --> B["Editor"]');
      return {
        verdict: translated && diagramUntouched ? 'PASS' : translated || diagramUntouched ? 'PARTIAL' : 'FAIL',
        evidence: `translated=${translated} diagramUntouched=${diagramUntouched}`,
      };
    },
  },
  {
    name: 'bar-chart-add',
    seed: '# 四半期の成果\n\nQ1は20件、Q2は50件、Q3は80件の成約だった。\n',
    instruction: 'この数字、棒グラフも追加したくて',
    settleMs: 30_000,
    judge: md => {
      const fence = md.match(/```mermaid\n([\s\S]*?)```/);
      const bar = !!fence && /xychart-beta/.test(fence[1]) && /bar \[/.test(fence[1]);
      return {
        verdict: bar ? 'PASS' : fence ? 'PARTIAL' : 'FAIL',
        evidence: fence ? `chartType=${/xychart/.test(fence[1]) ? 'xychart' : 'other'}` : 'no mermaid',
      };
    },
  },
  {
    name: 'delete-language-parts',
    seed: 'This is an English note about the demo.\n\n日本語のメモ: デモは金曜日。\n\nAnother English paragraph to keep.\n\n日本語の下書き: あとで消す予定のメモ。\n',
    instruction: '日本語の部分をぜんぶ消して',
    settleMs: 30_000,
    judge: md => {
      const jaGone = !md.includes('デモは金曜日') && !md.includes('あとで消す予定');
      const enKept = md.includes('English note about the demo') && md.includes('Another English paragraph');
      return {
        verdict: jaGone && enKept ? 'PASS' : enKept ? 'PARTIAL' : 'FAIL',
        evidence: `japaneseDeleted=${jaGone} englishKept=${enKept}`,
      };
    },
  },
  {
    name: 'self-revision',
    instruction: 'Cognoさん、Pillowの特徴を3つ、箇条書きで書いて',
    settleMs: 35_000,
    judge: (md, ctx) => {
      // Phase 2 handled in run(): after the first answer, the human asks for
      // a rewrite of Cogno's own content; judge sees the final state.
      const bullets = (md.match(/^- /gm) || []).length;
      const revised = /一行|1行|短く/.test(md) === false; // instruction may be cleaned
      return {
        verdict: bullets >= 1 && bullets <= 6 ? 'PASS' : 'PARTIAL',
        evidence: `bullets=${bullets} (expected concise list after revision) revisedHint=${revised}`,
      };
    },
  },
];

async function run() {
  const name = process.argv[2];
  if (!name || name === '--list') {
    console.log(SCENARIOS.map(s => s.name).join('\n'));
    process.exit(0);
  }
  const scenario = SCENARIOS.find(s => s.name === name);
  if (!scenario) {
    console.error(`unknown scenario: ${name}`);
    process.exit(1);
  }

  const { AgentSession, sleep } = await import('../session');
  const { createClient } = await import('@supabase/supabase-js');
  const url =
    process.env.AGENT_HOCUSPOCUS_URL ||
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ||
    'ws://localhost:1234';

  const log = (...a: unknown[]) =>
    console.log(`[${scenario.name} ${new Date().toISOString().slice(14, 19)}]`, ...a);

  // Fresh note per scenario — the resident agent joins it via its poll.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: note, error } = await supabase
    .from('notes')
    .insert({ workspace_id: 1, title: `test-${scenario.name}` })
    .select('id')
    .single();
  if (error || !note) throw new Error(`note create failed: ${error?.message}`);
  log(`note:${note.id} created`);

  const session = new AgentSession({
    url,
    docName: `note:${note.id}`,
    name: 'Fake Human',
    color: '#F98181',
  });
  await session.connect();

  // Wait for Cogno to join (awareness user present).
  const awaitCogno = async () => {
    const start = Date.now();
    for (;;) {
      const states = session.provider.awareness?.getStates();
      if (states) {
        for (const [, s] of states) {
          const u = (s as { user?: { name?: string } }).user;
          if (u?.name && u.name !== 'Fake Human') return true;
        }
      }
      if (Date.now() - start > NOTE_JOIN_TIMEOUT) return false;
      await sleep(1000);
    }
  };
  if (!(await awaitCogno())) {
    console.log(`RESULT ${scenario.name}: FAIL | agent never joined note:${note.id}`);
    process.exit(0);
  }
  log('Cogno joined');

  // Instrumentation.
  let instructionStartAt = 0;
  let firstRemoteAt: number | null = null;
  let cursorMoveAt: number | null = null;
  session.ydoc.on('update', (_u: Uint8Array, origin: unknown) => {
    if (origin === session.provider && instructionStartAt && firstRemoteAt === null) {
      firstRemoteAt = Date.now();
    }
  });
  let lastCursorJson = '';
  session.provider.awareness?.on('change', () => {
    const states = session.provider.awareness!.getStates();
    for (const [id, s] of states) {
      if (id === session.ydoc.clientID) continue;
      const cur = JSON.stringify((s as { cursor?: unknown }).cursor ?? null);
      if (instructionStartAt && cur !== lastCursorJson) {
        lastCursorJson = cur;
        if (cursorMoveAt === null && cur !== 'null') cursorMoveAt = Date.now();
      }
    }
  });

  // Seed content (fast paste, as pre-existing doc state).
  if (scenario.seed) {
    session.insertMarkdownAt(session.docEnd(), scenario.seed);
    await sleep(4000); // let the agent's baseline settle... (it may react; fine)
  }

  // Type the instruction slowly like a human (still-typing window).
  const end = session.docEnd();
  session.insertNodeAt(end, { type: 'paragraph' });
  await session.moveCursorTo(end + 1, 100);
  instructionStartAt = Date.now();
  let pos = end + 1;
  for (let i = 0; i < scenario.instruction.length; i += 2) {
    const chunk = scenario.instruction.slice(i, i + 2);
    pos = await session.typeText(chunk, pos);
    await sleep(140);
  }
  session.clearCursor();
  log('instruction typed');

  // Special phase-2 for self-revision.
  if (scenario.name === 'self-revision') {
    await sleep(30_000);
    let p2 = session.docEnd();
    session.insertNodeAt(p2, { type: 'paragraph' });
    p2 += 1;
    const followUp = 'さっきの特徴、それぞれ一行に短くして';
    for (let i = 0; i < followUp.length; i += 2) {
      p2 = await session.typeText(followUp.slice(i, i + 2), p2);
      await sleep(120);
    }
    session.clearCursor();
    log('follow-up typed');
  }

  await sleep(scenario.settleMs);

  const finalMd = session.markdown();
  const ctx: Ctx = {
    session,
    log,
    sleep,
    tFirstRemote: () => (firstRemoteAt ? firstRemoteAt - instructionStartAt : null),
    tCursorMove: () => (cursorMoveAt ? cursorMoveAt - instructionStartAt : null),
    markInstructionStart: () => void 0,
    humanBlocks: () => [],
  };
  const { verdict, evidence } = scenario.judge(finalMd, ctx);
  console.log(`RESULT ${scenario.name}: ${verdict} | ${evidence}`);
  console.log(`--- final doc (${finalMd.length} chars) ---`);
  console.log(finalMd.slice(0, 1200));

  // Cleanup: soft-delete the test note so the sidebar stays clean.
  await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', note.id);
  session.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error('fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
