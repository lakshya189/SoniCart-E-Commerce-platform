const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleReviews() {
  try {
    console.log('Adding sample reviews...');

    // Get some products and users
    const products = await prisma.product.findMany({ take: 5 });
    const users = await prisma.user.findMany({ take: 3 });

    if (products.length === 0) {
      console.log('No products found. Please add some products first.');
      return;
    }

    if (users.length === 0) {
      console.log('No users found. Please add some users first.');
      return;
    }

    const sampleReviews = [
      {
        rating: 5,
        comment: 'Excellent product! Highly recommend it. The quality is outstanding and it exceeded my expectations.'
      },
      {
        rating: 4,
        comment: 'Great product overall. Good value for money and fast shipping. Would buy again.'
      },
      {
        rating: 5,
        comment: 'Amazing quality! This is exactly what I was looking for. Very satisfied with my purchase.'
      },
      {
        rating: 3,
        comment: 'Good product but could be better. The packaging was a bit damaged but the product itself is fine.'
      },
      {
        rating: 5,
        comment: 'Perfect! Fast delivery and the product is exactly as described. Very happy with this purchase.'
      },
      {
        rating: 4,
        comment: 'Solid product with good features. The price is reasonable and the quality is good.'
      },
      {
        rating: 5,
        comment: 'Outstanding! This product has improved my daily routine significantly. Worth every penny.'
      },
      {
        rating: 4,
        comment: 'Very good product. The design is nice and it works well. Minor improvements could be made.'
      }
    ];

    let reviewCount = 0;

    for (const product of products) {
      for (const user of users) {
        // Skip if user already reviewed this product
        const existingReview = await prisma.review.findUnique({
          where: {
            userId_productId: {
              userId: user.id,
              productId: product.id,
            },
          },
        });

        if (existingReview) {
          continue;
        }

        const sampleReview = sampleReviews[reviewCount % sampleReviews.length];
        
        await prisma.review.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: sampleReview.rating,
            comment: sampleReview.comment,
          },
        });

        reviewCount++;
        console.log(`Added review for product: ${product.name} by user: ${user.firstName} ${user.lastName}`);
      }
    }

    console.log(`✅ Successfully added ${reviewCount} sample reviews!`);
  } catch (error) {
    console.error('Error adding sample reviews:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleReviews(); 