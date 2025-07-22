console.log('DATABASE_URL:', process.env.DATABASE_URL);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed categories
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'All electronic items' },
    { name: 'Households', slug: 'households', description: 'Household products' },
    { name: 'Toys', slug: 'toys', description: 'Toys and games' },
    { name: 'Gifting', slug: 'gifting', description: 'Gifting products and ideas' },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sonicart.com' },
    update: {},
    create: {
      email: 'admin@sonicart.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'LAPTOP-001' },
      update: {},
      create: {
        name: 'Premium Laptop Pro',
        description: 'High-performance laptop with the latest processor and graphics',
        price: 1299.99,
        comparePrice: 1499.99,
        images: [
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        ],
        categoryId: categories[0].id,
        stock: 25,
        sku: 'LAPTOP-001',
        weight: 2.5,
        dimensions: '14" x 9.5" x 0.7"',
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PHONE-001' },
      update: {},
      create: {
        name: 'Smartphone X',
        description: 'Latest smartphone with advanced camera and long battery life',
        price: 799.99,
        comparePrice: 899.99,
        images: [
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
        ],
        categoryId: categories[0].id,
        stock: 50,
        sku: 'PHONE-001',
        weight: 0.2,
        dimensions: '6.1" x 3.0" x 0.3"',
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SHIRT-001' },
      update: {},
      create: {
        name: 'Premium Cotton T-Shirt',
        description: 'Comfortable and stylish cotton t-shirt for everyday wear',
        price: 29.99,
        comparePrice: 39.99,
        images: [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
        ],
        categoryId: categories[1].id,
        stock: 100,
        sku: 'SHIRT-001',
        weight: 0.3,
        dimensions: 'M',
        isFeatured: false,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CHAIR-001' },
      update: {},
      create: {
        name: 'Ergonomic Office Chair',
        description: 'Comfortable office chair with adjustable features',
        price: 199.99,
        comparePrice: 249.99,
        images: [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
          'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400',
        ],
        categoryId: categories[2].id,
        stock: 15,
        sku: 'CHAIR-001',
        weight: 15.0,
        dimensions: '28" x 28" x 48"',
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BALL-001' },
      update: {},
      create: {
        name: 'Professional Soccer Ball',
        description: 'High-quality soccer ball for professional training',
        price: 49.99,
        comparePrice: 59.99,
        images: [
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
          'https://images.unsplash.com/photo-1552318965-6e6be7484ada?w=400',
        ],
        categoryId: categories[3].id,
        stock: 30,
        sku: 'BALL-001',
        weight: 0.5,
        dimensions: 'Size 5',
        isFeatured: false,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Admin user created: ${admin.email}`);
  console.log(`📦 Categories created: ${categories.length}`);
  console.log(`🛍️ Products created: ${products.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 