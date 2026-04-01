import Stripe from "stripe";
import { config } from "dotenv";
config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

const productId = "prod_UFzL9TRgifddQd";

try {
  const prices = await stripe.prices.list({ product: productId, active: true });
  if (prices.data.length === 0) {
    console.log("No active prices found for product:", productId);
  } else {
    for (const price of prices.data) {
      console.log(`Price ID: ${price.id} | Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()} | Interval: ${price.recurring?.interval ?? "one-time"}`);
    }
  }
} catch (err) {
  console.error("Error:", err.message);
}
