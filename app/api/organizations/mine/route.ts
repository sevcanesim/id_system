import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { getOrganizationCapacityTerms } from "../../../../lib/organizations/capacity-terms";
export async function GET(request:NextRequest){
 const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return NextResponse.json({error:"Oturum gerekli."},{status:401});
 const auth=getSupabaseAuthClient();const {data:authData}=await auth.auth.getUser(token);if(!authData.user)return NextResponse.json({error:"Oturum doğrulanamadı."},{status:401});
 const management=request.nextUrl.searchParams.get("management")==="true";
 const admin=getSupabaseAdminClient();let query=admin.from("organization_members").select("organization_id,role,status,department,organizations(id,name,slug,status,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name)").eq("user_id",authData.user.id).eq("status","ACTIVE");
 if(management)query=query.in("role",["OWNER","ADMIN","HR","DEPARTMENT_MANAGER"]);
 const {data:rows,error}=await query;
 if(error)return NextResponse.json({error:"Şirket erişimi doğrulanamadı."},{status:500});
 if(management&&!rows?.length)return NextResponse.json({error:"Bu hesapta aktif şirket yönetim yetkisi bulunmuyor."},{status:403});
 const organizationIds=(rows||[]).map((row)=>row.organization_id);
 const subscriptions=organizationIds.length?await admin.from("organization_subscriptions").select("organization_id,seat_limit,status,expires_at,business_plans(name,code)").in("organization_id",organizationIds).in("status",["ACTIVE","GRACE_PERIOD"]):{data:[],error:null};
 if(subscriptions.error)return NextResponse.json({error:"Şirket aboneliği yüklenemedi."},{status:500});
 const capacityTerms=await getOrganizationCapacityTerms(admin,organizationIds);
 return NextResponse.json({organizations:(rows||[]).map((row)=>({...row,organization_subscriptions:(subscriptions.data||[]).filter((subscription)=>subscription.organization_id===row.organization_id),organization_capacity_terms:capacityTerms.error?[]:(capacityTerms.data||[]).filter((term)=>term.organization_id===row.organization_id)}))});
}
