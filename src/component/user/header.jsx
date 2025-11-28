import React, { useEffect, useState, memo } from "react";
import { AppBar, Toolbar, Container, Box, IconButton, Button, Typography, Badge } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const computeCount = () => {
      try {
        const raw = localStorage.getItem("cart") || "[]";
        const arr = JSON.parse(raw);
        const total = (Array.isArray(arr) ? arr : []).reduce((s, it) => s + (Number(it.quantity || it.qty || 0) || 0), 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    computeCount();
    const onUpdated = (ev) => computeCount();
    window.addEventListener("cartUpdated", onUpdated);
    window.addEventListener("storage", onUpdated); // cross-tab fallback
    return () => {
      window.removeEventListener("cartUpdated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  return (
    <AppBar position="sticky" elevation={0} sx={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
          <Box onClick={() => navigate("/trang-chu")} sx={{ cursor: "pointer" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#0D1B2A" }}>DENIM ON</Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
            <Button onClick={() => navigate("/trang-chu")} sx={{ color: "#0D1B2A", textTransform: "none" }}>Trang chủ</Button>
            <Button onClick={() => navigate("/collections")} sx={{ color: "#0D1B2A", textTransform: "none" }}>Sản phẩm</Button>
            <Button onClick={() => navigate("/contact")} sx={{ color: "#0D1B2A", textTransform: "none" }}>Liên hệ</Button>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={() => navigate("/account")} aria-label="user account">
              <AccountCircleIcon sx={{ color: "#0D1B2A" }} />
            </IconButton>
            <IconButton onClick={() => navigate("/wishlist")} aria-label="wishlist">
              <FavoriteBorderIcon sx={{ color: "#0D1B2A" }} />
            </IconButton>

            <IconButton onClick={() => navigate("/cart")} aria-label="cart">
              <Badge badgeContent={cartCount} color="error">
                <ShoppingCartIcon sx={{ color: "#0D1B2A" }} />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default memo(Header);