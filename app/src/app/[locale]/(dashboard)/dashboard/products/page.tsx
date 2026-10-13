import { getAdminEditableProducts } from '@/lib/admin-data';
import { getCategories } from '@/lib/catalog';
import DashboardProducts from './dashboard-products';
import ProductForm from './product-form';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const [products, categories] = await Promise.all([
    getAdminEditableProducts(),
    getCategories().catch(() => []),
  ]);

  const models = products
    .filter((product) => product.parentId === null)
    .map((product) => ({
      id: product.id,
      name: product.name,
      colorway: product.colorway,
    }));

  return (
    <div className="space-y-6">
      <ProductForm categories={categories} models={models} />
      <DashboardProducts
        products={products}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />
    </div>
  );
}