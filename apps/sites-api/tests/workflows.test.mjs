import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { localEnvironment } from '../../../scripts/local-sites-storage.mjs';
import { handleAPI } from '../index.mjs';
import { addDays } from '../store.mjs';
const root=resolve(import.meta.dirname,'../../..');
const setup=()=>localEnvironment(root,{memory:true});
const password='Fixture123';
async function call(env,path,{method='GET',body,cookie='',headers={}}={}){
 const response=await handleAPI(new Request('https://workspace.test/api'+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...headers,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
 return {status:response.status,data:await response.json(),cookie:response.headers.get('Set-Cookie')?.split(';')[0]||'',setCookie:response.headers.get('Set-Cookie')||''};
}
const registration=(label='one')=>({name:'Test Owner',gymName:'Test Gym '+label,email:label+'@owner.invalid',phone:'9876543210',password,confirmPassword:password,address:'Test address'});
async function owner(env,label='one'){
 const form=registration(label);
 const registered=await call(env,'/auth/register',{method:'POST',body:form});assert.equal(registered.status,201);
 const r=await call(env,'/auth/login',{method:'POST',body:{identifier:form.email,password}});assert.equal(r.status,200);return {...r,email:form.email};
}
async function member(env,o,label='one',phone='9888888888'){
 const r=await call(env,'/customers',{method:'POST',cookie:o.cookie,body:{name:'Test Member '+label,email:label+'@member.invalid',phone,password,address:'Test address'}});assert.equal(r.status,200);
 const login=await call(env,'/customer/auth/login',{method:'POST',body:{identifier:r.data.customer.email,password}});assert.equal(login.status,200);return {...login,customer:r.data.customer};
}
async function planAndMembership(env,o,m){
 const p=await call(env,'/plans',{method:'POST',cookie:o.cookie,body:{name:'Monthly',durationValue:1,durationUnit:'Months',price:1500}});assert.equal(p.status,200);
 const r=await call(env,'/memberships',{method:'POST',cookie:o.cookie,body:{customerId:m.customer.id,planId:p.data.plan.id}});assert.equal(r.status,200);return {plan:p.data.plan,membership:r.data.membership};
}
test('data reset migration removes the legacy starter table and creates empty account storage',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const name of ['0000_flowery_vindicator.sql','0001_naive_shard.sql'])db.exec(readFileSync(resolve(root,'drizzle',name),'utf8'));
  db.prepare('INSERT INTO gym_records(id,kind,payload,created_at) VALUES (?,?,?,?)').run('legacy-example','customer','{"name":"Legacy starter"}','2026-01-01');
  db.exec(readFileSync(resolve(root,'drizzle/0002_cool_stick.sql'),'utf8'));
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='gym_records'").get(),undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM gym_workspace_records').get().count,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM gym_login_accounts').get().count,0);
 }finally{db.close();}
});
test('owner signup and cookie login start an empty gym; every public request remains unauthenticated',async()=>{
 const env=setup();try{
  for(const path of ['/customers','/plans','/payments','/sites/session','/auth/me'])assert.equal((await call(env,path)).status,401);
  assert.equal((await call(env,'/customers',{headers:{'oai-authenticated-user-id':'pretend-owner','oai-authenticated-user-email':'pretend@owner.invalid',Authorization:'Bearer sites-preview:member-1'}})).status,401);
  const o=await owner(env);
  for(const path of ['/customers','/plans','/payments','/memberships']){const r=await call(env,path,{cookie:o.cookie});assert.equal(r.status,200);assert.deepEqual(r.data[path.slice(1)],[]);}
  const stats=(await call(env,'/dashboard/stats',{cookie:o.cookie})).data.stats;assert.equal(stats.totalCustomers,0);assert.equal(stats.totalPaymentAmount,0);
  assert.equal((await call(env,'/sites/session',{cookie:o.cookie})).data.user.role,'owner');
  assert.equal((await call(env,'/customer/auth/register',{method:'POST',body:{}})).status,404);
  assert.equal((await call(env,'/sites/preview',{method:'POST',cookie:o.cookie,body:{customerId:'member-1'}})).status,404);
 }finally{env.close();}
});
test('signup validates credentials, rejects duplicates and never stores plaintext passwords',async()=>{
 const env=setup();try{
  assert.equal((await call(env,'/auth/register',{method:'POST',body:{...registration(),password:'short',confirmPassword:'short'}})).status,400);
  assert.equal((await call(env,'/auth/register',{method:'POST',body:{...registration(),confirmPassword:'different123'}})).status,400);
  await owner(env);
  assert.equal((await call(env,'/auth/register',{method:'POST',body:registration()})).status,400);
  const a=await env.DB.prepare("SELECT * FROM gym_login_accounts WHERE role='owner'").first();assert.match(a.password_hash,/^\$2[aby]\$10\$/);assert.notEqual(a.password_hash,password);
  const rows=(await env.DB.prepare('SELECT payload FROM gym_workspace_records').all()).results;assert.ok(rows.every(v=>!v.payload.includes(password)&&!v.payload.includes('password_hash')));
 }finally{env.close();}
});
test('production sessions use secure HTTP-only cookies, store only a digest and reject expired sessions',async()=>{
 const env=setup();try{
  env.__LOCAL_PREVIEW=false;const o=await owner(env);assert.match(o.cookie,/^__Host-fitbro_session=/);assert.match(o.setCookie,/HttpOnly/);assert.match(o.setCookie,/SameSite=Lax/);assert.match(o.setCookie,/; Secure/);
  const row=await env.DB.prepare('SELECT * FROM gym_login_sessions').first();assert.notEqual(row.token_hash,o.cookie.split('=')[1]);assert.match(row.token_hash,/^[a-f0-9]{64}$/);
  await env.DB.prepare('UPDATE gym_login_sessions SET expires_at=0').run();assert.equal((await call(env,'/sites/session',{cookie:o.cookie})).status,401);
 }finally{env.close();}
});
test('two gym owners cannot read, edit, assign or delete each other’s records',async()=>{
 const env=setup();try{
  const a=await owner(env,'first'),b=await owner(env,'second'),m=await member(env,a),p=await planAndMembership(env,a,m);
  assert.deepEqual((await call(env,'/customers',{cookie:b.cookie})).data.customers,[]);
  for(const method of ['GET','PUT','DELETE'])assert.equal((await call(env,'/customers/'+m.customer.id,{cookie:b.cookie,method,...(method==='PUT'?{body:{name:'Changed'}}:{})})).status,404);
  assert.equal((await call(env,'/memberships',{cookie:b.cookie,method:'POST',body:{customerId:m.customer.id,planId:p.plan.id}})).status,404);
  assert.equal((await call(env,'/plans/'+p.plan.id,{cookie:b.cookie,method:'DELETE'})).status,404);
  assert.equal((await call(env,'/customers/'+m.customer.id,{cookie:a.cookie})).data.customer.name,m.customer.name);
 }finally{env.close();}
});
test('owner registration requires customer email/password and customer login has no signup flow',async()=>{
 const env=setup();try{
  const o=await owner(env),base={name:'Member',phone:'9888888888',email:'one@member.invalid',password};
  for(const invalid of [{...base,email:''},{...base,password:''},{...base,password:'12345678'},{...base,password:'A1'.repeat(40)}])assert.equal((await call(env,'/customers',{cookie:o.cookie,method:'POST',body:invalid})).status,400);
  const m=await member(env,o);assert.equal(m.data.user.role,'customer');assert.ok(!('password' in m.data.user)&&!('password_hash' in m.data.user));
  assert.equal((await call(env,'/auth/login',{method:'POST',body:{identifier:m.customer.email,password}})).status,401);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password:'Wrong123'}})).status,401);
  assert.equal((await call(env,'/customers',{cookie:o.cookie,method:'POST',body:{...base,phone:'9777777777'}})).status,400);
  assert.equal((await call(env,'/customers',{cookie:o.cookie,method:'POST',body:{...base,email:'other@member.invalid'}})).status,400);
  assert.equal((await call(env,'/customers?search=Test',{cookie:o.cookie})).data.customers.length,1);
 }finally{env.close();}
});
test('customer sessions cannot access owner endpoints or another customer’s details',async()=>{
 const env=setup();try{
  const o=await owner(env),a=await member(env,o),b=await member(env,o,'two','9777777777');
  assert.equal((await call(env,'/customer/profile',{cookie:a.cookie})).data.profile.id,a.customer.id);
  for(const path of ['/customers','/customers/'+b.customer.id,'/plans','/payments','/auth/me'])assert.equal((await call(env,path,{cookie:a.cookie})).status,403);
  assert.equal((await call(env,'/sites/preview',{cookie:a.cookie,method:'POST',body:{customerId:b.customer.id}})).status,404);
  assert.equal((await call(env,'/customer/profile',{cookie:o.cookie})).status,403);
  const r=await call(env,'/customer/profile',{cookie:a.cookie,method:'PATCH',body:{name:'Updated Member',address:'Updated address',id:b.customer.id,email:b.customer.email,role:'owner'}});assert.equal(r.data.profile.id,a.customer.id);assert.equal(r.data.profile.email,a.customer.email);
 }finally{env.close();}
});
test('owner edits customer email/password atomically and revokes old sessions',async()=>{
 const env=setup();try{
  const o=await owner(env),m=await member(env,o),b=await member(env,o,'two','9777777777');
  assert.equal((await call(env,'/customers/'+m.customer.id,{cookie:o.cookie,method:'PUT',body:{email:b.customer.email,name:'Must roll back',password:'Changed123'}})).status,400);
  assert.equal((await call(env,'/customer/profile',{cookie:m.cookie})).data.profile.name,m.customer.name);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password}})).status,200);
  const r=await call(env,'/customers/'+m.customer.id,{cookie:o.cookie,method:'PUT',body:{email:'changed@member.invalid',password:'Changed123'}});assert.equal(r.status,200);
  assert.equal((await call(env,'/sites/session',{cookie:m.cookie})).status,401);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password}})).status,401);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:'changed@member.invalid',password:'Changed123'}})).status,200);
 }finally{env.close();}
});
test('deactivation and deletion revoke customer access while reactivation requires a new login',async()=>{
 const env=setup();try{
  const o=await owner(env),m=await member(env,o);
  assert.equal((await call(env,'/customers/'+m.customer.id+'/status',{cookie:o.cookie,method:'PATCH',body:{accountStatus:'INACTIVE'}})).status,200);
  assert.equal((await call(env,'/customer/profile',{cookie:m.cookie})).status,401);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password}})).status,403);
  await call(env,'/customers/'+m.customer.id+'/status',{cookie:o.cookie,method:'PATCH',body:{accountStatus:'ACTIVE'}});
  const login=await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password}});assert.equal(login.status,200);
  assert.equal((await call(env,'/customers/'+m.customer.id,{cookie:o.cookie,method:'DELETE'})).status,200);
  assert.equal((await call(env,'/sites/session',{cookie:login.cookie})).status,401);
  assert.equal((await call(env,'/customer/auth/login',{method:'POST',body:{identifier:m.customer.email,password}})).status,401);
 }finally{env.close();}
});
test('owner and customer change passwords with current-password verification and logout invalidates cookies',async()=>{
 const env=setup();try{
  const o=await owner(env),m=await member(env,o);
  for(const who of [o,m]){
   const role=who===o?'owner':'customer',email=who===o?o.email:m.customer.email;
   const another=await call(env,role==='owner'?'/auth/login':'/customer/auth/login',{method:'POST',body:{identifier:email,password}});
   const path=role==='owner'?'/auth/change-password':'/customer/auth/change-password';
   assert.equal((await call(env,path,{cookie:who.cookie,method:'POST',body:{currentPassword:'Incorrect123',newPassword:'Newpass123',confirmPassword:'Newpass123'}})).status,400);
   assert.equal((await call(env,path,{cookie:who.cookie,method:'POST',body:{currentPassword:password,newPassword:'Newpass123',confirmPassword:'Newpass123'}})).status,200);
   assert.equal((await call(env,'/sites/session',{cookie:who.cookie})).status,200);assert.equal((await call(env,'/sites/session',{cookie:another.cookie})).status,401);
  }
  const logout=await call(env,'/auth/logout',{cookie:m.cookie,method:'POST'});assert.equal(logout.status,200);assert.match(logout.setCookie,/Max-Age=0/);assert.equal((await call(env,'/sites/session',{cookie:m.cookie})).status,401);
 }finally{env.close();}
});
test('owner email changes update login without changing another gym’s account',async()=>{
 const env=setup();try{
  const o=await owner(env),b=await owner(env,'two');
  assert.equal((await call(env,'/auth/email',{cookie:o.cookie,method:'PATCH',body:{newEmail:b.email}})).status,400);
  assert.equal((await call(env,'/auth/me',{cookie:o.cookie})).data.user.email,o.email);
  assert.equal((await call(env,'/auth/email',{cookie:o.cookie,method:'PATCH',body:{newEmail:'Updated@Owner.Invalid'}})).status,200);
  assert.equal((await call(env,'/auth/login',{method:'POST',body:{identifier:o.email,password}})).status,401);
  assert.equal((await call(env,'/auth/login',{method:'POST',body:{identifier:'updated@owner.invalid',password}})).status,200);
 }finally{env.close();}
});
test('login throttling, oversized bodies and cross-origin mutations are rejected',async()=>{
 const env=setup();try{
  for(let i=0;i<10;i++)assert.equal((await call(env,'/auth/login',{method:'POST',body:{identifier:'missing@owner.invalid',password}})).status,401);
  assert.equal((await call(env,'/auth/login',{method:'POST',body:{identifier:'missing@owner.invalid',password}})).status,429);
  assert.equal((await call(env,'/auth/register',{method:'POST',body:registration(),headers:{Origin:'https://foreign.invalid'}})).status,403);
  const o=await owner(env);
  assert.equal((await call(env,'/customers',{method:'POST',cookie:o.cookie,body:{address:'A'.repeat(21000)}})).status,413);
  assert.equal((await call(env,'/customers',{method:'POST',cookie:o.cookie,body:{},headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.deepEqual((await call(env,'/customers',{cookie:o.cookie})).data.customers,[]);
 }finally{env.close();}
});
test('renewal extends membership without duplicate history; records with payments are preserved',async()=>{
 const env=setup();try{
  const o=await owner(env),m=await member(env,o),p=await planAndMembership(env,o,m);
  const r=await call(env,'/memberships/'+p.membership.id+'/renew',{cookie:o.cookie,method:'POST',body:{mode:'extend'}});assert.equal(r.status,200);assert.equal(r.data.membership.endDate,addDays(p.membership.endDate,30));
  assert.equal((await call(env,'/memberships',{cookie:o.cookie})).data.memberships.length,1);
  assert.equal((await call(env,'/payments',{cookie:o.cookie,method:'POST',body:{customerId:m.customer.id,membershipId:p.membership.id,amount:1500,paymentMethod:'CASH',status:'PAID'}})).status,200);
  for(const path of ['/plans/'+p.plan.id,'/memberships/'+p.membership.id,'/customers/'+m.customer.id])assert.equal((await call(env,path,{cookie:o.cookie,method:'DELETE'})).status,400);
 }finally{env.close();}
});
test('customer reports remain pending until owner confirmation; foreign membership and negative amounts fail',async()=>{
 const env=setup();try{
  const o=await owner(env),m=await member(env,o),b=await member(env,o,'two','9777777777'),p=await planAndMembership(env,o,m);
  const body={amount:1234,paymentMethod:'CASH',membershipId:p.membership.id};
  assert.equal((await call(env,'/customer/payments/report',{cookie:b.cookie,method:'POST',body})).status,403);
  assert.equal((await call(env,'/customer/payments/report',{cookie:m.cookie,method:'POST',body:{...body,amount:-1}})).status,400);
  const r=await call(env,'/customer/payments/report',{cookie:m.cookie,method:'POST',body});assert.equal(r.data.payment.status,'PENDING');
  assert.equal((await call(env,'/dashboard/stats',{cookie:o.cookie})).data.stats.totalPaymentAmount,0);
  assert.equal((await call(env,'/customer/payments',{cookie:b.cookie})).data.payments.length,0);
  assert.equal((await call(env,'/customer/payments',{cookie:m.cookie})).data.payments.length,1);
  assert.equal((await call(env,'/payments/'+r.data.payment.id,{cookie:o.cookie,method:'PUT',body:{status:'PAID'}})).status,200);
  assert.equal((await call(env,'/dashboard/stats',{cookie:o.cookie})).data.stats.totalPaymentAmount,1234);
 }finally{env.close();}
});
test('renewal reminders are idempotent and accessible only to their customer',async()=>{
 const env=setup();try{
  const o=await owner(env),a=await member(env,o),b=await member(env,o,'two','9777777777');await planAndMembership(env,o,a);
  for(let i=0;i<2;i++)assert.equal((await call(env,'/notifications/remind',{cookie:o.cookie,method:'POST',body:{customerId:a.customer.id}})).status,200);
  const ns=(await call(env,'/customer/notifications',{cookie:a.cookie})).data.notifications;assert.equal(ns.length,1);assert.equal((await call(env,'/customer/notifications',{cookie:b.cookie})).data.notifications.length,0);
  assert.equal((await call(env,'/customer/notifications/'+ns[0].id+'/read',{cookie:b.cookie,method:'PATCH'})).status,404);
  assert.equal((await call(env,'/customer/notifications/'+ns[0].id+'/read',{cookie:a.cookie,method:'PATCH'})).status,200);
 }finally{env.close();}
});
test('photos validate bytes and are restricted to the owning gym and correct customer',async()=>{
 const env=setup();try{
  const o=await owner(env),other=await owner(env,'other'),a=await member(env,o),b=await member(env,o,'two','9777777777');
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6x8AAAAASUVORK5CYII=','base64'),form=new FormData();form.append('photo',new File([bytes],'photo.png',{type:'image/png'}));
  const res=await handleAPI(new Request('https://workspace.test/api/customers/'+a.customer.id+'/photo',{method:'POST',headers:{Cookie:o.cookie},body:form}),env);assert.equal(res.status,200);const photo=(await res.json()).customer.photoUrl;
  for(const cookie of [o.cookie,a.cookie]){
   const r=await handleAPI(new Request('https://workspace.test'+photo,{headers:{Cookie:cookie}}),env);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,bytes.length);
  }
  for(const cookie of [other.cookie,b.cookie,'']){
   const r=await handleAPI(new Request('https://workspace.test'+photo,{headers:{Cookie:cookie}}),env);assert.equal(r.status,cookie?404:401);
  }
  const invalid=new FormData();invalid.append('photo',new File(['bad'],'bad.png',{type:'image/png'}));
  assert.equal((await handleAPI(new Request('https://workspace.test/api/customers/'+a.customer.id+'/photo',{method:'POST',headers:{Cookie:o.cookie},body:invalid}),env)).status,400);
 }finally{env.close();}
});
