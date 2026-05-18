const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log("Fetching orgs...");
  const { data: orgs, error } = await supabase.from('organizations').select('*').limit(1);
  if (error) {
    console.error("Fetch orgs error:", error);
    return;
  }
  if (!orgs || orgs.length === 0) {
    console.log("No orgs found.");
    return;
  }
  
  const org = orgs[0];
  console.log("Found Org:", org);

  console.log("Fetching members...");
  const { data: members, error: memError } = await supabase.from('organization_members').select('*').eq('org_id', org.id);
  
  if (memError) {
    console.error("Fetch members error:", memError);
    return;
  }
  console.log("Members:", members);

  if (members.length > 0) {
    const admin = members.find(m => m.role === 'admin') || members[0];
    console.log("Admin ID:", admin.user_id);

    console.log(`Sending DELETE to http://127.0.0.1:8080/api/orgs/${org.id}`);
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/orgs/${org.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: admin.user_id })
      });
      const data = await res.json();
      console.log("Response status:", res.status);
      console.log("Response body:", data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }
}

test();
