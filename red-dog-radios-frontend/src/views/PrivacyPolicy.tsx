import Link from "next/link";
import type { ReactNode } from "react";
import { RedDogLogo } from "@/components/RedDogLogo";

const EFFECTIVE_DATE = "May 15, 2026";
const CONTACT_EMAIL = "Admin@GrantIntel.com";
const WEBSITE = "www.GrantIntel.com";
const ADDRESS = "685 South Arthur Ave, Unit 2A Louisville, CO 80027";

type Section = {
  title: string;
  content: ReactNode;
};

const sections: Section[] = [
  {
    title: "1. Scope of This Policy",
    content: (
      <p>
        This Privacy Policy applies to all users of Red Dog Grant Intelligence and governs our online
        data collection and usage practices. It does not apply to third-party websites or services that
        may be linked through our Platform.
      </p>
    ),
  },
  {
    title: "2. Information We Collect",
    content: (
      <>
        <h3 className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          A. Information You Provide
        </h3>
        <p className="mt-2">We may collect personal information that you voluntarily provide, including:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Name, email address, phone number</li>
          <li>Organization or agency name and role</li>
          <li>Address and contact details</li>
          <li>Grant application data, project descriptions, and budgets</li>
          <li>Account login credentials</li>
          <li>Communications, feedback, and support requests</li>
        </ul>

        <h3 className="mt-6 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          B. Information Collected Automatically
        </h3>
        <p className="mt-2">When you use the Platform, we may automatically collect:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>IP address and general location</li>
          <li>Device type, browser, and operating system</li>
          <li>Pages visited, time spent, and user activity</li>
          <li>Referral sources and search terms</li>
        </ul>
        <p className="mt-2">This data helps us improve performance and user experience.</p>

        <h3 className="mt-6 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
          C. Information from Third Parties
        </h3>
        <p className="mt-2">We may collect or integrate information from:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Public grant databases and government sources</li>
          <li>Nonprofit and foundation directories</li>
          <li>Third-party partners and service providers</li>
          <li>Publicly available records</li>
        </ul>
        <p className="mt-2">This may include funding opportunities and organizational data.</p>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use your information to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Provide grant discovery and matching services</li>
          <li>Generate and assist with grant applications</li>
          <li>Deliver AI-powered recommendations and tools</li>
          <li>Manage grant workflows and deadlines</li>
          <li>Improve platform functionality and performance</li>
          <li>Communicate with you about your account and services</li>
          <li>Send updates, alerts, and optional marketing communications</li>
          <li>Comply with legal obligations and enforce our Terms</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Artificial Intelligence (AI)",
    content: (
      <>
        <p>We use AI-powered tools to support:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Grant matching and scoring</li>
          <li>Application writing and editing</li>
          <li>Workflow automation</li>
        </ul>
        <p className="mt-4 font-semibold text-[#111827]">Important:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>AI outputs may not always be accurate or complete</li>
          <li>You are responsible for reviewing all generated content</li>
          <li>We do not rely solely on automated decision-making for legal or binding outcomes</li>
        </ul>
        <p className="mt-2">We may use anonymized and aggregated data to improve AI performance.</p>
      </>
    ),
  },
  {
    title: "5. How We Share Information",
    content: (
      <>
        <p className="font-semibold text-[#111827]">We do not sell your personal information.</p>
        <p className="mt-2">We may share information with:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Service providers (hosting, analytics, AI tools, communications)</li>
          <li>Business partners and affiliates</li>
          <li>Third parties you authorize (e.g., integrations)</li>
          <li>Legal authorities when required by law</li>
        </ul>
        <p className="mt-2">
          All third parties are required to safeguard your data and use it only for authorized purposes.
        </p>
      </>
    ),
  },
  {
    title: "6. Public and Third-Party Data",
    content: (
      <>
        <p>Our Platform may include data from public or third-party sources. You acknowledge:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Data may be subject to external restrictions</li>
          <li>Accuracy is not guaranteed</li>
          <li>You are responsible for verifying information before use</li>
        </ul>
        <p className="mt-2">We do not claim ownership of third-party data.</p>
      </>
    ),
  },
  {
    title: "7. Cookies and Tracking Technologies",
    content: (
      <>
        <p>We use cookies and similar technologies to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Improve functionality and performance</li>
          <li>Store user preferences</li>
          <li>Analyze usage patterns</li>
        </ul>
        <p className="mt-2">
          You may control cookies through your browser settings. Disabling cookies may limit certain
          features.
        </p>
      </>
    ),
  },
  {
    title: "8. Data Security",
    content: (
      <>
        <p>We implement industry-standard safeguards, including:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Secure cloud infrastructure</li>
          <li>Encryption (where applicable)</li>
          <li>Access controls and monitoring systems</li>
        </ul>
        <p className="mt-2">While we take reasonable precautions, no system is completely secure.</p>
      </>
    ),
  },
  {
    title: "9. Data Retention",
    content: (
      <>
        <p>We retain information:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>As long as your account is active</li>
          <li>As needed to provide services</li>
          <li>To meet legal and regulatory requirements</li>
        </ul>
        <p className="mt-2">
          Some data may remain in backups or records even after deletion requests.
        </p>
      </>
    ),
  },
  {
    title: "10. Your Privacy Rights",
    content: (
      <>
        <p>Depending on your location, you may have rights to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion</li>
          <li>Receive a copy of your data</li>
          <li>Opt out of certain uses (such as marketing)</li>
        </ul>
        <p className="mt-2">
          To submit a request, contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef3e34] hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We may verify your identity before fulfilling requests.
        </p>
      </>
    ),
  },
  {
    title: "11. California Privacy Rights (CCPA/CPRA)",
    content: (
      <>
        <p>California residents may have the right to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Know what personal information is collected</li>
          <li>Access and receive a copy of their data</li>
          <li>Request deletion of personal information</li>
          <li>Correct inaccurate data</li>
          <li>Opt out of the sale or sharing of personal information</li>
          <li>Not be discriminated against for exercising rights</li>
        </ul>
        <p className="mt-2 font-semibold text-[#111827]">We do not sell personal information.</p>
      </>
    ),
  },
  {
    title: "12. Marketing Communications",
    content: (
      <>
        <p>We may send communications related to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Platform updates</li>
          <li>Grant opportunities</li>
          <li>Product features</li>
        </ul>
        <p className="mt-2">
          You may opt out at any time using the unsubscribe link or by contacting us.
        </p>
      </>
    ),
  },
  {
    title: "13. Third-Party Links",
    content: (
      <>
        <p>Our Platform may link to external websites and services. We are not responsible for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Their privacy practices</li>
          <li>Their content or accuracy</li>
        </ul>
        <p className="mt-2">Please review their policies before sharing information.</p>
      </>
    ),
  },
  {
    title: "14. Children’s Privacy",
    content: (
      <p>
        Our services are not intended for individuals under 18. We do not knowingly collect information
        from minors.
      </p>
    ),
  },
  {
    title: "15. Business Transfers",
    content: (
      <p>
        In the event of a merger, acquisition, or sale, your information may be transferred as part
        of that transaction.
      </p>
    ),
  },
  {
    title: "16. Data Breach Response",
    content: (
      <>
        <p>If a security incident affects your personal information, we will:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Investigate promptly</li>
          <li>Take corrective action</li>
          <li>Notify affected users as required by law</li>
        </ul>
      </>
    ),
  },
  {
    title: "17. International Data Transfers",
    content: (
      <p>
        If you access the Platform outside the United States, your information may be transferred and
        processed in the United States.
      </p>
    ),
  },
  {
    title: "18. Changes to This Policy",
    content: (
      <>
        <p>We may update this Privacy Policy periodically. When changes occur, we will:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Update the effective date</li>
          <li>Provide notice via the Platform or email when required</li>
        </ul>
        <p className="mt-2">
          Continued use of the Platform indicates acceptance of the updated policy.
        </p>
      </>
    ),
  },
  {
    title: "19. Contact Us",
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

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/login" className="inline-block">
          <RedDogLogo className="w-44 sm:w-52" priority />
        </Link>

        <header className="mt-10 border-b border-[#e5e7eb] pb-8">
          <h1 className="[font-family:'Oswald',Helvetica] text-3xl font-bold uppercase tracking-tight text-black sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 [font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
            Effective Date: {EFFECTIVE_DATE}
          </p>
          <p className="mt-4 [font-family:'Montserrat',Helvetica] text-sm leading-relaxed text-[#374151]">
            Red Dog Grant Intelligence (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) values
            your privacy and is committed to protecting your information. This Privacy Policy explains
            how we collect, use, store, and share information when you access or use our website,
            applications, and services (the &ldquo;Platform&rdquo;).
          </p>
          <p className="mt-3 [font-family:'Montserrat',Helvetica] text-sm leading-relaxed text-[#374151]">
            By using our Platform, you agree to the practices described in this Privacy Policy.
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
            <Link href="/terms-of-use" className="text-[#ef3e34] hover:underline">
              Terms of Use
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
