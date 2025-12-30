// src/pages/AdminPanel.jsx
import React, { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Container,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// import các page con mới tách
import DashboardPage from "./admin/DashboardPage";
import ProductsPage from "./admin/ProductsPage";
import CategoriesPage from "./admin/CategoriesPage";
import VariantPage from "./admin/VariantPage";
import ColorsPage from "./admin/ColorsPage";
import SizesPage from "./admin/SizesPage";
import InventoryPage from "./admin/InventoryPage";
import OrdersPage from "./admin/OrdersPage";
import UsersPage from "./admin/UsersPage";
import ReturnsPage from "./admin/ReturnsPage";
import StockPage from "./admin/StockPage";
import CommentsPage from "./admin/CommentsPage";
import ImageAdminPage from "./admin/ImageAdminPage";
import DiscountProductPage from "./admin/DiscountProductPage";
import DiscountPage from "./admin/DiscountPage";

const API_BASE = "http://127.0.0.1:8000"; // change if needed
export { API_BASE };

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#162447" },
  },
  shape: { borderRadius: 8 },
});

const SIDEBAR_ITEMS = [
  { key: "dashboard", title: "Dashboard" },
  { key: "products", title: "Sản phẩm" },
  { key: "variants", title: "Biến thể" },
  { key: "inventory", title: "Kho" },
  { key: "categories", title: "Loại" },
  { key: "colors", title: "Màu" },
  { key: "sizes", title: "Kích Cỡ" },
  { key: "orders", title: "Đơn hàng" },
  { key: "users", title: "Người dùng" },
  { key: "returns", title: "Phiếu trả" },
  { key: "stock", title: "Phiếu nhập" },
  { key: "discountproduct", title: "Sản phẩm giảm giá" },
  { key: "discount", title: "Mã giảm giá đơn hàng" },
  { key: "comments", title: "Comments" },
  { key: "images", title: "Image Manager" },
];

export default function AdminPanel() {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [snack, setSnack] = useState(null);
  const navigate = useNavigate();

  // handle logout: xóa token & user, show snackbar, chuyển về /login
  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user"); // nếu bạn lưu thông tin user
    } catch (e) {
      console.warn("logout cleanup", e);
    }
    setSnack({ severity: "info", message: "Đã đăng xuất." });
    // điều hướng sau một chút để snackbar hiện
    setTimeout(() => {
      navigate("/login");
    }, 700);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
        <AppBar position="fixed" sx={{ zIndex: 1400 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              onClick={() => setOpen((s) => !s)}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Admin Panel
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="persistent"
          open={open}
          sx={{
            width: 260,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: 260, boxSizing: "border-box", mt: 8 },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: "auto" }}>
            <List>
              {SIDEBAR_ITEMS.map((it) => (
                <ListItem key={it.key} disablePadding>
                  <ListItemButton selected={page === it.key} onClick={() => setPage(it.key)}>
                    <ListItemText primary={it.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Container maxWidth="xl">
            {page === "dashboard" && <DashboardPage setSnack={setSnack} />}
            {page === "products" && <ProductsPage setSnack={setSnack} />}
            {page === "categories" && <CategoriesPage setSnack={setSnack} />}
            {page === "colors" && <ColorsPage setSnack={setSnack} />}
            {page === "sizes" && <SizesPage setSnack={setSnack} />}
            {page === "inventory" && <InventoryPage setSnack={setSnack} />}
            {page === "variants" && <VariantPage setSnack={setSnack} />}
            {page === "orders" && <OrdersPage setSnack={setSnack} />}
            {page === "users" && <UsersPage setSnack={setSnack} />}
            {page === "returns" && <ReturnsPage setSnack={setSnack} />}
            {page === "stock" && <StockPage setSnack={setSnack} />}
            {page === "discountproduct" && <DiscountProductPage setSnack={setSnack} />}
            {page === "discount" && <DiscountPage setSnack={setSnack} />}
            {page === "comments" && <CommentsPage setSnack={setSnack} />}
            {page === "images" && <ImageAdminPage setSnack={setSnack} />}
          </Container>
        </Box>

        <Snackbar
          open={!!snack}
          autoHideDuration={3000}
          onClose={() => setSnack(null)}
        >
          {snack ? (
            <Alert onClose={() => setSnack(null)} severity={snack.severity}>
              {snack.message}
            </Alert>
          ) : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
