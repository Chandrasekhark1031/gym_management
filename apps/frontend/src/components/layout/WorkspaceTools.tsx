import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gymService } from '../../services/gymService';
import { useAuthStore } from '../../store/useAuthStore';
export default function WorkspaceTools() {
  const navigate=useNavigate(),role=useAuthStore(s=>s.user?.role);
  useEffect(()=>{
    const context=(document as any).modelContext;if(!context?.registerTool||role!=='owner')return;
    const lifecycle=new AbortController();
    const register=(tool:any)=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
    register({name:'search_gym_members',title:'Search gym members',description:'Read member names, plans and expiry status in this gym workspace.',inputSchema:{type:'object',properties:{search:{type:'string',maxLength:100}},required:['search'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},async execute(input:any){if(!input||typeof input.search!=='string'||input.search.length>100||Object.keys(input).some(k=>k!=='search'))throw new Error('Provide a search string under 100 characters.');const response=await gymService.customers.list({search:input.search});return {members:response.customers.slice(0,20).map((c:any)=>({id:c.id,name:c.name,plan:c.currentPlan,status:c.membershipStatus,expires:c.expiryDate}))};}});
    register({name:'open_gym_member_registration',title:'Open member registration',description:'Navigate to the member directory and open its registration form. This does not create a member.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input:any){if(!input||Object.keys(input).length)throw new Error('No parameters are accepted.');navigate('/customers?add=1');return {form:'member-registration',opened:true};}});
    return()=>lifecycle.abort();
  },[role,navigate]);
  return null;
}
