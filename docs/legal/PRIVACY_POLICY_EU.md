# Privacy Notice for EEA, UK, and Switzerland

**Effective Date:** July 6, 2026

This Privacy Notice explains how the FlashHook Dev Team ("we", "us", or "our") collects, uses, and protects your personal data when you use the FlashHook service ("Service"). This notice is specifically designed to comply with the General Data Protection Regulation (GDPR) for users in the European Economic Area (EEA), the United Kingdom (UK), and Switzerland.

## 1. Data Controller
The data controller responsible for your personal data is:
**FlashHook Dev Team**
Address: Gajeong-ro, Seohae-gu, Incheon, Republic of Korea
Contact: [Support Form](https://forms.gle/ToLoy6HhEQmLepZw5)

*(Note: We do not have a designated Data Protection Officer or an EU Representative, as we operate as a solo developer outside the EU. You can contact us directly via the support form for any privacy-related inquiries.)*

## 2. Personal Data We Collect
We operate a non-member webhook sandbox service. We collect the following data:
- **Webhook Payload:** Headers, Query Parameters, and Raw Body sent to your generated endpoint.
- **Technical Data:** IP address, access logs, endpoint generation records, and a temporary `accessToken` (stored as an HttpOnly cookie that is destroyed when the browser tab is closed).

> **Important Note regarding Third-Party Data:** FlashHook is a webhook receiver. The data sent to your generated endpoints may contain personal data of third parties (e.g., names, emails from payment gateways). We process this data strictly as a processor on your behalf. Please ensure you have the legal right to send such data to our Service.

## 3. Purposes and Legal Basis for Processing
We process your personal data based on the following legal grounds under GDPR Article 6:
- **Performance of a Contract (Art. 6(1)(b)):** To provide the Service, render webhook data in real-time, and manage your endpoints.
- **Legitimate Interests (Art. 6(1)(f)):** To ensure the security of the Service, prevent abuse, implement rate limiting, and maintain server stability.

## 4. Data Recipients and Processors
To provide a stable service, we use trusted third-party cloud infrastructure providers (Data Processors) under strict data processing agreements:
- **Vercel:** Frontend hosting
- **Oracle Cloud:** Backend server infrastructure
- **MongoDB Atlas:** Database hosting
- **Cloudflare:** DNS and proxy services

## 5. International Data Transfers
Your data is transferred to and processed in our data centers located in **Seoul, Republic of Korea**. 
The European Commission has adopted an **Adequacy Decision** for the Republic of Korea, meaning that your data is protected by standards equivalent to the GDPR when transferred to our servers.

## 6. Data Retention
We retain your personal data only for as long as necessary.
- **Endpoint Data:** All webhook payloads and endpoint records are automatically and permanently deleted **within 24 hours** using a Time-To-Live (TTL) index in our database.

## 7. Your Data Subject Rights
Under the GDPR, you have the following rights regarding your personal data:
- **Right of Access:** You can request a copy of the personal data we hold about you.
- **Right to Rectification:** You can ask us to correct inaccurate or incomplete data.
- **Right to Erasure ("Right to be Forgotten"):** You can request the deletion of your data (though our system automatically deletes it within 24 hours).
- **Right to Restriction of Processing:** You can ask us to limit how we use your data.
- **Right to Data Portability:** You can request your data in a structured, machine-readable format.
- **Right to Object:** You can object to our processing of your data based on legitimate interests.
- **Right against Automated Decision-Making:** We do not use your data for automated decision-making or profiling (Art. 22).
- **Right to Withdraw Consent:** Where applicable, you can withdraw your consent at any time.

To exercise any of these rights, please contact us via our [Support Form](https://forms.gle/ToLoy6HhEQmLepZw5). 
You also have the **right to lodge a complaint** with a supervisory authority in your country of residence, place of work, or where the alleged infringement occurred (e.g., your local Data Protection Authority).

## 8. Children's Privacy
Our Service is not directed to individuals under the age of 16. We do not knowingly collect personal data from children under 16. If we become aware that we have collected data from a child under 16, we will take immediate steps to delete such information.
