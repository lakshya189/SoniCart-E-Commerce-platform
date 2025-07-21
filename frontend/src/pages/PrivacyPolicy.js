import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Helmet>
      <title>Privacy Policy - SonicArt</title>
      <meta name="description" content="Read the SonicArt privacy policy and learn how we protect your data." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
    <p className="mb-4 text-gray-700">
      Your privacy is important to us. SonicArt collects and uses your personal information only as necessary to provide our services, process orders, and improve your experience. We do not sell your data to third parties.
    </p>
    <ul className="list-disc pl-6 mb-4 text-gray-700">
      <li>We collect information you provide when you create an account, place an order, or contact support.</li>
      <li>We use cookies and analytics to improve our website and services.</li>
      <li>Your data is protected with industry-standard security measures.</li>
      <li>You may request deletion of your account and data at any time.</li>
    </ul>
    <p className="text-gray-700">For questions about our privacy practices, please contact privacy@sonicart.com.</p>
  </div>
);

export default PrivacyPolicy; 