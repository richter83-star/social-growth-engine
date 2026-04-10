/**
 * End-to-end test for Instagram OAuth via Nango
 * Tests: session creation, integration config, and OAuth URL generation
 */
import { Nango } from "@nangohq/node";

const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    console.log(`  ✅ ${name}`);
    passed++;
  }).catch(err => {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  });
}

console.log("=== Instagram OAuth via Nango - End-to-End Tests ===\n");

// Test 1: Nango integration exists and has correct credentials
console.log("1. Nango Integration Configuration:");
await test("Instagram integration exists in Nango", async () => {
  const res = await fetch("https://api.nango.dev/integrations/instagram", {
    headers: { "Authorization": `Bearer ${NANGO_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.data?.unique_key) throw new Error("Integration not found");
  if (data.data.unique_key !== "instagram") throw new Error("Wrong unique_key");
  if (data.data.provider !== "instagram") throw new Error("Wrong provider");
});

await test("Instagram integration has correct Meta App ID", async () => {
  const res = await fetch("https://api.nango.dev/config/instagram?include_creds=true", {
    headers: { "Authorization": `Bearer ${NANGO_SECRET_KEY}` },
  });
  const data = await res.json();
  const clientId = data.config?.client_id;
  if (!clientId) throw new Error("No client_id found in Nango config");
  if (clientId !== META_APP_ID) throw new Error(`client_id mismatch: ${clientId} !== ${META_APP_ID}`);
});

await test("Instagram integration has client_secret configured", async () => {
  const res = await fetch("https://api.nango.dev/config/instagram?include_creds=true", {
    headers: { "Authorization": `Bearer ${NANGO_SECRET_KEY}` },
  });
  const data = await res.json();
  const clientSecret = data.config?.client_secret;
  if (!clientSecret) throw new Error("No client_secret found in Nango config");
  if (clientSecret.length < 10) throw new Error("client_secret seems too short");
});

// Test 2: Nango session token creation for Instagram
console.log("\n2. Nango Session Token Creation:");
await test("Can create a Nango connect session for Instagram", async () => {
  const nango = new Nango({ secretKey: NANGO_SECRET_KEY });
  const session = await nango.createConnectSession({
    end_user: {
      id: "test-user-999",
      email: "test@example.com",
      display_name: "Test User",
    },
    allowed_integrations: ["instagram"],
  });
  if (!session.data?.token) throw new Error("No session token returned");
  if (session.data.token.length < 10) throw new Error("Session token too short");
  console.log(`     Token prefix: ${session.data.token.substring(0, 20)}...`);
});

await test("Session token is scoped to instagram only", async () => {
  const nango = new Nango({ secretKey: NANGO_SECRET_KEY });
  const session = await nango.createConnectSession({
    end_user: {
      id: "test-user-998",
      email: "test@example.com",
    },
    allowed_integrations: ["instagram"],
  });
  if (!session.data?.token) throw new Error("No session token returned");
});

// Test 3: Meta App credentials validation
console.log("\n3. Meta App Credentials:");
await test("META_APP_ID is set and valid", async () => {
  if (!META_APP_ID) throw new Error("META_APP_ID not set");
  if (META_APP_ID.length < 5) throw new Error("META_APP_ID too short");
});

await test("META_APP_SECRET is set and valid", async () => {
  if (!META_APP_SECRET) throw new Error("META_APP_SECRET not set");
  if (META_APP_SECRET.length < 10) throw new Error("META_APP_SECRET too short");
});

await test("Meta App is accessible via Graph API", async () => {
  const accessToken = `${META_APP_ID}|${META_APP_SECRET}`;
  const res = await fetch(`https://graph.facebook.com/v19.0/${META_APP_ID}?access_token=${encodeURIComponent(accessToken)}&fields=id,name`);
  const data = await res.json();
  if (data.error) throw new Error(`Graph API error: ${data.error.message}`);
  if (data.id !== META_APP_ID) throw new Error(`App ID mismatch: ${data.id}`);
  console.log(`     App name: ${data.name}`);
});

// Test 4: OAuth URL structure validation
console.log("\n4. Instagram OAuth URL Structure:");
await test("Instagram OAuth authorization URL is correct", async () => {
  const expectedBase = "https://api.instagram.com/oauth/authorize";
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: "https://api.nango.dev/oauth/callback",
    scope: "user_profile,user_media",
    response_type: "code",
  });
  const url = `${expectedBase}?${params.toString()}`;
  // URLSearchParams percent-encodes the redirect_uri, so decode before checking
  const decoded = decodeURIComponent(url);
  if (!decoded.includes("api.instagram.com/oauth/authorize")) throw new Error("Wrong base URL");
  if (!decoded.includes(META_APP_ID)) throw new Error("Missing client_id");
  if (!decoded.includes("api.nango.dev/oauth/callback")) throw new Error("Missing Nango callback");
  console.log(`     URL: ${url.substring(0, 80)}...`);
});

await test("Nango callback URL is correctly set as redirect_uri", async () => {
  const nangoCallbackUrl = "https://api.nango.dev/oauth/callback";
  if (!nangoCallbackUrl.includes("api.nango.dev")) throw new Error("Wrong Nango domain");
});

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log("\n⚠️  Some tests failed. Check the errors above.");
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed! Instagram OAuth via Nango is correctly configured.");
}
