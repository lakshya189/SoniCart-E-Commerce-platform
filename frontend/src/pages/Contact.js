import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      // Placeholder: POST to /api/contact
      await new Promise((res) => setTimeout(res, 1000));
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Helmet>
        <title>Contact Us - SonicArt</title>
        <meta name="description" content="Contact SonicArt for support, questions, or feedback." />
      </Helmet>
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="mb-6 text-gray-700">Have a question or need help? Fill out the form below and our team will get back to you soon.</p>
      {success && <div className="mb-4 text-green-600 font-medium">Your message has been sent!</div>}
      {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="input w-full" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400" disabled={loading}>{loading ? 'Sending...' : 'Send Message'}</button>
      </form>
    </div>
  );
};

export default Contact; 