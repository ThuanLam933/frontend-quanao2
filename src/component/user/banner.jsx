// src/components/HomeBanner.jsx
import React, { memo } from "react";
import { Box, Container, Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const HERO_KEY = "home_hero_poster";

function HomeBanner() {
  const navigate = useNavigate();

  // lấy ảnh banner từ localStorage (nếu có)
  let heroImageUrl = "/images/posterdemo2.png";
  try {
    const dataUrl = localStorage.getItem(HERO_KEY);
    if (dataUrl) heroImageUrl = dataUrl;
  } catch {}

  return (
    <Box component="section" sx={{ width: "100%", mt: 0 }}>
      {/* Banner nền lớn */}
      <Box
        sx={{
          width: "100%",
          height: { xs: 240, sm: 320, md: 420, lg: 480 }, // 🔥 chỉnh chiều cao hợp lý
          backgroundImage: `url('${heroImageUrl}')`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom", 
          position: "relative",
          display: "flex",
          
          alignItems: "center",
        }}
      >
        {/* Lớp phủ đậm chất Uniqlo */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.05))",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
          {/* Khối nội dung chữ */}
          <Box
            sx={{
              maxWidth: 480,
              color: "#fff",
              px: { xs: 1, md: 0 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                letterSpacing: 1,
                mb: 1,
                textTransform: "uppercase",
                fontSize: { xs: 28, md: 46 },
              }}
            >
              Denim On
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                textTransform: "uppercase",
                fontSize: { xs: 16, md: 22 },
                letterSpacing: 1,
              }}
            >
              Summer Collection
            </Typography>

            <Typography
              variant="body1"
              sx={{
                opacity: 0.9,
                mb: 3,
                maxWidth: 380,
                lineHeight: 1.6,
                fontSize: { xs: 13, md: 16 },
              }}
            >
              Phong cách tối giản, thiết kế dành riêng cho mùa hè.
            </Typography>

            {/* Button hành động */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#111",
                  color: "#fff",
                  borderRadius: 0,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  "&:hover": { backgroundColor: "#000" },
                }}
                onClick={() => navigate("/collections")}
              >
                Khám phá
              </Button>

              <Button
                variant="outlined"
                sx={{
                  borderColor: "#fff",
                  color: "#fff",
                  borderRadius: 0,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderColor: "#fff",
                  },
                }}
                onClick={() => navigate("/collections?new=1")}
              >
                Mua ngay
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default memo(HomeBanner);
