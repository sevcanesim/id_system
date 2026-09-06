import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { getOrganizationCapacityTerms } from "../../../../lib/organizations/capacity-terms";
import { canManageOrganizationLegalProfile, isOrganizationRole } from "../../../../lib/organizations/permissions";
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
 // Legal and billing identifiers are removed before this response reaches the
 // browser. Only the Company Owner may receive the values for a binding record.
 return NextResponse.json({organizations:(rows||[]).map((row)=>{
  const sourceOrganization=row.organizations as unknown as Record<string,unknown>|null;
  const {corporate_id:corporateId,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,legal_address,city,district,country,...organizationWithoutSensitiveFields}=sourceOrganization||{};
  const canViewBillingProfile=isOrganizationRole(row.role)&&canManageOrganizationLegalProfile(row.role,row.status);
  const organization=sourceOrganization
    ? canViewBillingProfile
      ? {...organizationWithoutSensitiveFields,corporate_id:corporateId,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,legal_address,city,district,country}
      : organizationWithoutSensitiveFields
    : null;
  return {...row,organizations:organization,organization_subscriptions:(subscriptions.data||[]).filter((subscription)=>subscription.organization_id===row.organization_id),organization_capacity_terms:capacityTerms.error?[]:(capacityTerms.data||[]).filter((term)=>term.organization_id===row.organization_id)};
 })});
}
