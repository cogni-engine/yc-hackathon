/** PoC: progressive mermaid build + line-diff edit. Isolated scratch doc. */
import { installDom } from '../dom';
import { loadEnv } from '../env';

installDom();
loadEnv();

async function run() {
  const { AgentSession, sleep } = await import('../session');
  const url = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:1234';
  const session = new AgentSession({
    url,
    docName: `canvas:mermaid-poc-${process.pid}`,
    name: 'PoC',
    color: '#888888',
  });
  await session.connect();

  const fence = [
    '```mermaid',
    'flowchart LR',
    '    A["応募"] --> B["審査"]',
    '    B --> C["出資"]',
    '    C --> D["Demo Day"]',
    '```',
  ].join('\n');

  console.log('--- progressive insert ---');
  await session.insertMermaidProgressive(session.docEnd(), fence);
  const afterInsert = session.markdown();
  console.log(afterInsert);

  const block = session
    .blocks()
    .find(b => b.markdown.includes('flowchart LR'));
  if (!block?.id) throw new Error('mermaid block not found / no blockId');

  console.log('--- line-diff edit (change C, drop D, add E) ---');
  const newFence = [
    '```mermaid',
    'flowchart LR',
    '    A["応募"] --> B["審査"]',
    '    B --> C["出資+株式"]',
    '    C --> E["バッチ"]',
    '```',
  ].join('\n');
  const ok = await session.editMermaidBlock(block.id, newFence);
  console.log('edit applied:', ok);
  await sleep(300);
  const finalMd = session.markdown();
  console.log(finalMd);

  const expected = 'flowchart LR\n    A["応募"] --> B["審査"]\n    B --> C["出資+株式"]\n    C --> E["バッチ"]';
  const pass = finalMd.includes(expected);
  console.log(pass ? 'PASS ✅' : 'FAIL ❌ (content mismatch)');
  session.destroy();
  process.exit(pass ? 0 : 1);
}

run().catch(err => {
  console.error('fatal:', err);
  process.exit(1);
});
