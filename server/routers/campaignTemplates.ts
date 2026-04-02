/**
 * Campaign Templates Router
 *
 * Returns pre-built ICP campaign templates that users can use to
 * quickly set up campaigns targeting their ideal customer profiles.
 * Includes a special "Growth Engine Self-Promotion" template.
 */

import { router, protectedProcedure } from "../_core/trpc";

export interface CampaignTemplate {
  id: string;
  name: string;
  targetAudience: string;
  description: string;
  keywords: string[];
  platforms: string[];
  persona: string;
  estimatedThreadsPerWeek: string;
  category: string;
  isSelfPromotion?: boolean;
}

const TEMPLATES: CampaignTemplate[] = [
  {
    id: "social-media-managers",
    name: "Social Media Manager Outreach",
    targetAudience: "Social Media Managers & Agencies",
    description: "Target social media professionals complaining about manual engagement work, scaling challenges, and client reporting.",
    keywords: [
      "manually replying to comments",
      "social media engagement takes too long",
      "how to scale social media management",
      "social media agency tools",
      "automate social media engagement",
      "client social media reporting",
      "social media management workflow",
      "too many client accounts to manage",
      "social media ROI tracking",
      "engagement rate dropping",
    ],
    platforms: ["twitter", "reddit", "linkedin"],
    persona: "Experienced social media strategist who shares practical workflow tips. Helpful, direct, and focused on ROI. Occasionally mentions tools that save time.",
    estimatedThreadsPerWeek: "40–80",
    category: "Service Providers",
  },
  {
    id: "agency-owners",
    name: "Agency Owner Growth",
    targetAudience: "Digital Marketing Agency Owners",
    description: "Target agency owners discussing client acquisition, scaling operations, and competitive differentiation.",
    keywords: [
      "growing my marketing agency",
      "agency client acquisition",
      "how to get more agency clients",
      "scaling a digital agency",
      "agency owner struggles",
      "white label social media tools",
      "agency profit margins",
      "retainer clients for agency",
      "agency team management",
      "marketing agency differentiation",
    ],
    platforms: ["twitter", "linkedin", "reddit"],
    persona: "Agency growth advisor who has built and scaled multiple agencies. Shares candid insights on what actually works. No fluff, just results.",
    estimatedThreadsPerWeek: "25–50",
    category: "Business Owners",
  },
  {
    id: "saas-founders",
    name: "SaaS Founder Audience Building",
    targetAudience: "B2B SaaS Founders & Product Builders",
    description: "Target SaaS founders building in public, discussing growth challenges, and seeking distribution strategies.",
    keywords: [
      "building in public saas",
      "saas growth hacking",
      "b2b saas distribution strategy",
      "how to grow saas without ads",
      "saas founder community",
      "product led growth tactics",
      "saas churn reduction",
      "inbound leads for saas",
      "saas marketing on a budget",
      "early stage saas growth",
    ],
    platforms: ["twitter", "reddit", "linkedin"],
    persona: "Fellow SaaS founder sharing honest growth lessons. Builds in public, values authenticity, and engages with other builders generously.",
    estimatedThreadsPerWeek: "30–60",
    category: "Tech & SaaS",
  },
  {
    id: "ecommerce-brands",
    name: "E-commerce Brand Growth",
    targetAudience: "E-commerce Store Owners & DTC Brands",
    description: "Target e-commerce operators discussing customer acquisition costs, social proof, and organic growth strategies.",
    keywords: [
      "ecommerce organic growth",
      "reduce customer acquisition cost",
      "dtc brand social media strategy",
      "shopify store growth tips",
      "ecommerce without paid ads",
      "product launch social media",
      "ecommerce community building",
      "ugc content strategy",
      "social commerce strategy",
      "brand awareness ecommerce",
    ],
    platforms: ["instagram", "twitter", "reddit"],
    persona: "E-commerce growth consultant who specializes in organic acquisition. Shares specific tactics, not theory. Engages with founders building real brands.",
    estimatedThreadsPerWeek: "35–70",
    category: "E-commerce",
  },
  {
    id: "consultants-coaches",
    name: "Consultant & Coach Lead Gen",
    targetAudience: "Independent Consultants, Coaches & Freelancers",
    description: "Target consultants and coaches looking for clients, discussing positioning, and sharing their expertise.",
    keywords: [
      "how to get consulting clients",
      "freelance client acquisition",
      "business coach marketing",
      "consultant personal brand",
      "linkedin for consultants",
      "thought leadership content",
      "high ticket consulting clients",
      "freelancer finding clients",
      "coaching business growth",
      "consultant positioning strategy",
    ],
    platforms: ["linkedin", "twitter", "reddit"],
    persona: "Senior consultant who helps other consultants build sustainable practices. Shares frameworks and real client stories. Generous with advice.",
    estimatedThreadsPerWeek: "30–55",
    category: "Professional Services",
  },
  {
    id: "growth-engine-self-promo",
    name: "Growth Engine Self-Promotion",
    targetAudience: "Your Ideal Customers (Social Media Managers, Founders, Agency Owners)",
    description: "The exact campaign to run to find people who need Growth Engine. Targets high-intent conversations where your ICP is expressing the pain you solve.",
    keywords: [
      "manually replying to comments is exhausting",
      "how to grow faster on twitter",
      "social media engagement strategy",
      "need help with linkedin outreach",
      "automate social media growth",
      "how to find clients on social media",
      "social media management takes too long",
      "grow instagram followers organically",
      "reddit marketing strategy",
      "social media ROI not working",
    ],
    platforms: ["twitter", "reddit", "linkedin"],
    persona: "Founder of Growth Engine sharing how AI-powered engagement discovery works. Helpful, transparent, and focused on showing real results. Mentions the tool naturally when it's genuinely relevant.",
    estimatedThreadsPerWeek: "50–100",
    category: "Self-Promotion",
    isSelfPromotion: true,
  },
];

export const campaignTemplatesRouter = router({
  getTemplates: protectedProcedure.query(() => {
    return TEMPLATES;
  }),
});
