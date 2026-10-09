import { getStore, seed, statusFor, today, addDays } from './store.mjs';
const json = (data, status=200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
const ok = (data={}) => json({ success: true, ...data });
class ApiError extends Error { constructor(message, status=400) { super(message); this.status=status; } }
const requireValue = (value, message) => { if (!value) throw new ApiError(message); return value; };
const fields = (data, allowed) => Object.fromEntries(allowed.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
const dateInput = (value, fallback=today()) => { const v=value || fallback; if (typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10)) throw new ApiError('Enter a valid date.'); return v.slice(0,10); };
const textInput = (value, max=200) => { if (typeof value !== 'string' || value.length > max) throw new ApiError('Enter a valid value.'); return value.trim(); };
const methods = ['CASH','UPI','BANK_TRANSFER','OTHER','OFFLINE'];
const paymentStatuses = ['PAID','PENDING','FAILED'];
const amountInput = (amount) => { const n=Number(amount); if (!Number.isFinite(n) || n<=0 || n>10000000) throw new ApiError('Enter a payment amount greater than zero.'); return Math.round(n*100)/100; };
function validateCustomer(body) { const name=textInput(body.name,100); requireValue(name,'Name is required.'); const phone=textInput(body.phone,20); if (!/^[6-9]\d{9}$/.test(phone)) throw new ApiError('Enter a valid 10-digit mobile number.'); const email=textInput(body.email||'',200); if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Enter a valid email.'); return { name, phone, email, address:textInput(body.address||'',500) }; }
function validatePlan(body) { const name=textInput(body.name,100); requireValue(name,'Plan name is required.'); const durationValue=Number(body.durationValue); if(!Number.isInteger(durationValue)||durationValue<1||durationValue>1000) throw new ApiError('Enter a valid duration.'); if(!['Days','Months','Years'].includes(body.durationUnit)) throw new ApiError('Invalid duration unit.'); const price=Number(body.price); if(!Number.isFinite(price)||price<0||price>10000000)throw new ApiError('Enter a valid price.'); return {name,durationValue,durationUnit:body.durationUnit,durationDays:durationValue*(body.durationUnit==='Months'?30:body.durationUnit==='Years'?365:1),price,description:textInput(body.description||'',500)}; }
async function mustGet(store,id,kind) { const data=await store.get(id,kind); if(!data)throw new ApiError(`${kind[0].toUpperCase()+kind.slice(1)} not found.`,404);return data; }
async function context(store) {
  const [customers,plans,memberships,payments]=await Promise.all(['customer','plan','membership','payment'].map(k=>store.list(k)));
  const enrichedMemberships=memberships.map(m=>({...m,...statusFor(m),customerName:customers.find(c=>c.id===m.customerId)?.name,customerPhone:customers.find(c=>c.id===m.customerId)?.phone,planName:plans.find(p=>p.id===m.planId)?.name,planPrice:plans.find(p=>p.id===m.planId)?.price}));
  const latest=id=>enrichedMemberships.filter(m=>m.customerId===id&&!m.cancelled).sort((a,b)=>b.endDate.localeCompare(a.endDate))[0];
  return { plans:plans.map(p=>({...p,customerCount:memberships.filter(m=>m.planId===p.id).length})), memberships:enrichedMemberships, customers:customers.map(c=>{const m=latest(c.id);return {...c,currentPlan:m?.planName||null,membershipStatus:m?.status||'NO_MEMBERSHIP',expiryDate:m?.endDate||null};}), payments:payments.map(p=>({...p,customerName:customers.find(c=>c.id===p.customerId)?.name,membershipPlanName:enrichedMemberships.find(m=>m.id===p.membershipId)?.planName||null})), latest };
}
function gymInfo(owner) {return { name:owner.gymName,phone:owner.phone,address:owner.address,logoUrl:owner.photoUrl,upiId:owner.upiId,qrCodeUrl:owner.qrCodeUrl,paymentPhone:owner.paymentPhone,bankCandidateName:owner.bankCandidateName,upiQrPayload:owner.upiId?`upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=${encodeURIComponent(owner.gymName)}&cu=INR`:null };}
function userFor(owner,customer) { return customer ? {...customer,role:'customer',gymName:owner.gymName,gymLogoUrl:owner.photoUrl} : {...owner,role:'owner'}; }
export async function handleAPI(request,env) {
  try {
    const url=new URL(request.url), path=url.pathname.replace(/^\/api/,'').replace(/\/$/,'')||'/';
    // Preview selection is a product view, not an external customer sign-in.
    // Production additionally requires the Site owner's dispatch-authenticated identity.
    const identity=request.headers.get('oai-authenticated-user-id');
    if(!identity&&!env.__LOCAL_PREVIEW)throw new ApiError('Sign in to this private workspace.',401);
    const store=getStore(env.DB);
    await seed(store);
    let owner=await mustGet(store,'owner','owner');
    if(identity && owner.platformUserId && owner.platformUserId!==identity)throw new ApiError('This workspace is private to its owner.',403);
    if(identity&&!owner.platformUserId){owner={...owner,platformUserId:identity};await store.put('owner',owner);}
    const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    const previewId=token.startsWith('sites-preview:')?token.slice(14):null;
    const preview=previewId?await mustGet(store,previewId,'customer'):null;
    const role=preview?'customer':'owner';
    if(request.method!=='GET'&&request.method!=='HEAD'){
      const origin=request.headers.get('Origin');
      if((origin&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new ApiError('This action must start in your workspace.',403);
    }
    const method=request.method;
    const isUpload=path.endsWith('/photo')||path.endsWith('/logo')||path.endsWith('/qr-code');
    let body={};
    if(!['GET','HEAD','DELETE'].includes(method)&&!isUpload){const raw=await request.text();if(raw.length>20000)throw new ApiError('The request is too large.',413);if(raw){try{body=JSON.parse(raw);}catch{throw new ApiError('Invalid request.');}}}
    if(path==='/sites/session'&&method==='GET')return ok({user:userFor(owner,preview),token:preview?`sites-preview:${preview.id}`:'sites-owner'});
    if(path==='/sites/preview'&&method==='POST'){const c=body.customerId?await mustGet(store,body.customerId,'customer'):null;return ok({user:userFor(owner,c),token:c?`sites-preview:${c.id}`:'sites-owner'});}
    if(path.startsWith('/uploads/')&&method==='GET'){const key=path.slice(9);if(!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(key))throw new ApiError('Image not found.',404);const file=await env.BUCKET?.get(key);if(!file)throw new ApiError('Image not found.',404);return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
    if(path.startsWith('/customer/')) {
      if(!preview)throw new ApiError('Choose a customer preview first.',403);
      const data=await context(store), current=data.latest(preview.id)||null, memberPayments=data.payments.filter(p=>p.customerId===preview.id).sort((a,b)=>b.paymentDate.localeCompare(a.paymentDate));
      if(path==='/customer/auth/me')return ok({user:userFor(owner,preview)});
      if(path==='/customer/profile'&&method==='GET')return ok({profile:preview});
      if(path==='/customer/profile'&&method==='PATCH'){const name=textInput(body.name,100);requireValue(name,'Name is required.');const c=await store.put('customer',{...preview,name,address:textInput(body.address||'',500)});return ok({profile:c});}
      if(path==='/customer/profile/photo'&&method==='POST'){const uploaded=await upload(request,env,'photo');const c=await store.put('customer',{...preview,photoUrl:uploaded});return ok({profile:c});}
      if(path==='/customer/dashboard')return ok({dashboard:{customer:preview,membership:current,latestPayment:memberPayments[0]||null,gym:gymInfo(owner)}});
      if(path==='/customer/membership')return ok({membership:current});
      if(path==='/customer/membership/history')return ok({memberships:data.memberships.filter(m=>m.customerId===preview.id)});
      if(path==='/customer/gym-payment')return ok({gym:gymInfo(owner)});
      if(path==='/customer/payments'&&method==='GET')return ok({payments:memberPayments});
      if(path==='/customer/payments/report'&&method==='POST'){
        if(body.membershipId){const m=await mustGet(store,body.membershipId,'membership');if(m.customerId!==preview.id)throw new ApiError('Membership does not belong to this customer.',403);}
        if(!methods.includes(body.paymentMethod))throw new ApiError('Invalid payment method.');
        const p={id:crypto.randomUUID(),customerId:preview.id,membershipId:body.membershipId||current?.id||null,amount:amountInput(body.amount),paymentDate:today(),paymentMethod:body.paymentMethod,status:'PENDING',notes:textInput(body.notes||'',1000),createdAt:new Date().toISOString()};
        const n={id:crypto.randomUUID(),audience:'owner',customerId:preview.id,title:'Payment reported',message:`${preview.name} reported a ${p.paymentMethod} payment of ₹${p.amount}. Confirm it after checking the payment.`,isRead:false,type:'PAYMENT',createdAt:p.createdAt};
        await store.batch([['payment',p],['notification',n]]);return ok({payment:p});
      }
      if(path==='/customer/notifications'&&method==='GET'){const ns=(await store.list('notification')).filter(n=>n.audience==='customer'&&n.customerId===preview.id);return ok({notifications:ns,unreadCount:ns.filter(n=>!n.isRead).length});}
      const read=path.match(/^\/customer\/notifications\/([^/]+)\/read$/);
      if(read&&method==='PATCH'){const n=await mustGet(store,read[1],'notification');if(n.customerId!==preview.id||n.audience!=='customer')throw new ApiError('Notification not found.',404);await store.put('notification',{...n,isRead:true});return ok();}
      throw new ApiError('This action is unavailable in customer preview.',404);
    }
    if(role!=='owner')throw new ApiError('Return to the owner view for this action.',403);
    if(path==='/auth/me')return ok({user:owner});
    if(path==='/auth/profile'&&method==='PATCH'){const allowed=fields(body,['name','address','gymName','upiId','bankCandidateName','paymentPhone']);for(const [key,v] of Object.entries(allowed))allowed[key]=textInput(v,500);if(allowed.upiId&&!/^[\w.-]+@[\w.-]+$/.test(allowed.upiId))throw new ApiError('Enter a valid UPI ID.');owner={...owner,...allowed};await store.put('owner',owner);return ok({user:owner});}
    if(['/auth/phone','/auth/email'].includes(path)&&method==='PATCH'){const key=path.endsWith('phone')?'phone':'email',value=body[key]||body.newEmail;if(key==='phone'&&!/^[6-9]\d{9}$/.test(value))throw new ApiError('Enter a valid mobile number.');if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new ApiError('Enter a valid email.');owner={...owner,[key]:value};await store.put('owner',owner);return ok({user:owner});}
    if(['/auth/profile/logo','/auth/profile/qr-code'].includes(path)&&method==='POST'){const isQr=path.endsWith('qr-code'),key=isQr?'qrCodeUrl':'photoUrl';const uploaded=await upload(request,env,isQr?'qrCode':'logo');owner={...owner,[key]:uploaded};await store.put('owner',owner);return ok({[key]:uploaded,user:owner});}
    const data=await context(store);
    if(path==='/dashboard/stats'){return ok({stats:{totalCustomers:data.customers.length,activeMemberships:data.customers.filter(c=>['ACTIVE','EXPIRING_SOON'].includes(c.membershipStatus)).length,expiringWithin7Days:data.memberships.filter(m=>m.status==='EXPIRING_SOON').length,expiredMemberships:data.memberships.filter(m=>m.status==='EXPIRED').length,activePlans:data.plans.filter(p=>p.isActive).length,totalPayments:data.payments.length,totalPaymentAmount:data.payments.filter(p=>p.status==='PAID').reduce((s,p)=>s+p.amount,0),pendingVerifications:data.payments.filter(p=>p.status==='PENDING').length}});}
    if(path==='/dashboard/expiring-memberships')return ok({memberships:data.memberships.filter(m=>m.status==='EXPIRING_SOON').map(m=>({...m,phone:m.customerPhone,expiryDate:m.endDate}))});
    if(path==='/dashboard/recent-payments')return ok({payments:data.payments.slice(0,10)});
    if(path==='/customers'&&method==='GET'){let cs=data.customers;const q=(url.searchParams.get('search')||'').toLowerCase(),filter=url.searchParams.get('filter');if(q)cs=cs.filter(c=>[c.name,c.phone,c.email].some(v=>v?.toLowerCase().includes(q)));if(filter)cs=cs.filter(c=>filter==='ACTIVE_ACCOUNT'?c.accountStatus==='ACTIVE':filter==='INACTIVE_ACCOUNT'?c.accountStatus==='INACTIVE':filter==='NO_ACTIVE_MEMBERSHIP'?!['ACTIVE','EXPIRING_SOON'].includes(c.membershipStatus):c.membershipStatus===filter);return ok({customers:cs});}
    if(path==='/customers'&&method==='POST'){const values=validateCustomer(body);if(data.customers.some(c=>c.phone===values.phone))throw new ApiError('Phone number already exists.');const c={id:crypto.randomUUID(),...values,accountStatus:'ACTIVE',photoUrl:'',createdAt:new Date().toISOString()};await store.put('customer',c);return ok({customer:c});}
    const cpath=path.match(/^\/customers\/([^/]+)(?:\/(status|photo))?$/);
    if(cpath){const c=await mustGet(store,cpath[1],'customer');if(cpath[2]==='photo'&&method==='POST'){const photoUrl=await upload(request,env,'photo');const saved=await store.put('customer',{...c,photoUrl});return ok({customer:saved});}if(cpath[2]==='status'&&method==='PATCH'){if(!['ACTIVE','INACTIVE'].includes(body.accountStatus))throw new ApiError('Invalid account status.');return ok({customer:await store.put('customer',{...c,accountStatus:body.accountStatus})});}if(method==='GET')return ok({customer:data.customers.find(v=>v.id===c.id),memberships:data.memberships.filter(m=>m.customerId===c.id),payments:data.payments.filter(p=>p.customerId===c.id)});if(method==='PUT'){const values=validateCustomer({...c,...body});if(data.customers.some(v=>v.id!==c.id&&v.phone===values.phone))throw new ApiError('Phone number already exists.');return ok({customer:await store.put('customer',{...c,...values})});}if(method==='DELETE'){if(data.memberships.some(m=>m.customerId===c.id)||data.payments.some(p=>p.customerId===c.id))throw new ApiError('Deactivate this member to preserve their membership and payment history.');await store.remove(c.id,'customer');return ok();}}
    if(path==='/plans'&&method==='GET')return ok({plans:data.plans});
    if(path==='/plans'&&method==='POST'){const p={id:crypto.randomUUID(),...validatePlan(body),isActive:true,createdAt:new Date().toISOString()};await store.put('plan',p);return ok({plan:p});}
    const ppath=path.match(/^\/plans\/([^/]+)(?:\/(status))?$/);
    if(ppath){const p=await mustGet(store,ppath[1],'plan');if(ppath[2]==='status'&&method==='PATCH'){if(typeof body.isActive!=='boolean')throw new ApiError('Invalid plan status.');return ok({plan:await store.put('plan',{...p,isActive:body.isActive})});}if(method==='PUT')return ok({plan:await store.put('plan',{...p,...validatePlan({...p,...body})})});if(method==='DELETE'){if(data.memberships.some(m=>m.planId===p.id))throw new ApiError('Pause this plan to preserve membership history.');await store.remove(p.id,'plan');return ok();}}
    if(path==='/memberships'&&method==='GET'){const status=url.searchParams.get('status');return ok({memberships:data.memberships.filter(m=>!status||m.status===status)});}
    if(path==='/memberships'&&method==='POST'){const c=await mustGet(store,body.customerId,'customer'),p=await mustGet(store,body.planId,'plan');if(c.accountStatus!=='ACTIVE')throw new ApiError('Activate the member before assigning a plan.');if(!p.isActive)throw new ApiError('This plan is paused.');const startDate=dateInput(body.startDate),m={id:crypto.randomUUID(),customerId:c.id,planId:p.id,startDate,endDate:addDays(startDate,p.durationDays),createdAt:new Date().toISOString()};await store.put('membership',m);return ok({membership:{...m,...statusFor(m)}});}
    const mpath=path.match(/^\/memberships\/([^/]+)(?:\/(renew))?$/);
    if(mpath){const m=await mustGet(store,mpath[1],'membership');if(mpath[2]==='renew'&&method==='POST'){const p=await mustGet(store,body.planId||m.planId,'plan');if(!p.isActive)throw new ApiError('This plan is paused.');const start=m.endDate>today()?m.endDate:today(),renewed={...m,id:body.mode==='create_new'?crypto.randomUUID():m.id,planId:p.id,startDate:body.mode==='create_new'?start:(m.endDate<today()?today():m.startDate),endDate:addDays(start,p.durationDays),cancelled:false};await store.put('membership',renewed);return ok({membership:{...renewed,...statusFor(renewed)}});}if(method==='PUT'){const p=await mustGet(store,body.planId||m.planId,'plan'),startDate=dateInput(body.startDate,m.startDate);const saved={...m,planId:p.id,startDate,endDate:body.planId||body.startDate?addDays(startDate,p.durationDays):m.endDate};await store.put('membership',saved);return ok({membership:{...saved,...statusFor(saved)}});}if(method==='DELETE'){if(data.payments.some(p=>p.membershipId===m.id))throw new ApiError('This membership has linked payment history.');await store.remove(m.id,'membership');return ok();}}
    if(path==='/payments'&&method==='GET')return ok({payments:data.payments});
    const paypath=path.match(/^\/payments\/([^/]+)$/);
    if(path==='/payments'&&method==='POST'||paypath&&method==='PUT'){const existing=paypath?await mustGet(store,paypath[1],'payment'):null,merged={...existing,...body};const c=await mustGet(store,existing?.customerId||body.customerId,'customer');if(!methods.includes(merged.paymentMethod)||!paymentStatuses.includes(merged.status))throw new ApiError('Invalid payment method or status.');if(merged.membershipId){const m=await mustGet(store,merged.membershipId,'membership');if(m.customerId!==c.id)throw new ApiError('Membership must belong to this customer.');}const p={id:existing?.id||crypto.randomUUID(),customerId:c.id,membershipId:merged.membershipId||null,amount:amountInput(merged.amount),paymentDate:dateInput(merged.paymentDate),paymentMethod:merged.paymentMethod,status:merged.status,notes:textInput(merged.notes||'',1000),createdAt:existing?.createdAt||new Date().toISOString()};await store.put('payment',p);return ok({payment:p});}
    if(paypath&&method==='GET')return ok({payment:await mustGet(store,paypath[1],'payment')});
    if(path==='/notifications'&&method==='GET'){const ns=(await store.list('notification')).filter(n=>n.audience==='owner');return ok({notifications:ns,unreadCount:ns.filter(n=>!n.isRead).length});}
    if(path==='/notifications/remind'&&method==='POST'){const c=await mustGet(store,body.customerId,'customer'),m=data.latest(c.id);requireValue(m,'No membership found.');const id=`reminder-${m.id}-${m.endDate}-${today()}`;const n={id,audience:'customer',customerId:c.id,title:'Your next chapter starts soon',message:`Your ${m.planName} membership ends on ${m.endDate}. Please contact ${owner.gymName} to renew.`,isRead:false,type:'CUSTOMER_RENEWAL',createdAt:new Date().toISOString()};await store.batch([['notification',n]],true);return ok({notification:n});}
    const npath=path.match(/^\/notifications\/([^/]+)\/read$/);
    if(npath&&method==='PATCH'){const n=await mustGet(store,npath[1],'notification');if(n.audience!=='owner')throw new ApiError('Notification not found.',404);await store.put('notification',{...n,isRead:true});return ok();}
    if(path==='/health')return ok({status:'ok'});
    throw new ApiError('This action is unavailable in the private workspace.',404);
  } catch(error) { if(error.message?.includes('UNIQUE constraint failed'))error=new ApiError('This phone number already belongs to a member.'); if(!(error instanceof ApiError))console.error('Workspace request failed:',error.message);return json({success:false,message:error instanceof ApiError?error.message:'Unable to save or load workspace data. Please try again.'},error instanceof ApiError?error.status:503); }
}
async function upload(request,env,field) {
  if(!env.BUCKET)throw new ApiError('Photo storage is temporarily unavailable.',503);
  if(Number(request.headers.get('Content-Length')||0)>6*1024*1024)throw new ApiError('Choose an image under 5 MB.',413);
  const file=(await request.formData()).get(field);
  if(!file||typeof file.arrayBuffer!=='function'||file.size>5*1024*1024||file.size===0)throw new ApiError('Choose an image under 5 MB.');
  const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const ext=extensions[file.type];if(!ext)throw new ApiError('Choose a JPG, PNG or WebP image.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const valid=ext==='jpg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:ext==='png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!valid)throw new ApiError('The image file could not be verified.');
  const key=`${crypto.randomUUID()}.${ext}`;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:file.type}});return `/api/uploads/${key}`;
}
export default { async fetch(request,env) {
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/'))return handleAPI(request,env);
  const asset=await env.ASSETS.fetch(request);
  if(asset.status===404 && !path.split('/').pop().includes('.'))return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
  return asset;
} };
