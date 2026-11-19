import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Categories } from './pages/Categories';
import { CategoryDetail } from './pages/CategoryDetail';
import { About } from './pages/About';
import { Reviews } from './pages/Reviews';
import { Gallery } from './pages/Gallery';
import { Contact } from './pages/Contact';
import { Cart } from './pages/Cart';
import { NotFound } from './pages/NotFound';

const AdminLayout = lazy(() => import('./admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import('./admin/Login').then((m) => ({ default: m.AdminLogin })));
const ChangePassword = lazy(() => import('./admin/ChangePassword').then((m) => ({ default: m.ChangePassword })));
const RequireAdmin = lazy(() => import('./admin/RequireAdmin').then((m) => ({ default: m.RequireAdmin })));
const Dashboard = lazy(() => import('./admin/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminProducts = lazy(() => import('./admin/Products').then((m) => ({ default: m.AdminProducts })));
const ProductForm = lazy(() => import('./admin/ProductForm').then((m) => ({ default: m.ProductForm })));
const AdminCategories = lazy(() => import('./admin/Categories').then((m) => ({ default: m.AdminCategories })));
const AdminReviews = lazy(() => import('./admin/Reviews').then((m) => ({ default: m.AdminReviews })));
const AdminGallery = lazy(() => import('./admin/Gallery').then((m) => ({ default: m.AdminGallery })));
const AdminSettings = lazy(() => import('./admin/Settings').then((m) => ({ default: m.AdminSettings })));

function AdminFallback() {
  return <div className="p-8 text-sm text-muted">Loading…</div>;
}

export function App() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="category/:slug" element={<CategoryDetail />} />
        <Route path="about" element={<About />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="contact" element={<Contact />} />
        <Route path="cart" element={<Cart />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />

      <Route
        path="/admin/change-password"
        element={
          <Suspense fallback={<AdminFallback />}>
            <RequireAdmin>
              <ChangePassword />
            </RequireAdmin>
          </Suspense>
        }
      />

      <Route
        path="/admin"
        element={
          <Suspense fallback={<AdminFallback />}>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </Suspense>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
