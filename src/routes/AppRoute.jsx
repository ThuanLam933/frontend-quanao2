import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Route-based code splitting
const LoginPage = lazy(() => import("../pages/LoginPage"));
const HomePage = lazy(() => import("../pages/HomePage"));
const CartPage = lazy(() => import("../pages/CartPage"));
const ProductPage = lazy(() => import("../pages/ProductPage"));
const AdminPanel = lazy(() => import("../pages/AdminPanel"));
const MainLayout = lazy(() => import("../layouts/MainLayout"));
const AccountPage = lazy(() => import("../pages/AccountPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const PaymentPage = lazy(() => import("../pages/PaymentPage"));
const VnpayReturnPage = lazy(() => import("../pages/VnpayReturnPage"));


/**
 * ProtectedRoute: wrapper đơn giản để bảo vệ route
 * - Kiểm tra xem localStorage có access_token hay không.
 * - Nếu không có -> điều hướng về /login
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* public routes wrapped with main layout */}
        <Route element={<MainLayout />}>
          <Route path="/trang-chu" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/vnpay_return" element={<VnpayReturnPage />} />
          <Route path="/" element={<Navigate to="/trang-chu" replace />} />
        </Route>

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/trang-chu" replace />} />
      </Routes>
    </Suspense>
  );
}