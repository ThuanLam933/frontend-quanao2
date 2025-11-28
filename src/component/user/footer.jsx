import React, { memo } from "react";
import { Box, Container, Grid, Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Footer() {
  const navigate = useNavigate();
  return (
    <Box sx={{ backgroundColor: "#0D1B2A", color: "#fff", py: 4, mt: 8 }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              DENIM ON
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Thời trang nam cao cấp — giao hàng toàn quốc.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" color="inherit" onClick={() => navigate("/contact")}>
                Liên hệ
              </Button>
              <Button variant="contained" color="primary" onClick={() => navigate("/collections")}>
                Mua ngay
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default memo(Footer);