import React from 'react';
import { Helmet } from 'react-helmet-async';

const ShippingInfo = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Helmet>
      <title>Shipping Information - SonicArt</title>
      <meta name="description" content="Learn about shipping methods, costs, and delivery times at SonicArt." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-4">Shipping Information</h1>
    <p className="mb-4 text-gray-700">
      We offer fast and reliable shipping to most locations worldwide. Shipping costs and delivery times vary based on your location and the shipping method selected at checkout.
    </p>
    <ul className="list-disc pl-6 mb-4 text-gray-700">
      <li>Standard Shipping: 5-7 business days</li>
      <li>Express Shipping: 2-3 business days</li>
      <li>Free shipping on orders over $100</li>
      <li>Order tracking available for all shipments</li>
    </ul>
    <p className="text-gray-700">For questions about your shipment, please contact our support team.</p>
  </div>
);

export default ShippingInfo; 