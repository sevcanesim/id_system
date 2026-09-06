import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { getOrganizationCapacityTerms } from "../../../../lib/organizations/capacity-terms";
export async function GET(request:NextRequest){
 const identity=await resolveRequestIdentity(request);if(!identity)return NextResponse.json({error:"Oturum doğrulanamadı."},{status:401});
 const management=request.nextUrl.searchParams.get("management")==="true";
 const admin=getSupabaseAdminClient();let query=admin.from("organization_members").select("organization_id,role,status,department,organizations(id,name,slug,status,corporate_id,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,legal_address,city,district,country)").eq("user_id",identity.user.id).eq("status","ACTIVE");
 if(management)query=query.in("role",["OWNER","ADMIN","HR"]);
 const {data:rows,error}=await query;
 if(error)return NextResponse.json({error:"Şirket erişimi doğrulanamadı."},{status:500});
 if(management&&!rows?.length)return NextResponse.json({error:"Bu hesapta aktif şirket yönetim yetkisi bulunmuyor."},{status:403});
 const organizationIds=(rows||[]).map((row)=>row.organization_id);
 const subscriptions=organizationIds.length?await admin.from("organization_subscriptions").select("organization_id,seat_limit,status,expires_at,business_plans(name,code)").in("organization_id",organizationIds).in("status",["ACTIVE","GRACE_PERIOD"]):{data:[],error:null};
 if(subscriptions.error)return NextResponse.json({error:"Şirket aboneliği yüklenemedi."},{status:500});
 const capacityTerms=await getOrganizationCapacityTerms(admin,organizationIds);
 // Corporate IDs are not merely hidden in the UI: only the Company Owner and
 // HR can receive them from this server endpoint. Admins and employees never
 // get the value in their browser response.
 return NextResponse.json({organizations:(rows||[]).map((row)=>{
  const sourceOrganization=row.organizations as unknown as Record<string,unknown>|null;
  const {corporate_id:corporateId,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,legal_address,city,district,country,...organizationWithoutSensitiveFields}=sourceOrganization||{};
  const canViewBillingProfile=row.role==="OWNER"||row.role==="HR";
  const organization=sourceOrganization
    ? canViewBillingProfile
      ? {...organizationWithoutSensitiveFields,corporate_id:corporateId,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,legal_address,city,district,country}
      : organizationWithoutSensitiveFields
    : null;
  return {...row,organizations:organization,organization_subscriptions:(subscriptions.data||[]).filter((subscription)=>subscription.organization_id===row.organization_id),organization_capacity_terms:capacityTerms.error?[]:(capacityTerms.data||[]).filter((term)=>term.organization_id===row.organization_id)};
 })});
}
