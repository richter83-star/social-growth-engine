import PublicPageLayout from "@/components/PublicPageLayout";
import { Badge } from "@/components/ui/badge";

export function PrivacyPolicy() {
  return (
    <PublicPageLayout>
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-20">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">Legal</Badge>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: April 3, 2026</p>
        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, connect social media accounts, or contact us for support. This includes your name, email address, and OAuth tokens for connected social platforms. We do not store your social media passwords.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send service-related communications, and comply with legal obligations. We do not sell your personal information to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Social Media Account Data</h2>
            <p>When you connect a social media account, we store only the OAuth tokens necessary to perform engagement actions on your behalf. We collect follower counts and engagement metrics to power your analytics dashboard. We do not access your private messages or contacts.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. You may delete your account and all associated data at any time by contacting us at privacy@socialgrowth.live.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest. OAuth tokens are stored securely and never exposed to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at privacy@socialgrowth.live.</p>
          </section>
        </div>
      </article>
    </PublicPageLayout>
  );
}

export function TermsOfService() {
  return (
    <PublicPageLayout>
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-20">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">Legal</Badge>
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: April 3, 2026</p>
        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Social Growth Engine, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Permitted Use</h2>
            <p>You may use Social Growth Engine to automate social media engagement on accounts you own or have explicit permission to manage. You may not use our service to spam, harass, or engage in any activity that violates the terms of service of connected social platforms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account Responsibility</h2>
            <p>You are responsible for all activity that occurs under your account. You agree to use our engagement automation features in compliance with the terms of service of Twitter/X, LinkedIn, Instagram, and other connected platforms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscription and Billing</h2>
            <p>Paid subscriptions are billed monthly or annually. You may cancel at any time. Refunds are not provided for partial billing periods. We reserve the right to change pricing with 30 days notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Limitation of Liability</h2>
            <p>Social Growth Engine is not responsible for any social media account suspensions or restrictions that result from your use of our service. You use engagement automation at your own risk and in compliance with each platform's terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Contact</h2>
            <p>For questions about these Terms, contact us at legal@socialgrowth.live.</p>
          </section>
        </div>
      </article>
    </PublicPageLayout>
  );
}

export function Contact() {
  return (
    <PublicPageLayout>
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">Contact</Badge>
        <h1 className="text-3xl font-bold text-white mb-4">Get in Touch</h1>
        <p className="text-white/60 mb-12 max-w-lg mx-auto">Have a question, feature request, or need help? We would love to hear from you.</p>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {[
            { title: "General Support", email: "support@socialgrowth.live", desc: "Questions about using the platform, account issues, or billing." },
            { title: "Privacy & Data", email: "privacy@socialgrowth.live", desc: "Data deletion requests, GDPR inquiries, or privacy concerns." },
            { title: "Partnerships", email: "partners@socialgrowth.live", desc: "Agency partnerships, integrations, or business development." },
          ].map(({ title, email, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 transition-colors">
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <a href={`mailto:${email}`} className="text-violet-400 text-sm hover:text-violet-300 transition-colors block mb-3">{email}</a>
              <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-3">Response Times</h2>
          <p className="text-white/60 text-sm">We typically respond within 24 hours on business days. For urgent account issues, please include "URGENT" in your subject line.</p>
        </div>
      </article>
    </PublicPageLayout>
  );
}
