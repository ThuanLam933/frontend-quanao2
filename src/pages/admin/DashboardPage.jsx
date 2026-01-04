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

const formatCurrency = (v) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(v || 0);

function StatCard({ title, value, color }) {
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
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                    {title}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, color }}>
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
                fetchWithAuth(`${API_BASE}/api/orders-all`),
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

            let uArr = [];
            if (Array.isArray(u)) uArr = u;
            else if (Array.isArray(u.data)) uArr = u.data;

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

            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            let monthlyRevenue = 0;

            const userNameById = new Map(
                (uArr || []).map((x) => [
                    x.id ?? x.user_id ?? x._id,
                    x.name ??
                        x.full_name ??
                        x.username ??
                        x.email ??
                        `User#${x.id}`,
                ])
            );

            const parseDate = (val) => {
                if (!val) return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const getOrderTotal = (order) =>
                Number(
                    order?.total_after_discount ??
                        order?.totalAfterDiscount ??
                        order?.total_discounted ??
                        order?.total_price ??
                        order?.total ??
                        order?.amount ??
                        order?.grand_total ??
                        0
                ) || 0;

            const getOrderItems = (order) =>
                order.items ??
                order.order_items ??
                order.details ??
                order.order_details ??
                [];

            const getCustomerName = (order) => {
                const embedded =
                    order?.user?.name ??
                    order?.user?.full_name ??
                    order?.user?.username ??
                    order?.customer?.name ??
                    order?.customer_name ??
                    order?.shipping_name ??
                    order?.receiver_name;

                if (embedded) return embedded;

                const uid = order?.user_id ?? order?.userId ?? order?.customer_id;
                if (uid != null && userNameById.has(uid))
                    return userNameById.get(uid);

                return "Khách hàng";
            };

            const getOrderCode = (order) =>
                order?.code ??
                order?.order_code ??
                order?.orderCode ??
                order?.id ??
                order?._id ??
                "—";

            const monthOrdersForTop = [];
            const productVariantMap = {};

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

                monthOrdersForTop.push({
                    id:
                        order?.id ??
                        order?._id ??
                        `${getOrderCode(order)}-${d.getTime()}`,
                    code: getOrderCode(order),
                    customerName: getCustomerName(order),
                    total,
                    date: d,
                });

                const items = getOrderItems(order);
                if (!Array.isArray(items)) return;

                items.forEach((item) => {
                    const prodName =
                        item.product?.name ??
                        item.product?.title ??
                        item.product_name ??
                        item.name ??
                        item.title ??
                        item?.product_detail?.product?.name ??
                        "";

                    const colorName =
                        item.color?.name ??
                        item.color_name ??
                        item?.product_detail?.color?.name ??
                        item?.productDetail?.color?.name ??
                        item?.product_detail?.color_name ??
                        "—";

                    const sizeName =
                        item.size?.name ??
                        item.size_name ??
                        item?.product_detail?.size?.name ??
                        item?.productDetail?.size?.name ??
                        item?.product_detail?.size_name ??
                        "—";

                    const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
                    const price =
                        Number(item.price ?? item.unit_price ?? item.sale_price ?? 0) ||
                        0;

                    const lineTotal =
                        Number(item.total ?? item.amount ?? item.line_total) ||
                        qty * price ||
                        0;

                    const key = `${prodName}__${colorName}__${sizeName}`;

                    if (!productVariantMap[key]) {
                        productVariantMap[key] = {
                            name: prodName,
                            color: colorName,
                            size: sizeName,
                            quantity: 0,
                            revenue: 0,
                        };
                    }

                    productVariantMap[key].quantity += qty;
                    productVariantMap[key].revenue += lineTotal;
                });
            });

            const topOrders = monthOrdersForTop
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);

            const topProducts = Object.values(productVariantMap)
                .filter((p) => p.quantity > 0)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setStats({
                products: Array.isArray(p) ? p.length : p.total ?? p.data?.length ?? 0,
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
                topOrders,
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
        { key: "products", title: "Sản phẩm", color: "#FF6B6B" },
        { key: "orders", title: "Đơn hàng", color: "#4ECDC4" },
        { key: "users", title: "Người dùng", color: "#45B7D1" },
        { key: "categories", title: "Loại sản phẩm", color: "#96CEB4" },
        { key: "colors", title: "Màu sắc", color: "#FDCB6E" },
        { key: "sizes", title: "Kích cỡ", color: "#DDA0DD" },
        { key: "returns", title: "Phiếu trả hàng", color: "#FF7675" },
        { key: "suppliers", title: "Nhà cung cấp", color: "#74B9FF" },
        { key: "receipts", title: "Phiếu nhập kho", color: "#A29BFE" },
    ];

    const monthlyRevenue = stats?.monthlyRevenue || 0;
    const topProducts = stats?.topProducts || [];
    const topOrders = stats?.topOrders || [];

    return (
        <Box>
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
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Doanh thu
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Doanh thu, sản phẩm, đơn hàng và người dùng trong hệ thống.
                    </Typography>
                </Box>
            </Paper>

            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, overflow: "hidden" }}>
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
                        {statConfig.map(({ key, title, color }) => (
                            <Grid key={key} item xs={12} sm={6} md={4} lg={3}>
                                <StatCard
                                    title={title}
                                    value={stats && stats[key] !== undefined ? stats[key] : "—"}
                                    color={color}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={7}>
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 2 }}
                        >
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Doanh thu tháng này
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng doanh thu của các đơn hàng trong tháng hiện tại.
                                </Typography>
                            </Box>

                            <Typography variant="h5" sx={{ fontWeight: 700, color: "#2E86DE" }}>
                                {formatCurrency(monthlyRevenue)}
                            </Typography>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Top 5 đơn hàng giá trị cao nhất (tháng này)
                        </Typography>

                        {topOrders.length ? (
                            <List dense>
                                {topOrders.map((o, idx) => (
                                    <ListItem
                                        key={o.id}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            border: "1px solid rgba(0,0,0,0.04)",
                                            "&:last-child": { mb: 0 },
                                        }}
                                        secondaryAction={
                                            <Typography sx={{ fontWeight: 700 }}>
                                                {formatCurrency(o.total)}
                                            </Typography>
                                        }
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
                                            primary={o.customerName}
                                            secondary={o.date ? o.date.toLocaleDateString("vi-VN") : ""}
                                            primaryTypographyProps={{
                                                sx: { fontSize: 14, fontWeight: idx === 0 ? 700 : 600 },
                                            }}
                                            secondaryTypographyProps={{ sx: { fontSize: 12 } }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ mt: 1, textAlign: "center", color: "text.secondary" }}>
                                Chưa có dữ liệu đơn hàng trong tháng này.
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            Top sản phẩm bán chạy
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Dựa trên số lượng bán ra trong các đơn hàng tháng này.
                        </Typography>

                        {topProducts.length ? (
                            <List dense>
                                {topProducts.map((prod, idx) => (
                                    <ListItem
                                        key={`${prod.name}-${prod.color}-${prod.size}-${idx}`}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            border: "1px solid rgba(0,0,0,0.04)",
                                            "&:last-child": { mb: 0 },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: "#f5f6fa", color: "#2d3436", fontSize: 14 }}>
                                                {idx + 1}
                                            </Avatar>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={prod.name}
                                            secondary={`Màu: ${prod.color} • Size: ${prod.size} • Lượt bán: ${prod.quantity} • Doanh thu: ${formatCurrency(
                                                prod.revenue
                                            )}`}
                                            primaryTypographyProps={{
                                                sx: { fontSize: 14, fontWeight: idx === 0 ? 700 : 600 },
                                            }}
                                            secondaryTypographyProps={{ sx: { fontSize: 12 } }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
                                Chưa có dữ liệu top sản phẩm cho tháng này.
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
