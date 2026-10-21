import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { aiConfigSchema, doctor, draftEditorial } from '@atlas/ai';

export async function aiCommand(root: string, args: string[]) {
  const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  const base = JSON.parse(await readFile(join(root, 'atlas.config.json'), 'utf8'));
  let local: { ai?: Record<string, unknown> } = {};
  try { local = JSON.parse(await readFile(join(root, 'atlas.config.local.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const config = aiConfigSchema.parse({ ...base.ai, ...local.ai,
    ...(option('--model') ? { model: option('--model') } : {}),
    ...(option('--effort') ? { effort: option('--effort') } : {})
  });
  if (args[0] === 'doctor') {
    const result = await doctor(config);
    console.log(JSON.stringify(result, null, 2));
    if (!result.installed) process.exitCode = 1;
    return;
  }
  if (args[0] !== 'draft' || !option('--brief') || !option('--out')) {
    throw new Error('Usage: atlas ai doctor | atlas ai draft --brief <evidence.json> --out <new-brief.json> [--model name] [--effort off|on|low|medium|high|default]');
  }
  const input = resolve(option('--brief')!);
  const output = resolve(option('--out')!);
  if (input === output) throw new Error('Use a new output path; research input is preserved.');
  // Preflight before spending inference time, and use exclusive write after inference too.
  try { await readFile(output); throw new Error(`Output already exists: ${output}`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const { brief, provenance } = await draftEditorial(JSON.parse(await readFile(input, 'utf8')), config);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(brief, null, 2) + '\n', { flag: 'wx' });
  const runDir = join(root, 'output', 'runs');
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, `${Date.now()}-${process.pid}.json`), JSON.stringify({ ...provenance, input, output }, null, 2));
  console.log(JSON.stringify({ status: 'draft-created', output, model: config.model, next: `npm run atlas -- run --brief "${output}"` }, null, 2));
}
