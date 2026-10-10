import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
export function localEnvironment(root, { memory=false }={}) {
  const directory=resolve(root,'.sites-runtime');mkdirSync(directory,{recursive:true});
  const db=new DatabaseSync(memory?':memory:':resolve(directory,'gym.sqlite'));
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const file of readdirSync(resolve(root,'drizzle')).filter(v=>v.endsWith('.sql')).sort()){
    if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(file)){
      db.exec('BEGIN');try{db.exec(readFileSync(resolve(root,'drizzle',file),'utf8'));db.prepare('INSERT INTO local_migrations(name) VALUES (?)').run(file);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
    }
  }
  function prepare(sql,values=[]) { return { bind(...params){return prepare(sql,params);}, async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {success:true,meta:db.prepare(sql).run(...values)};},_sql:sql,_values:values }; }
  const DB={ prepare,async batch(statements){db.exec('BEGIN');try{const r=[];for(const s of statements)r.push({success:true,meta:db.prepare(s._sql).run(...s._values)});db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}} };
  const bucket=resolve(directory,'uploads');mkdirSync(bucket,{recursive:true});
  const BUCKET={async put(key,bytes,options){mkdirSync(dirname(resolve(bucket,key)),{recursive:true});writeFileSync(resolve(bucket,key),new Uint8Array(bytes));writeFileSync(resolve(bucket,key+'.json'),JSON.stringify(options));},async get(key){if(!existsSync(resolve(bucket,key)))return null;const meta=JSON.parse(readFileSync(resolve(bucket,key+'.json'),'utf8'));return {body:readFileSync(resolve(bucket,key)),...meta};}};
  return {DB,BUCKET,__LOCAL_PREVIEW:true,close:()=>db.close()};
}
