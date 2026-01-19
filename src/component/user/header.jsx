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

import {
  useNavigate,
  createSearchParams,
  useSearchParams,
} from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [searchText, setSearchText] = useState("");

  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  useEffect(() => setSearchText(urlQuery), [urlQuery]);

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

    window.addEventListener("cartUpdated", computeCount);
    window.addEventListener("storage", computeCount);

    return () => {
      window.removeEventListener("cartUpdated", computeCount);
      window.removeEventListener("storage", computeCount);
    };
  }, []);

  const handleSearchSubmit = () => {
    const q = searchText.trim();
    const search = q ? `?${createSearchParams({ q })}` : "";
    navigate({ pathname: "/trang-chu", search });
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            gap: 3,
          }}
        >
          <Box onClick={() => navigate("/trang-chu")} sx={{ cursor: "pointer" }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: 1,
                color: "#111",
              }}
            >
              DENIM ON
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "center",
            }}
          >
            {[
              { label: "Trang chủ", link: "/trang-chu" },
              { label: "Sản phẩm", link: "/collections" },
              { label: "Liên hệ", link: "/lien-he" },
            ].map((item) => (
              <Button
                key={item.label}
                onClick={() => navigate(item.link)}
                sx={{
                  color: "#111",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 15,
                  "&:hover": { color: "#000" },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              sx={{
                width: 190,
                "& .MuiOutlinedInput-root": { borderRadius: 0 },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearchSubmit}>
                      <SearchIcon sx={{ color: "#111" }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <IconButton onClick={() => navigate("/account")}>
              <AccountCircleIcon sx={{ color: "#111" }} />
            </IconButton>

            

            <IconButton onClick={() => navigate("/cart")}>
              <Badge badgeContent={cartCount} color="error">
                <ShoppingCartIcon sx={{ color: "#111" }} />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default memo(Header);
