import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import UploadForm from './pages/UploadForm.jsx'
import Marketplace from './pages/Marketplace.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { AuthProvider, RequireAuth } from './context/AuthContext.jsx'
import LoginBuyer from './pages/LoginBuyer.jsx'
import SignupBuyer from './pages/SignupBuyer.jsx'
import LoginSeller from './pages/LoginSeller.jsx'
import SignupSeller from './pages/SignupSeller.jsx'
import BuyerDashboard from './pages/BuyerDashboard.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { UIProvider } from './context/UIContext.jsx'
import AIStudio from './pages/AIStudio.jsx'
import Profile from './pages/Profile.jsx'

function App() {
  return (
    <AuthProvider>
      <ProductsProvider>
        <OrdersProvider>
          <ToastProvider>
            <UIProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<RequireAuth role="seller"><UploadForm /></RequireAuth>} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/cart" element={<RequireAuth role="buyer"><CartLazy /></RequireAuth>} />
                <Route path="/checkout-cart" element={<RequireAuth role="buyer"><CheckoutCartLazy /></RequireAuth>} />
                <Route path="/ai" element={<AIStudio />} />
                <Route path="/profile" element={<RequireAuth role="buyer"><Profile /></RequireAuth>} />

                {/* Buyer auth */}
                <Route path="/login-buyer" element={<LoginBuyer />} />
                <Route path="/signup-buyer" element={<SignupBuyer />} />

                {/* Seller auth */}
                <Route path="/login-seller" element={<LoginSeller />} />
                <Route path="/signup-seller" element={<SignupSeller />} />

                {/* Product & checkout */}
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<RequireAuth role="buyer"><Checkout /></RequireAuth>} />
                <Route path="/order/:id" element={<RequireAuth role="buyer"><OrderDetail /></RequireAuth>} />

                {/* Dashboards */}
                <Route path="/buyer" element={<RequireAuth role="buyer"><BuyerDashboard /></RequireAuth>} />
                <Route path="/seller" element={<RequireAuth role="seller"><SellerDashboard /></RequireAuth>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
            </UIProvider>
          </ToastProvider>
        </OrdersProvider>
      </ProductsProvider>
    </AuthProvider>
  )
}

export default App

// Lazy-load Cart to keep initial bundle small
function CartLazy() {
  const Comp = React.useMemo(() => React.lazy(() => import('./pages/Cart.jsx')), [])
  return (
    <React.Suspense fallback={<div className="p-6">Loading cart…</div>}>
      <Comp />
    </React.Suspense>
  )
}

function CheckoutCartLazy() {
  const Comp = React.useMemo(() => React.lazy(() => import('./pages/CheckoutCart.jsx')), [])
  return (
    <React.Suspense fallback={<div className="p-6">Loading checkout…</div>}>
      <Comp />
    </React.Suspense>
  )
}
