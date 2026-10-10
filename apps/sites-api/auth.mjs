import bcrypt from 'bcryptjs';
export class ApiError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function emailInput(v){if(typeof v!=='string'||v.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))throw new ApiError('Enter a valid email address.');return v.trim().toLowerCase();}
export function passwordInput(v){if(typeof v!=='string'||v.length<8||bcrypt.truncates(v)||!/[A-Za-z]/.test(v)||!/\d/.test(v))throw new ApiError('Use 8 or more characters with letters and numbers (maximum 72 bytes).');return v;}
export const hashPassword=v=>bcrypt.hash(passwordInput(v),10);
export const accountStatement=(DB,a)=>DB.prepare('INSERT INTO gym_login_accounts (id,owner_id,customer_id,role,email,password_hash,created_at) VALUES (?,?,?,?,?,?,?)').bind(a.id,a.owner_id,a.customer_id||null,a.role,a.email,a.password_hash,a.created_at||new Date().toISOString());
export const accountForMember=(DB,ownerId,id)=>DB.prepare("SELECT * FROM gym_login_accounts WHERE owner_id=? AND customer_id=? AND role='customer'").bind(ownerId,id).first();
export const accountForEmail=(DB,role,email)=>DB.prepare('SELECT * FROM gym_login_accounts WHERE role=? AND email=?').bind(role,email).first();
export async function digest(v){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),n=>n.toString(16).padStart(2,'0')).join('');}
const cookieName=env=>env.__LOCAL_PREVIEW?'fitbro_preview_session':'__Host-fitbro_session';
const cookieValue=(request,env)=>(request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(env)+'='))?.slice(cookieName(env).length+1)||'';
export async function sessionFor(request,env){
  const token=cookieValue(request,env);if(!/^[a-f0-9]{64}$/.test(token))throw new ApiError('Please log in to continue.',401);
  const a=await env.DB.prepare('SELECT a.*,s.token_hash FROM gym_login_sessions s JOIN gym_login_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first();
  if(!a)throw new ApiError('Your session has expired. Please log in again.',401);return a;
}
export async function issueSession(env,id){
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  await env.DB.batch([env.DB.prepare('DELETE FROM gym_login_sessions WHERE expires_at<?').bind(Date.now()),env.DB.prepare('INSERT INTO gym_login_sessions (token_hash,account_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,Date.now()+86400000)]);
  return cookieName(env)+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400'+(env.__LOCAL_PREVIEW?'':'; Secure');
}
export async function endSession(request,env){
  const token=cookieValue(request,env);if(token)await env.DB.prepare('DELETE FROM gym_login_sessions WHERE token_hash=?').bind(await digest(token)).run();
  return cookieName(env)+'=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(env.__LOCAL_PREVIEW?'':'; Secure');
}
export async function throttle(DB,key,max,windowMs){
  const k=await digest(key),now=Date.now();
  await DB.prepare('INSERT INTO gym_auth_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').bind(k,now+windowMs,now,now).run();
  const row=await DB.prepare('SELECT attempts FROM gym_auth_limits WHERE key=?').bind(k).first();if(row.attempts>max)throw new ApiError('Too many attempts. Please try again later.',429);
}
export async function loginAccount(request,env,role,body){
  const email=emailInput(body.identifier||body.email),ip=request.headers.get('CF-Connecting-IP')||'unknown';
  await throttle(env.DB,'login:'+role+':'+ip+':'+email,10,900000);await throttle(env.DB,'login-ip:'+ip,100,900000);
  if(typeof body.password!=='string'||new TextEncoder().encode(body.password).length>72)throw new ApiError('Email or password is incorrect.',401);
  const account=await accountForEmail(env.DB,role,email);
  const dummy='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const valid=await bcrypt.compare(body.password,account?.password_hash||dummy);
  if(!account||!valid)throw new ApiError('Email or password is incorrect.',401);return account;
}
export async function changeOwnPassword(env,a,body){
  if(typeof body.currentPassword!=='string'||bcrypt.truncates(body.currentPassword)||!await bcrypt.compare(body.currentPassword,a.password_hash))throw new ApiError('Current password is incorrect.');
  if(body.newPassword!==body.confirmPassword)throw new ApiError('Passwords do not match.');
  const h=await hashPassword(body.newPassword);
  await env.DB.batch([env.DB.prepare('UPDATE gym_login_accounts SET password_hash=? WHERE id=?').bind(h,a.id),env.DB.prepare('DELETE FROM gym_login_sessions WHERE account_id=? AND token_hash<>?').bind(a.id,a.token_hash)]);
}
export async function readJSON(request){
  if(Number(request.headers.get('Content-Length')||0)>20000)throw new ApiError('The request is too large.',413);
  if(!request.body)return {};const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();throw new ApiError('The request is too large.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{const body=JSON.parse(new TextDecoder().decode(bytes)||'{}');if(!body||Array.isArray(body)||typeof body!=='object')throw new Error();return body;}catch{throw new ApiError('Invalid request.');}
}
