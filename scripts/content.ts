import { resolve } from 'node:path';
import { contentCommand } from '../apps/studio/src/content-commands.js';
await contentCommand(resolve(import.meta.dirname,'..'),process.argv.slice(2)).catch(error=>{console.error(String(error));process.exitCode=1;});
