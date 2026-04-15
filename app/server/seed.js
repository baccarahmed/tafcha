import prisma from './database/prisma.js';
import { v4 as uuidv4 } from 'uuid';

async function seedProducts() {
  console.log('Seeding products...');

  try {
    // Get categories
    const categories = await prisma.category.findMany();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat.id;
    });

    const products = [
      {
        name: 'Double Pendant Necklace',
        price: 1100,
        stock: 15,
        categorySlug: 'minimalist-elegance',
        images: ['/images/product-1.jpg'],
        description: 'A stunning double pendant necklace featuring two interlocking circles, one adorned with sparkling diamonds. Perfect for both everyday wear and special occasions.',
      },
      {
        name: 'Charm Link Bracelet',
        price: 1100,
        stock: 20,
        categorySlug: 'minimalist-elegance',
        images: ['/images/product-2.jpg'],
        description: 'A beautiful charm link bracelet featuring star, heart, key, and locket charms. A perfect gift for someone special.',
      },
      {
        name: 'Teardrop Dangle Earrings',
        price: 850,
        stock: 12,
        categorySlug: 'bridal-bliss',
        images: ['/images/product-3.jpg'],
        description: 'Elegant teardrop dangle earrings featuring cascading diamonds. These stunning earrings will make you shine on any special occasion.',
      },
      {
        name: 'Diamond Teardrop Necklace',
        price: 3600,
        stock: 5,
        categorySlug: 'bridal-bliss',
        images: ['/images/product-4.jpg'],
        description: 'An exquisite diamond teardrop necklace featuring a large central stone surrounded by smaller diamonds. A true statement piece.',
      },
      {
        name: 'Delicate Knot Bracelet',
        price: 500,
        stock: 25,
        categorySlug: 'minimalist-elegance',
        images: ['/images/product-5.jpg'],
        description: 'A delicate gold knot bracelet symbolizing eternal love and connection. Simple yet meaningful.',
      },
      {
        name: 'Sphere Band Ring',
        price: 400,
        stock: 30,
        categorySlug: 'timeless-classics',
        images: ['/images/product-6.jpg'],
        description: 'A classic sphere band ring featuring polished gold beads. A timeless piece that never goes out of style.',
      },
      {
        name: 'Classic Chain Necklace',
        price: 950,
        stock: 18,
        categorySlug: 'timeless-classics',
        images: ['/images/product-7.jpg'],
        description: 'A classic snake chain necklace in polished gold. Versatile and elegant, perfect for layering or wearing alone.',
      },
      {
        name: 'Petite Infinity Ring',
        price: 350,
        stock: 40,
        categorySlug: 'minimalist-elegance',
        images: ['/images/product-8.jpg'],
        description: 'A petite infinity ring crafted in gold. A beautiful symbol of endless love and possibility.',
      },
    ];

    let added = 0;
    for (const product of products) {
      const existing = await prisma.product.findFirst({ where: { name: product.name } });
      if (!existing) {
        const id = uuidv4();
        const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        await prisma.product.create({
          data: {
            id,
            name: product.name,
            slug,
            description: product.description,
            price: product.price,
            stock: product.stock,
            categoryId: categoryMap[product.categorySlug] || null,
            images: JSON.stringify(product.images),
            featured: true,
            active: true
          }
        });
        added++;
      }
    }

    console.log(`Added ${added} products`);
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seedProducts().then(() => console.log('Seeding complete!'));
