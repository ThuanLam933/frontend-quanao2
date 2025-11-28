import React, { useEffect, useState, memo } from "react";
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  IconButton,
  Button,
  Typography,
  Badge,
  TextField,
  InputAdornment,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";

import { useNavigate, createSearchParams, useSearchParams } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [searchText, setSearchText] = useState("");

  // đọc q từ URL để sync lên ô search
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  useEffect(() => {
    setSearchText(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const computeCount = () => {
      try {
        const raw = localStorage.getItem("cart") || "[]";
        const arr = JSON.parse(raw);
        const total = (Array.isArray(arr) ? arr : []).reduce(
          (s, it) => s + (Number(it.quantity || it.qty || 0) || 0),
          0
        );
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    computeCount();
    const onUpdated = () => computeCount();
    window.addEventListener("cartUpdated", onUpdated);
    window.addEventListener("storage", onUpdated); // cross-tab fallback
    return () => {
      window.removeEventListener("cartUpdated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const handleSearchSubmit = () => {
    const q = searchText.trim();
    const search = q ? `?${createSearchParams({ q })}` : "";
    navigate({
      pathname: "/trang-chu",
      search,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#fff",
        borderBottom: "1px solid rgba(13,27,42,0.06)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            gap: 2,
          }}
        >
          {/* Logo */}
          <Box onClick={() => navigate("/trang-chu")} sx={{ cursor: "pointer" }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: 2,
                color: "#0D1B2A",
              }}
            >
              DENIM ON
            </Typography>
          </Box>

          {/* Menu */}
          <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
            <Button
              onClick={() => navigate("/trang-chu")}
              sx={{ color: "#0D1B2A", textTransform: "none" }}
            >
              Trang chủ
            </Button>
            <Button
              onClick={() => navigate("/collections")}
              sx={{ color: "#0D1B2A", textTransform: "none" }}
            >
              Sản phẩm
            </Button>
            <Button
              onClick={() => navigate("/contact")}
              sx={{ color: "#0D1B2A", textTransform: "none" }}
            >
              Liên hệ
            </Button>
          </Box>

          {/* Search + icon bên phải */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
            }}
          >
            {/* Thanh tìm kiếm ở Header */}
            <TextField
              size="small"
              placeholder="Tìm sản phẩm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ width: 220 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSearchSubmit}
                      aria-label="search"
                    >
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <IconButton
              onClick={() => navigate("/account")}
              aria-label="user account"
            >
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
