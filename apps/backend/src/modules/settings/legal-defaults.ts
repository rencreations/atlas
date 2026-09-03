/**
 * Default terms of service and privacy policy for a self-hosted Atlas
 * instance. They are written for the CURRENT state of Atlas (projects,
 * chat, PMO, media, optional voice) and stay provider-neutral: the
 * operator of the instance is the counterparty, not Atlas itself.
 *
 * Admins can replace either document at any time from godmode. Copy is
 * kept free of em dashes on purpose.
 */

export const TERMS_TEMPLATE = `# Terms of Service

*Last updated: {{DATE}}*

Welcome to **{{SITE_NAME}}**, a workspace platform for teams and communities built on Atlas. These Terms of Service ("Terms") are an agreement between you and the operator of this instance ("we", "us"). By creating an account or using this instance, you agree to these Terms.

## 1. Your account

You are responsible for keeping your account credentials safe and for everything that happens under your account. If you believe your account has been compromised, contact the instance administrator right away.

You must be at least the minimum age required in your country to use this service, and you must provide accurate information when you register.

## 2. Acceptable use

You agree not to:

- Upload or share anything unlawful, harmful, defamatory, or infringing on someone else's rights.
- Attempt to access accounts, projects, or data you are not authorized to see.
- Interfere with the operation of the service, for example by probing, scanning, or overloading it.
- Use the service to send spam, phishing messages, or malware.
- Republish content shared privately in a project without permission from the people involved.

We may suspend or remove accounts that break these rules, at our discretion.

## 3. Your content

You keep ownership of the content you create: messages, files, tasks, notes, whiteboards, and profile information. By posting content in projects, you give this instance the rights needed to store it, display it to the people you shared it with, and keep the service running.

Content you post publicly (for example in public projects) may be visible to anyone with access to this instance.

## 4. Projects and collaboration

Project owners and administrators decide who can view and edit their projects. We are not responsible for disputes between members of a project, or for how project owners use the content you contribute.

## 5. Third-party services

Sign-in providers (for example Google or GitHub), file storage, and other integrations are operated by third parties. Their own terms and privacy policies apply to your use of those services.

## 6. Availability

We aim to keep the service available, but we do not guarantee it will be uninterrupted or error-free. We are not liable for lost data or missed opportunities caused by downtime, beyond what the law requires. Please keep your own copies of anything critical.

## 7. Changes to the service

We may change or discontinue features at any time. If we make major changes to these Terms, we will notify you through the service or by email.

## 8. Termination

You may stop using the service and delete your account at any time. We may suspend or terminate accounts that violate these Terms.

## 9. Liability

To the maximum extent permitted by law, the service is provided "as is" and "as available" without warranties of any kind, and our total liability is limited to the amount you paid us, if any, for use of the service in the twelve months before the claim.

## 10. Contact

Questions about these Terms? Contact the administrator of this instance.`;

export const PRIVACY_TEMPLATE = `# Privacy Policy

*Last updated: {{DATE}}*

This policy explains what information **{{SITE_NAME}}** collects, why, and how it is handled. This is a self-hosted workspace running Atlas, operated by the administrator of this instance. Atlas itself is not the data controller.

## 1. What we collect

**Information you provide:**

- Account details: your name, email address (or phone number, if phone sign-in is enabled), and profile information.
- Content: messages, tasks, notes, whiteboards, files, and comments you create or upload.
- Consent records: whether and when you accepted the terms.

**Information collected automatically:**

- Technical logs: IP address, browser type, device, and the pages and API calls you make. These are used for security, error diagnosis, and capacity planning.
- Session information: sign-in times and the sign-in method you used.

## 2. How we use it

We use your information to:

- Run the service: authenticate you, deliver content, send notifications you asked for.
- Keep the service safe: detect abuse, prevent spam, and investigate incidents.
- Improve the instance: understand which features people use.

We do not sell personal information and do not use your private project content to build advertising profiles.

## 3. What others can see

Your profile and your activity inside a project are visible to the other members of that project. Content in public projects may be visible to everyone with access to this instance. Sign-in providers (for example Google or GitHub) see that you used them to sign in, according to their own policies.

## 4. Where data is stored and who processes it

Everything is stored on infrastructure controlled by the operator of this instance, plus the third-party services the operator configured: email delivery, file storage, SMS delivery, and sign-in providers. Those providers process data on our behalf under their own terms and data processing agreements.

## 5. Retention

We keep your account data while your account exists. When you delete your account, personal profile data is removed; content you contributed to shared projects may remain visible, attributed or anonymized, so the work of others stays intact. Server logs are kept for a limited period for security purposes.

## 6. Security

We protect data in transit with encryption and restrict access to the systems that store it. No service can guarantee perfect security; please report suspected vulnerabilities or incidents to the administrator.

## 7. Cookies and local storage

The service stores a session identifier and preferences in your browser's local storage. Some third-party integrations may set their own cookies.

## 8. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal information. Contact the administrator of this instance to exercise them.

## 9. Children

The service is not intended for children under the minimum age in their country. If you believe a child has created an account here, contact the administrator.

## 10. Changes

If we make significant changes to this policy, we will note them here and update the date above.

## 11. Contact

Privacy questions? Contact the administrator of this instance.`;
