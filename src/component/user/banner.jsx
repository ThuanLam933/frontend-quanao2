import React, { memo } from "react";
import { Box, Container, Grid, Typography, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";

const HERO_KEY = "home_hero_poster";

function HomeBanner() {
  const navigate = useNavigate();
  let heroImageUrl = "/images/quanxanh3.jpg";
  try {
    const dataUrl = localStorage.getItem(HERO_KEY);
    if (dataUrl) heroImageUrl = dataUrl;
  } catch {}

  return (
    <Box component="section" sx={{ width: "100%", mt: 0 }}>
      <Box
        sx={{
          width: "100%",
          height: { xs: 300, md: 520 },
          backgroundImage: `url("${heroImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container maxWidth="lg">
          <Grid container>
            <Grid item xs={12} md={7} />
            <Grid item xs={12} md={5} sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ backgroundColor: "rgba(255,255,255,0.95)", p: 3, borderRadius: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: "#0D1B2A", mb: 1 }}>
                  DENIM ON
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: "#0D1B2A", mb: 2 }}>
                  SUMMER COLLECTION
                </Typography>
                <Typography variant="body1" sx={{ color: "#0D1B2A", mb: 2 }}>
                  Only on DenimOn.com
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="primary" onClick={() => navigate("/collections")}>
                    Khám phá
                  </Button>
                  <Button variant="outlined" onClick={() => navigate("/collections?new=1")}>
                    Mua ngay
                  </Button>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default memo(HomeBanner);