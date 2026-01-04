import React, { memo } from "react";
import { Box, Container, Grid, Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Footer() {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#fff",
        borderTop: "1px solid rgba(0,0,0,0.15)",
        mt: 10,
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: "#111",
                letterSpacing: 1,
              }}
            >
              DENIM ON
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 1.5,
                color: "#444",
                maxWidth: 380,
                lineHeight: 1.6,
              }}
            >
              Thời trang tối giản — phong cách hiện đại. Giao hàng toàn quốc, đổi
              trả nhanh chóng.
            </Typography>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              justifyContent: { xs: "flex-start", md: "flex-end" },
              alignItems: "center",
            }}
          >
            <Stack direction="row" spacing={3}>
              <Button
                variant="text"
                sx={{
                  textTransform: "none",
                  color: "#111",
                  fontWeight: 600,
                  fontSize: 15,
                  "&:hover": { color: "#000" },
                }}
                onClick={() => navigate("/collections")}
              >
                Sản phẩm
              </Button>

              <Button
                variant="text"
                sx={{
                  textTransform: "none",
                  color: "#111",
                  fontWeight: 600,
                  fontSize: 15,
                  "&:hover": { color: "#000" },
                }}
                onClick={() => navigate("/contact")}
              >
                Liên hệ
              </Button>

              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#111",
                  color: "#fff",
                  borderRadius: 0,
                  px: 3,
                  "&:hover": { backgroundColor: "#000" },
                }}
                onClick={() => navigate("/collections")}
              >
                Mua ngay
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 5, textAlign: "center" }}>
          <Typography
            variant="caption"
            sx={{ color: "#777", letterSpacing: 0.5 }}
          >
            © {new Date().getFullYear()} DENIM ON — All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default memo(Footer);
