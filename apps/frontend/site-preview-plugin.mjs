import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { localEnvironment } from '../../scripts/local-sites-storage.mjs';
import { handleAPI } from '../sites-api/index.mjs';
export function sitePreview() {
  return {name:'fitbro-sites-api-preview',configureServer(server){
    if(process.env.VITE_SITES_MODE!=='true')return;
    const env=localEnvironment(fileURLToPath(new URL('../../',import.meta.url)));
    server.httpServer?.on('close',()=>env.close());
    server.middlewares.use(async(req,res,next)=>{
      if(req.url?.startsWith('/__responsive')) {
        const url=new URL(req.url,'http://preview.test'); const width=Number(url.searchParams.get('width') || 375);
        if(![320,375,390,768,1024,1440].includes(width)){res.statusCode=400;return res.end('Invalid test width');}
        res.setHeader('Content-Type','text/html; charset=utf-8');
        return res.end(`<!doctype html><html><head><title>FitBro responsive check</title><style>body{margin:0;background:#dfe6d9;font-family:system-ui}header{padding:12px;font-size:12px}iframe{display:block;width:${width}px;height:1000px;border:0;background:white;margin:0 auto}</style></head><body><header>Responsive test · ${width}px · <a href="/__responsive?width=375">Mobile</a> · <a href="/__responsive?width=768">Tablet</a> · <a href="/__responsive?width=1440">Desktop</a></header><iframe title="Gym Management responsive preview" src="/dashboard"></iframe></body></html>`);
      }
      if(!req.url?.startsWith('/api/'))return next();
      try{
        const parts=[];for await(const part of req)parts.push(part);
        const body=Buffer.concat(parts),method=req.method||'GET',headers=new Headers();
        for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
        const request=new Request(`http://${req.headers.host}${req.url}`,{method,headers,...(!['GET','HEAD'].includes(method)?{body}: {})});
        const response=await handleAPI(request,env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
      }catch(error){console.error(error.message);res.statusCode=500;res.end('Preview request failed');}
    });
  }};
}
