import Link from "next/link";
import type { ReactNode } from "react";
import { RedDogLogo } from "@/components/RedDogLogo";

const EFFECTIVE_DATE = "May 10, 2026";
const CONTACT_EMAIL = "Admin@GrantIntel.com";
const WEBSITE = "www.GrantIntel.com";
const ADDRESS = "685 South Arthur Ave. Unit 2A Louisville, CO 80027";

type Section = {
  title: string;
  content: ReactNode;
};

const sections: Section[] = [
  {
    title: "1. Who We Are",
    content: (
      <>
        <p>
          Red Dog Grant Intelligence is operated by Red Dog Radios / Boca International, located in
          Colorado, unless otherwise updated in writing.
        </p>
        <p className="mt-2">For questions about these Terms, contact:</p>
        <div className="mt-2 space-y-1">
          <p className="font-semibold text-[#111827]">Red Dog Grant Intelligence</p>
          <p>
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef3e34] hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            Website:{" "}
            <a
              href="https://grantintel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ef3e34] hover:underline"
            >
              {WEBSITE}
            </a>
          </p>
        </div>
      </>
    ),
  },
  {
    title: "2. Eligibility and Accounts",
    content: (
      <>
        <p>
          To use certain features, you may be required to create an account. You agree to provide
          accurate, current, and complete information.
        </p>
        <p className="mt-2">You are responsible for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Keeping your login credentials confidential</li>
          <li>All activity under your account</li>
          <li>Not sharing or transferring your account without permission</li>
          <li>Promptly notifying us of unauthorized use</li>
        </ul>
        <p className="mt-2">
          You may only use the platform if you are legally able to enter into a binding agreement.
        </p>
      </>
    ),
  },
  {
    title: "3. Purpose of the Platform",
    content: (
      <>
        <p>
          Red Dog Grant Intelligence is designed to help public safety agencies, government entities,
          nonprofits, emergency service organizations, and related users identify funding opportunities,
          improve grant readiness, prepare applications, track grant activity, and manage post-award
          tasks.
        </p>
        <p className="mt-2">We do not guarantee that any user will receive grant funding.</p>
      </>
    ),
  },
  {
    title: "4. Acceptable Use",
    content: (
      <>
        <p>You agree not to use the platform to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Violate any law or regulation</li>
          <li>Submit false, misleading, or fraudulent grant information</li>
          <li>Infringe intellectual property rights</li>
          <li>Attempt to access another user&apos;s account</li>
          <li>Interfere with platform security</li>
          <li>Scrape, crawl, copy, or harvest platform data without written permission</li>
          <li>Reverse engineer, decompile, or attempt to extract platform source code</li>
          <li>Upload malware, harmful code, or spam</li>
          <li>Use the service to misrepresent eligibility for funding</li>
          <li>Overload, disrupt, or damage the platform</li>
        </ul>
        <p className="mt-2">We may suspend or terminate accounts that violate these rules.</p>
      </>
    ),
  },
  {
    title: "5. User Content and Submissions",
    content: (
      <>
        <p>
          You may upload, enter, or submit information such as agency profiles, project descriptions,
          budgets, grant narratives, documents, contacts, application materials, and related data.
        </p>
        <p className="mt-2">You retain ownership of your submitted materials.</p>
        <p className="mt-2">
          By submitting content, you grant Red Dog Grant Intelligence permission to use, store, process,
          analyze, format, modify, and display that content only as needed to operate the platform,
          provide services, generate grant materials, improve user experience, and support your account.
        </p>
        <p className="mt-2">You confirm that you have the right to submit any information you provide.</p>
      </>
    ),
  },
  {
    title: "6. AI-Generated Content",
    content: (
      <>
        <p>
          The platform may use artificial intelligence to assist with grant research, scoring, writing,
          summarization, recommendations, and workflow automation.
        </p>
        <p className="mt-2">
          AI-generated materials may contain errors, omissions, outdated information, or incomplete
          assumptions. You are responsible for reviewing, verifying, editing, and approving all content
          before submitting it to any funder, agency, or third party.
        </p>
        <p className="mt-2">
          Red Dog Grant Intelligence does not guarantee the accuracy, completeness, or success of
          AI-generated content, but their team does actively review grant applications and success rates.
          Thus, making changes and improvements to the AI intelligence model to maximize award
          opportunities.
        </p>
      </>
    ),
  },
  {
    title: "7. Grant Data and Funding Information",
    content: (
      <>
        <p>
          We may provide information about federal, state, local, private, nonprofit, and foundation
          funding sources.
        </p>
        <p className="mt-2">
          Grant deadlines, eligibility requirements, award amounts, contact information, and application
          rules may change without notice. Users are responsible for confirming all funding details
          directly with the issuing organization before applying.
        </p>
      </>
    ),
  },
  {
    title: "8. No Guarantee of Funding",
    content: (
      <>
        <p>
          Red Dog Grant Intelligence helps improve grant discovery, organization, preparation, and
          submission support. However, funding decisions are made by third-party grantors.
        </p>
        <p className="mt-2">We do not guarantee:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Grant approval</li>
          <li>Award amounts</li>
          <li>Eligibility</li>
          <li>Application acceptance</li>
          <li>Review scores</li>
          <li>Funding timelines</li>
          <li>Continued availability of any grant</li>
        </ul>
      </>
    ),
  },
  {
    title: "9. Fees, Subscriptions, and Payment",
    content: (
      <>
        <p>
          Certain services may require payment, subscription fees, setup fees, success fees, consulting
          fees, or other charges.
        </p>
        <p className="mt-2">
          By purchasing a paid service, you agree to pay all applicable fees according to the pricing
          presented at the time of purchase or in a signed agreement.
        </p>
        <p className="mt-2">
          Fees may be changed with reasonable notice, unless otherwise stated in a written agreement.
        </p>
      </>
    ),
  },
  {
    title: "10. Cancellations and Refunds",
    content: (
      <>
        <p>
          Cancellation terms may vary by plan, subscription, or written agreement. Unless otherwise stated
          in writing:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Subscription fees are non-refundable</li>
          <li>Partial billing periods are not refunded</li>
          <li>Access may continue until the end of the paid billing period</li>
          <li>
            Custom consulting, grant-writing, setup, or research fees may be non-refundable once work has
            begun
          </li>
        </ul>

        <h3 className="mt-6 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Cancellation, Pause, Plan Changes, and Retention Offers
        </h3>
        <p className="mt-2">
          You may cancel your Red Dog Grant Intelligence subscription at any time by providing written
          notice at least thirty (30) days in advance.
        </p>
        <p className="mt-2">
          Once a cancellation request is received, your account will remain active for the remainder of
          the 30-day notice period, so you can continue accessing the platform and services. During this
          time, your subscription will continue as normal, including one final billing cycle.
        </p>
        <p className="mt-2">
          At the end of the 30-day notice period, your account will be fully canceled and access to the
          platform will be removed.
        </p>

        <h3 className="mt-6 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Flexible Options Before You Cancel
        </h3>
        <p className="mt-2">Before finalizing cancellation, you may choose one of the following options:</p>

        <h4 className="mt-4 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Pause Your Account
        </h4>
        <p className="mt-1">
          You may request to temporarily pause your subscription for up to 30–90 days. During this
          period, your data will be preserved, and platform access may be limited based on your plan.
        </p>

        <h4 className="mt-4 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Downgrade Your Plan
        </h4>
        <p className="mt-1">
          You may switch to a lower-cost plan. Changes will typically take effect at the start of your
          next billing cycle.
        </p>

        <h4 className="mt-4 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Retention / Save Offers
        </h4>
        <p className="mt-1">
          At our discretion, Red Dog Grant Intelligence may present account holders with optional
          retention offers when a cancellation request is submitted. These offers may include, but are
          not limited to:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Temporary discounts</li>
          <li>Account credits</li>
          <li>Extended access periods</li>
          <li>Feature adjustments or plan modifications</li>
        </ul>
        <p className="mt-2">
          Acceptance of any retention offer may modify your billing cycle, pricing, or service terms as
          communicated at the time of the offer.
        </p>
        <p className="mt-2">
          Retention offers are not guaranteed, may vary by account, and may be withdrawn at any time.
        </p>

        <h3 className="mt-6 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          Additional Terms
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            The 30-day notice period ensures a smooth transition and continued access to your data
          </li>
          <li>Subscription fees during this period are considered part of your final billing cycle</li>
          <li>No prorated refunds will be issued for partial months or unused time</li>
          <li>
            All requests (cancel, pause, downgrade) must be submitted in writing to:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef3e34] hover:underline">
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>We may require verification to confirm account ownership before processing any request</li>
        </ul>
        <p className="mt-4">
          To cancel, contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef3e34] hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </>
    ),
  },
  {
    title: "11. Intellectual Property",
    content: (
      <>
        <p>
          The Red Dog Grant Intelligence platform, software, design, workflows, scoring tools, matching
          logic, reports, templates, branding, text, graphics, and other platform materials are owned by
          Red Dog Grant Intelligence or its licensors.
        </p>
        <p className="mt-2">
          You may not copy, sell, reproduce, distribute, reverse engineer, or create competing products
          from our platform content without written permission.
        </p>
        <p className="mt-2">
          You may use grant materials generated for your account for your own legitimate grant-related
          purposes.
        </p>
      </>
    ),
  },
  {
    title: "12. Feedback and Suggestions",
    content: (
      <p>
        If you provide ideas, recommendations, feature requests, comments, or feedback, you allow us to
        use that feedback without restriction or compensation.
      </p>
    ),
  },
  {
    title: "13. Third-Party Websites and Services",
    content: (
      <>
        <p>
          The platform may link to third-party grant portals, funder websites, government databases,
          payment processors, email services, CRM tools, or other outside resources.
        </p>
        <p className="mt-2">
          We do not control third-party websites or services and are not responsible for their content,
          availability, rules, privacy practices, or accuracy.
        </p>
        <p className="mt-2">
          Your use of third-party services is at your own risk, but every reasonable effort will be
          utilized to maximize the use of these third-party services to improve your grant of award
          opportunities.
        </p>
      </>
    ),
  },
  {
    title: "14. Privacy",
    content: (
      <>
        <p>Your use of the platform is also governed by our Privacy Policy.</p>
        <p className="mt-2">
          The Privacy Policy explains how we collect, use, store, protect, and share user information.
        </p>
        <p className="mt-2">
          Privacy Policy URL:{" "}
          <Link href="/privacy-policy" className="text-[#ef3e34] hover:underline">
            /privacy-policy
          </Link>
        </p>
      </>
    ),
  },
  {
    title: "15. Platform Changes",
    content: (
      <p>
        We may update, modify, limit, suspend, or discontinue any part of the platform at any time. We
        may also add or remove features, change workflows, update AI tools, adjust funding databases,
        or revise service offerings in the spirit of providing the most value for all users.
      </p>
    ),
  },
  {
    title: "16. Account Suspension or Termination",
    content: (
      <>
        <p>We may suspend or terminate your account if:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>You violate these Terms</li>
          <li>Payment fails</li>
          <li>You misuse the platform</li>
          <li>You submit fraudulent information</li>
          <li>Your activity creates legal, security, or operational risk</li>
          <li>We discontinue the service</li>
        </ul>
        <p className="mt-2">After termination, some account data may be deleted or inaccessible.</p>
      </>
    ),
  },
  {
    title: "17. Disclaimers",
    content: (
      <>
        <p>The platform is provided on an &ldquo;as available&rdquo; and &ldquo;as is&rdquo; basis.</p>
        <p className="mt-2">We do not promise that:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The platform will be uninterrupted</li>
          <li>All errors will be corrected</li>
          <li>Grant data will always be current</li>
          <li>AI outputs will be perfect</li>
          <li>Any application will be successful</li>
          <li>Any funding source will remain available</li>
        </ul>
        <p className="mt-2">
          To the fullest extent allowed by law, we disclaim all implied warranties, including warranties
          of merchantability, fitness for a particular purpose, and non-infringement.
        </p>
      </>
    ),
  },
  {
    title: "18. Limitation of Liability",
    content: (
      <>
        <p>
          To the fullest extent allowed by law, Red Dog Grant Intelligence will not be liable for
          indirect, incidental, special, consequential, punitive, or lost-profit damages.
        </p>
        <p className="mt-2">
          Our total liability for any claim will not exceed the amount paid by you to us for the service
          during the twelve months before the claim, or $100, whichever is greater, unless applicable law
          requires otherwise.
        </p>
      </>
    ),
  },
  {
    title: "19. Indemnification",
    content: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless Red Dog Grant Intelligence, its owners,
          employees, contractors, affiliates, and partners from claims, damages, losses, liabilities,
          costs, and expenses arising from:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your use of the platform</li>
          <li>Your submitted content</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of law</li>
          <li>Your misuse of grant information</li>
          <li>Any third-party claim related to your account activity</li>
        </ul>
      </>
    ),
  },
  {
    title: "20. Governing Law",
    content: (
      <p>
        These Terms will be governed by the laws of the State of Colorado, unless another jurisdiction is
        required by applicable law or agreed in writing. Venue for disputes will be in the appropriate
        state or federal courts located in Colorado, unless otherwise required by law.
      </p>
    ),
  },
  {
    title: "21. Changes to These Terms",
    content: (
      <>
        <p>
          We may update these Terms from time to time. Updated Terms may be posted on the website or sent
          by email.
        </p>
        <p className="mt-2">
          Continued use of the platform after changes become effective means you accept the updated Terms.
        </p>
      </>
    ),
  },
  {
    title: "22. Entire Agreement",
    content: (
      <p>
        These Terms, together with any Privacy Policy, subscription agreement, service agreement, order
        form, or written contract, represent the full agreement between you and Red Dog Grant
        Intelligence regarding use of the platform.
      </p>
    ),
  },
  {
    title: "23. Contact",
    content: (
      <div className="space-y-1">
        <p className="font-semibold text-[#111827]">Red Dog Grant Intelligence</p>
        <p>
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef3e34] hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          Website:{" "}
          <a
            href="https://grantintel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#ef3e34] hover:underline"
          >
            {WEBSITE}
          </a>
        </p>
        <p>Address: {ADDRESS}</p>
      </div>
    ),
  },
];

export const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/login" className="inline-block">
          <RedDogLogo className="w-44 sm:w-52" priority />
        </Link>

        <header className="mt-10 border-b border-[#e5e7eb] pb-8">
          <h1 className="[font-family:'Oswald',Helvetica] text-3xl font-bold uppercase tracking-tight text-black sm:text-4xl">
            Terms of Use
          </h1>
          <p className="mt-2 [font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
            Effective Date: {EFFECTIVE_DATE}
          </p>
          <p className="mt-4 [font-family:'Montserrat',Helvetica] text-sm leading-relaxed text-[#374151]">
            Welcome to Red Dog Grant Intelligence. These Terms of Use govern your access to and use of our
            website, software platform, grant-matching tools, AI grant-writing features, application support
            services, communications, reports, and related services.
          </p>
          <p className="mt-3 [font-family:'Montserrat',Helvetica] text-sm leading-relaxed text-[#374151]">
            By using Red Dog Grant Intelligence, you agree to these Terms. If you do not agree, you should
            not access or use the platform.
          </p>
        </header>

        <div className="mt-8 space-y-10 [font-family:'Montserrat',Helvetica] text-sm leading-relaxed text-[#374151]">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="[font-family:'Oswald',Helvetica] text-lg font-bold uppercase tracking-wide text-black">
                {section.title}
              </h2>
              <div className="mt-3 space-y-2">{section.content}</div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-[#e5e7eb] pt-8 text-center">
          <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
            © 2026 Red Dog Grant Intelligence · Grant Intelligence Platform
          </p>
          <p className="mt-2 [font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
            <Link href="/privacy-policy" className="text-[#ef3e34] hover:underline">
              Privacy Policy
            </Link>
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block [font-family:'Montserrat',Helvetica] text-xs font-medium text-[#ef3e34] hover:underline"
          >
            Back to sign in
          </Link>
        </footer>
      </div>
    </div>
  );
};
