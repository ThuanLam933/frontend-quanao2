// src/pages/admin/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    Paper,
    Typography,
    Grid,
    CircularProgress,
    Box,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
} from "@mui/material";
import { API_BASE } from "../AdminPanel";

// Icons MUI
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import CategoryIcon from "@mui/icons-material/Category";
import PaletteIcon from "@mui/icons-material/Palette";
import StraightenIcon from "@mui/icons-material/Straighten";
import UndoIcon from "@mui/icons-material/Undo";
import FactoryIcon from "@mui/icons-material/Factory";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

// Helper format tiền
const formatCurrency = (v) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(v || 0);

// Card thống kê
function StatCard({ title, value, color, Icon }) {
    return (
        <Paper
            elevation={2}
            sx={{
                p: 2.5,
                borderRadius: 2,
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "1px solid rgba(0,0,0,0.04)",
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: `${color}14`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: color,
                }}
            >
                <Icon fontSize="medium" />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="h5"
                    sx={{ mt: 0.5, fontWeight: 700, color }}
                >
                    {value}
                </Typography>
            </Box>
        </Paper>
    );
}

export default function DashboardPage({ setSnack }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const fetchWithAuth = (url) =>
                fetch(url, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

            const [
                pRes,
                oRes,
                uRes,
                catRes,
                colorRes,
                sizeRes,
                retRes,
                supRes,
                invRes,
                recRes,
            ] = await Promise.all([
                fetch(`${API_BASE}/api/product-details`),
                fetchWithAuth(`${API_BASE}/api/orders`),
                fetchWithAuth(`${API_BASE}/api/admin/users`),
                fetch(`${API_BASE}/api/categories`),
                fetch(`${API_BASE}/api/colors`),
                fetch(`${API_BASE}/api/sizes`),
                fetch(`${API_BASE}/api/returns`),
                fetchWithAuth(`${API_BASE}/api/admin/suppliers`),
                fetchWithAuth(`${API_BASE}/api/admin/inventory/logs`),
                fetchWithAuth(`${API_BASE}/api/admin/receipts`),
            ]);

            const [p, o, u, cat, color, size, ret, sup, inv, rec] =
                await Promise.all([
                    pRes.ok ? pRes.json().catch(() => []) : [],
                    oRes.ok ? oRes.json().catch(() => []) : [],
                    uRes.ok ? uRes.json().catch(() => []) : [],
                    catRes.ok ? catRes.json().catch(() => []) : [],
                    colorRes.ok ? colorRes.json().catch(() => []) : [],
                    sizeRes.ok ? sizeRes.json().catch(() => []) : [],
                    retRes.ok ? retRes.json().catch(() => []) : [],
                    supRes.ok ? supRes.json().catch(() => []) : [],
                    invRes.ok ? invRes.json().catch(() => []) : [],
                    recRes.ok ? recRes.json().catch(() => []) : [],
                ]);

            // ===== Users =====
            let uArr = [];
            if (Array.isArray(u)) uArr = u;
            else if (Array.isArray(u.data)) uArr = u.data;

            // ===== Orders (list + tổng) =====
            let orderCount = 0;
            let ordersArr = [];
            if (Array.isArray(o)) {
                ordersArr = o;
                orderCount = o.length;
            } else if (Array.isArray(o?.data)) {
                ordersArr = o.data;
                orderCount = o.data.length;
            } else if (typeof o?.total === "number") {
                orderCount = o.total;
                if (Array.isArray(o?.data)) ordersArr = o.data;
            }

            // ===== Categories / Colors / Sizes / Returns / Suppliers / Inventory / Receipts =====
            const normalizeCount = (x) => {
                if (Array.isArray(x)) return x.length;
                if (Array.isArray(x?.data)) return x.data.length;
                if (typeof x?.total === "number") return x.total;
                return 0;
            };

            const catCount = normalizeCount(cat);
            const colorCount = normalizeCount(color);
            const sizeCount = normalizeCount(size);
            const retCount = normalizeCount(ret);
            const supCount = normalizeCount(sup);
            const invCount = normalizeCount(inv);
            const recCount = normalizeCount(rec);

            // ===== Doanh thu tháng này + top sản phẩm + data cho “chart” =====
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth(); // 0-11

            let monthlyRevenue = 0;
            const revenueByDay = {}; // {1: total, 2: total,...}
            const productMap = {}; // {productName: {name, qty, revenue}}

            const parseDate = (val) => {
                if (!val) return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const getOrderTotal = (order) =>
                Number(
                    order.total ??
                        order.amount ??
                        order.grand_total ??
                        order.total_price ??
                        0
                );

            const getOrderItems = (order) =>
                order.items ??
                order.order_items ??
                order.details ??
                order.order_details ??
                [];

            ordersArr.forEach((order) => {
                const dateStr =
                    order.created_at ??
                    order.date ??
                    order.order_date ??
                    order.updated_at;
                const d = parseDate(dateStr);
                if (!d) return;
                if (d.getFullYear() !== year || d.getMonth() !== month) return;

                const total = getOrderTotal(order);
                monthlyRevenue += total;

                const day = d.getDate();
                revenueByDay[day] = (revenueByDay[day] || 0) + total;

                const items = getOrderItems(order);
                if (Array.isArray(items)) {
                    items.forEach((item) => {
                        const prod =
                            item.product?.name ??
                            item.product?.title ??
                            item.product_name ??
                            item.name ??
                            item.title ??
                            "Sản phẩm khác";

                        const qty = Number(item.quantity ?? item.qty ?? 0);
                        const price = Number(
                            item.price ??
                                item.unit_price ??
                                item.sale_price ??
                                0
                        );
                        const lineTotal = Number(
                            item.total ??
                                item.amount ??
                                item.line_total ??
                                qty * price
                        );

                        if (!productMap[prod]) {
                            productMap[prod] = {
                                name: prod,
                                quantity: 0,
                                revenue: 0,
                            };
                        }
                        productMap[prod].quantity += qty;
                        productMap[prod].revenue += lineTotal;
                    });
                }
            });

            const revenueChartData = Object.keys(revenueByDay)
                .sort((a, b) => Number(a) - Number(b))
                .map((day) => ({
                    day: Number(day),
                    revenue: revenueByDay[day],
                }));

            const topProducts = Object.values(productMap)
                .filter((p) => p.quantity > 0)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setStats({
                products: Array.isArray(p)
                    ? p.length
                    : p.total ?? p.data?.length ?? 0,
                orders: orderCount,
                users: uArr.filter((x) => x.role === "user").length,
                categories: catCount,
                colors: colorCount,
                sizes: sizeCount,
                returns: retCount,
                suppliers: supCount,
                inventoryLogs: invCount,
                receipts: recCount,
                monthlyRevenue,
                revenueChartData,
                topProducts,
            });
        } catch (err) {
            console.warn("dashboard fetch error", err);
            setSnack({
                severity: "error",
                message: "Không thể tải số liệu dashboard.",
            });
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const statConfig = [
        {
            key: "products",
            title: "Sản phẩm",
            color: "#FF6B6B",
            Icon: Inventory2Icon,
        },
        {
            key: "orders",
            title: "Đơn hàng",
            color: "#4ECDC4",
            Icon: ShoppingCartIcon,
        },
        {
            key: "users",
            title: "Người dùng",
            color: "#45B7D1",
            Icon: PeopleIcon,
        },
        {
            key: "categories",
            title: "Loại sản phẩm",
            color: "#96CEB4",
            Icon: CategoryIcon,
        },
        {
            key: "colors",
            title: "Màu sắc",
            color: "#FDCB6E",
            Icon: PaletteIcon,
        },
        {
            key: "sizes",
            title: "Kích cỡ",
            color: "#DDA0DD",
            Icon: StraightenIcon,
        },
        {
            key: "returns",
            title: "Phiếu trả hàng",
            color: "#FF7675",
            Icon: UndoIcon,
        },
        {
            key: "suppliers",
            title: "Nhà cung cấp",
            color: "#74B9FF",
            Icon: FactoryIcon,
        },
        {
            key: "receipts",
            title: "Phiếu nhập kho",
            color: "#A29BFE",
            Icon: ReceiptLongIcon,
        },
    ];

    const monthlyRevenue = stats?.monthlyRevenue || 0;
    const revenueData = stats?.revenueChartData || [];
    const topProducts = stats?.topProducts || [];
    const maxRevenue =
        revenueData.reduce(
            (max, item) => (item.revenue > max ? item.revenue : max),
            0
        ) || 1; // tránh chia 0

    return (
        <Box>
            {/* Header */}
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                         Tổng Quan Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Doanh thu, sản phẩm, đơn hàng và người dùng trong hệ
                        thống.
                    </Typography>
                </Box>
            </Paper>

            {/* Stats */}
            <Paper
                elevation={1}
                sx={{ p: 3, mb: 3, borderRadius: 2, overflow: "hidden" }}
            >
                {loading && !stats ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: 140,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2.5}>
                        {statConfig.map(({ key, title, color, Icon }) => (
                            <Grid key={key} item xs={12} sm={6} md={4} lg={3}>
                                <StatCard
                                    title={title}
                                    value={
                                        stats && stats[key] !== undefined
                                            ? stats[key]
                                            : "—"
                                    }
                                    color={color}
                                    Icon={Icon}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Paper>

            {/* Doanh thu + Top sản phẩm */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Doanh thu tháng này + mini chart */}
                <Grid item xs={12} md={7}>
                    <Paper
                        elevation={1}
                        sx={{ p: 3, borderRadius: 2, height: "100%" }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 2 }}
                        >
                            <Box>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 600 }}
                                >
                                    💰 Doanh thu tháng này
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Tổng doanh thu của các đơn hàng trong tháng
                                    hiện tại.
                                </Typography>
                            </Box>
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 700, color: "#2E86DE" }}
                            >
                                {formatCurrency(monthlyRevenue)}
                            </Typography>
                        </Stack>

                        {revenueData.length ? (
                            <Box sx={{ mt: 2 }}>
                                <Box
                                    sx={{
                                        height: 220,
                                        display: "flex",
                                        alignItems: "flex-end",
                                        gap: 0.75,
                                        px: 1,
                                        borderRadius: 2,
                                        bgcolor: "#f8fafc",
                                        border:
                                            "1px solid rgba(148, 163, 184, 0.3)",
                                    }}
                                >
                                    {revenueData.map((item) => {
                                        const percent =
                                            (item.revenue / maxRevenue) * 100;

                                        return (
                                            <Box
                                                key={item.day}
                                                sx={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "flex-end",
                                                    gap: 0.5,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: "70%",
                                                        borderRadius: 999,
                                                        bgcolor: "#2E86DE",
                                                        height: `${percent || 4}%`, // có ít vẫn có bar nhỏ
                                                        transition:
                                                            "height 0.3s ease",
                                                    }}
                                                />
                                                <Typography
                                                    variant="caption"
                                                    sx={{ fontSize: 10 }}
                                                >
                                                    {item.day}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 1, display: "block" }}
                                >
                                    Biểu đồ thể hiện doanh thu theo từng ngày
                                    trong tháng hiện tại (đơn vị: VND).
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    mt: 3,
                                    textAlign: "center",
                                    color: "text.secondary",
                                }}
                            >
                                Chưa có dữ liệu doanh thu cho tháng này.
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Top sản phẩm bán chạy */}
                <Grid item xs={12} md={5}>
                    <Paper
                        elevation={1}
                        sx={{ p: 3, borderRadius: 2, height: "100%" }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 1 }}
                        >
                            🏆 Top sản phẩm bán chạy
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Dựa trên số lượng bán ra trong các đơn hàng tháng
                            này.
                        </Typography>

                        {topProducts.length ? (
                            <List dense>
                                {topProducts.map((prod, idx) => (
                                    <ListItem
                                        key={prod.name + idx}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            "&:last-child": { mb: 0 },
                                            border:
                                                "1px solid rgba(0,0,0,0.04)",
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    bgcolor: "#f5f6fa",
                                                    color: "#2d3436",
                                                    fontSize: 14,
                                                }}
                                            >
                                                {idx + 1}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={prod.name}
                                            secondary={`Số lượng: ${
                                                prod.quantity
                                            } • Doanh thu: ${formatCurrency(
                                                prod.revenue
                                            )}`}
                                            primaryTypographyProps={{
                                                sx: {
                                                    fontSize: 14,
                                                    fontWeight:
                                                        idx === 0 ? 600 : 500,
                                                },
                                            }}
                                            secondaryTypographyProps={{
                                                sx: { fontSize: 12 },
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box
                                sx={{
                                    mt: 2,
                                    textAlign: "center",
                                    color: "text.secondary",
                                }}
                            >
                                Chưa có dữ liệu top sản phẩm cho tháng này.
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Thông tin & gợi ý (giữ phần cũ) */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Paper
                        elevation={1}
                        sx={{ p: 3, borderRadius: 2, height: "100%" }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 1 }}
                        >
                            ℹ️ Thông tin
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Bảng điều khiển này hiển thị tóm tắt số lượng:
                            <b> Sản phẩm, Đơn hàng, Người dùng, Loại, Màu, Kích
                            cỡ, Phiếu trả, Nhà cung cấp</b> và
                            <b> Phiếu nhập kho</b>. Bạn có thể truy cập từng
                            mục ở menu bên trái để xem chi tiết và quản lý dữ
                            liệu. Đây là điểm xuất phát nhanh để nắm tình hình
                            tổng quan hệ thống.
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper
                        elevation={1}
                        sx={{ p: 3, borderRadius: 2, height: "100%" }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 1 }}
                        >
                            ✅ Gợi ý sử dụng Dashboard
                        </Typography>
                        <Stack spacing={1.2}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                • Nếu số <b>đơn hàng</b> tăng mạnh nhưng{" "}
                                <b>phiếu nhập kho</b> ít, hãy kiểm tra lại tồn
                                kho để tránh hết hàng.
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                • Số <b>phiếu trả hàng</b> cao có thể là dấu
                                hiệu sản phẩm lỗi hoặc mô tả chưa rõ ràng.
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                • Thường xuyên kiểm tra <b>loại, màu, kích
                                cỡ</b> để đảm bảo danh mục luôn gọn gàng, không
                                trùng lặp.
                            </Typography>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                        <Typography
                            variant="caption"
                            color="text.disabled"
                        >
                            Sau này bạn có thể thêm các thống kê chi tiết hơn
                            (doanh thu theo tuần, theo kênh bán hàng, v.v.)
                            ngay tại Dashboard này.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
