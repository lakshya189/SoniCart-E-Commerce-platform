const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    // Replace with your actual test data
    const API_URL = 'http://localhost:5000/api/products';
    const TOKEN = 'YOUR_AUTH_TOKEN'; // Get this after logging in
    
    // Create form data
    const form = new FormData();
    
    // Add text fields
    form.append('name', 'Test Product');
    form.append('description', 'This is a test product');
    form.append('price', '99.99');
    form.append('categoryId', 'YOUR_CATEGORY_ID'); // Replace with actual category ID
    form.append('stock', '10');
    form.append('isFeatured', 'true');
    
    // Add image file
    const imagePath = path.join(__dirname, 'test-image.jpg'); // Path to a test image
    if (fs.existsSync(imagePath)) {
      form.append('images', fs.createReadStream(imagePath));
    } else {
      console.warn('Test image not found, using empty file list');
    }
    
    // Make the request
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${TOKEN}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    console.log('Upload successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Upload failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testUpload();
