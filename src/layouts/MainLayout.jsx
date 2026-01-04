import React, { memo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "../component/user/header";
import HomeBanner from "../component/user/banner";
import Footer from "../component/user/footer";
import ScrollToTop from "../component/ScrollToTop"; 

const MainLayout = () => {
  const location = useLocation();
  const showBanner = location.pathname === "/trang-chu" || location.pathname === "/";

  return (
    <Box minHeight="100vh" bgcolor="#f9fafb">
      <Box>
        <Header />
        <ScrollToTop />
        {showBanner && <HomeBanner />}
        <Outlet />
        <Footer />
      </Box>
    </Box>
  );
};

export default memo(MainLayout);