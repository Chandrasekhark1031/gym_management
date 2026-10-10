// Every record query is scoped to the authenticated account's gym.
export const getStore = (DB, ownerId) => {
  if (!DB || !ownerId) throw new Error('Workspace storage is unavailable.');
  return {
    async get(id,kind){const row=await DB.prepare('SELECT payload FROM gym_workspace_records WHERE owner_id=? AND id=? AND kind=?').bind(ownerId,id,kind).first();return row?JSON.parse(row.payload):null;},
    async list(kind){const result=await DB.prepare('SELECT payload FROM gym_workspace_records WHERE owner_id=? AND kind=? ORDER BY created_at DESC').bind(ownerId,kind).all();return result.results.map(r=>JSON.parse(r.payload));},
    putStatement(kind,data,ignore=false){return DB.prepare(ignore?'INSERT OR IGNORE INTO gym_workspace_records (owner_id,id,kind,payload,customer_phone,created_at) VALUES (?,?,?,?,?,?)':'INSERT INTO gym_workspace_records (owner_id,id,kind,payload,customer_phone,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET payload=excluded.payload,customer_phone=excluded.customer_phone').bind(ownerId,data.id,kind,JSON.stringify(data),kind==='customer'?data.phone:null,data.createdAt||new Date().toISOString());},
    async put(kind,data){await this.putStatement(kind,data).run();return data;},
    async batch(items,ignore=false){await DB.batch(items.map(([kind,data])=>this.putStatement(kind,data,ignore)));},
    async remove(id,kind){await DB.prepare('DELETE FROM gym_workspace_records WHERE owner_id=? AND id=? AND kind=?').bind(ownerId,id,kind).run();},
  };
};
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export const addDays=(date,amount)=>new Date(Date.parse(date.slice(0,10)+'T00:00:00Z')+amount*86400000).toISOString().slice(0,10);
export function statusFor(m){
  const daysRemaining=Math.round((Date.parse(m.endDate.slice(0,10)+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000);
  if(m.cancelled)return {status:'CANCELLED',daysRemaining};
  if(m.startDate.slice(0,10)>today())return {status:'UPCOMING',daysRemaining};
  return {status:daysRemaining<0?'EXPIRED':daysRemaining<=7?'EXPIRING_SOON':'ACTIVE',daysRemaining};
}
