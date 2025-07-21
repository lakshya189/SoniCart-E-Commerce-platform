import React from 'react';
import { Helmet } from 'react-helmet-async';

const About = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Helmet>
      <title>About Us - SonicArt</title>
      <meta name="description" content="Learn more about SonicArt, our mission, and our team." />
    </Helmet>
    <h1 className="text-3xl font-bold mb-4">About SonicArt</h1>
    <p className="mb-4 text-gray-700">
      SonicArt is a modern ecommerce platform dedicated to providing a seamless shopping experience for art and music lovers. Our mission is to connect creators and collectors through a curated selection of unique products, exceptional service, and a vibrant community.
    </p>
    <h2 className="text-xl font-semibold mt-6 mb-2">Our Mission</h2>
    <p className="mb-4 text-gray-700">
      We believe in empowering artists and musicians by giving them a platform to showcase their work and reach a global audience. We are committed to quality, authenticity, and customer satisfaction.
    </p>
    <h2 className="text-xl font-semibold mt-6 mb-2">Our Team</h2>
    <p className="mb-4 text-gray-700">
      Our team is made up of passionate individuals with backgrounds in art, music, technology, and customer service. We work together to ensure every customer and creator has a positive experience on SonicArt.
    </p>
  </div>
);

export default About; 