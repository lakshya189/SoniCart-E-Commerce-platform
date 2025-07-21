import React from 'react';
import { Helmet } from 'react-helmet-async';

const faqs = [
  {
    q: 'How do I place an order?',
    a: 'Browse products, add them to your cart, and proceed to checkout. Follow the on-screen instructions to complete your purchase.'
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept major credit cards, debit cards, and secure payments via Stripe.'
  },
  {
    q: 'How can I track my order?',
    a: 'You can view your order status in your account dashboard under "Orders".'
  },
  {
    q: 'How do I contact support?',
    a: 'Use the contact form on our Contact page or email support@sonicart.com.'
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'Yes, see our Returns & Exchange policy for details.'
  },
];

const HelpCenter = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Helmet>
      <title>Help Center - SonicArt</title>
      <meta name="description" content="Frequently asked questions and help for SonicArt customers." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-6">Help Center</h1>
    <div className="space-y-6">
      {faqs.map((faq, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">{faq.q}</h2>
          <p className="text-gray-700">{faq.a}</p>
        </div>
      ))}
    </div>
  </div>
);

export default HelpCenter; 