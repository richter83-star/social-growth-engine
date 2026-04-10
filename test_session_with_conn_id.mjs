import { Nango } from "@nangohq/node";
const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY });

// Test with connection_id in the session
try {
  const session = await nango.createConnectSession({
    end_user: {
      id: "test-user-777",
      email: "test@example.com",
    },
    allowed_integrations: ["instagram"],
    connection_id: "user-1-account-test-777",
  });
  console.log("With connection_id:", JSON.stringify(session.data, null, 2));
} catch (err) {
  console.log("Error with connection_id:", err.message);
}
