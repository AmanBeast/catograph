import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing/landing-page";
import { OrgAutoActivator } from "@/components/org/org-auto-activator";
import { getDashboardAnalyses } from "@/lib/db/analyses";

export default async function HomePage() {
  const { userId, orgId, orgSlug } = await auth();

  // If signed out, render the marketing landing page
  if (!userId) {
    return <LandingPage isSignedIn={false} />;
  }

  const user = await currentUser();

  let activeOrgId = orgId;
  let activeOrgSlug = orgSlug;
  let activeOrgName: string | null = null;
  let targetAutoActivateId: string | null = null;

  if (userId) {
    const client = await clerkClient();

    if (orgId) {
      try {
        const org = await client.organizations.getOrganization({ organizationId: orgId });
        activeOrgName = org.name;
        activeOrgSlug = org.slug;
      } catch {
        activeOrgName = orgSlug || orgId;
      }
    } else {
      // Signed in without an active org on the session token
      const memberships = await client.users.getOrganizationMembershipList({ userId });
      if (memberships.data.length > 0) {
        const firstMembership = memberships.data[0];
        activeOrgId = firstMembership.organization.id;
        activeOrgName = firstMembership.organization.name;
        activeOrgSlug = firstMembership.organization.slug;
        targetAutoActivateId = firstMembership.organization.id;
      } else {
        // Brand new account: auto-create an organization so the user lands inside one immediately
        const teamName = user?.firstName
          ? `${user.firstName}'s Team`
          : user?.username
          ? `${user.username}'s Team`
          : "Workspace";

        try {
          const newOrg = await client.organizations.createOrganization({
            name: teamName,
            createdBy: userId,
          });
          activeOrgId = newOrg.id;
          activeOrgName = newOrg.name;
          activeOrgSlug = newOrg.slug;
          targetAutoActivateId = newOrg.id;
        } catch {
          const retryMemberships = await client.users.getOrganizationMembershipList({ userId });
          if (retryMemberships.data.length > 0) {
            const m = retryMemberships.data[0];
            activeOrgId = m.organization.id;
            activeOrgName = m.organization.name;
            activeOrgSlug = m.organization.slug;
            targetAutoActivateId = m.organization.id;
          }
        }
      }
    }
  }

  // Read analyses visible to the current organization via Supabase RLS.
  // The query does NOT filter by organization in application code.
  const analyses = await getDashboardAnalyses();

  return (
    <>
      {targetAutoActivateId && <OrgAutoActivator targetOrgId={targetAutoActivateId} />}
      <AppShell
        serverOrgId={activeOrgId ?? null}
        serverOrgName={activeOrgName}
        serverOrgSlug={activeOrgSlug ?? null}
        userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
        analyses={analyses}
      />
    </>
  );
}
