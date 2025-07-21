import React from 'react';
import { Helmet } from 'react-helmet-async';

const ReturnsExchange = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Helmet>
      <title>Returns & Exchange - SonicArt</title>
      <meta name="description" content="Read our policy on returns and exchanges at SonicArt." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-4">Returns & Exchange</h1>
    <p className="mb-4 text-gray-700">
      If you are not satisfied with your purchase, you may return or exchange eligible items within 30 days of delivery. Items must be in original condition and packaging.
    </p>
    <ul className="list-disc pl-6 mb-4 text-gray-700">
      <li>Contact our support team to initiate a return or exchange</li>
      <li>Include your order number and reason for return/exchange</li>
      <li>Refunds are processed to the original payment method</li>
      <li>Some items may be non-returnable (see product page for details)</li>
    </ul>
    <p className="text-gray-700">For more information, please contact our support team.</p>
  </div>
);

export default ReturnsExchange; 