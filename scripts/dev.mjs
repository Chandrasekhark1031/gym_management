import { spawn } from 'node:child_process';
const args=process.argv.slice(2);
const sites=args.includes('--sites') || args.includes('--strictPort') || process.env.VITE_SITES_MODE==='true';
const executable=process.platform==='win32'?'npm.cmd':'npm';
const command=sites?['run','dev','--workspace=frontend','--',...args.filter(v=>v!=='--sites')]:['exec','concurrently','--','-k','-p','[{name}]','-n','BACKEND,FRONTEND','-c','green.bold,cyan.bold','npm run dev:backend','npm run dev:frontend'];
const child=spawn(executable,command,{stdio:'inherit',env:{...process.env,...(sites?{VITE_SITES_MODE:'true'}:{})}});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));
child.on('exit',code=>process.exit(code||0));
