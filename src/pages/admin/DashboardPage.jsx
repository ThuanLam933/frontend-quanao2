// src/pages/admin/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Paper, Typography, Grid, CircularProgress } from "@mui/material";
import { API_BASE } from "../AdminPanel";

function StatCard({ title, value }) {
    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
                {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                {value}
            </Typography>
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
                fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

            const [pRes, oRes, uRes] = await Promise.all([
                fetch(`${API_BASE}/api/product-details`),
                fetchWithAuth(`${API_BASE}/api/orders`),
                fetchWithAuth(`${API_BASE}/api/admin/users`),
            ]);

            const [p, o, u] = await Promise.all([
                pRes.ok ? pRes.json().catch(() => []) : [],
                oRes.ok ? oRes.json().catch(() => []) : [],
                uRes.ok ? uRes.json().catch(() => []) : [],
            ]);

            let uArr = [];
            if (Array.isArray(u)) uArr = u;
            else if (Array.isArray(u.data)) uArr = u.data;

            let orderCount = 0;
            if (typeof o === "object" && o !== null) {
                if (typeof o.total === "number") orderCount = o.total;
                else if (Array.isArray(o.data)) orderCount = o.data.length;
                else if (Array.isArray(o)) orderCount = o.length;
            }

            setStats({
                products: Array.isArray(p) ? p.length : p.total ?? p.data?.length ?? 0,
                orders: orderCount,
                users: uArr.filter((x) => x.role === "user").length,
            });
        } catch (err) {
            console.warn("dashboard fetch error", err);
            setSnack({ severity: "error", message: "Không thể tải số liệu dashboard." });
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
                Overview
            </Typography>
            {loading ? (
                <CircularProgress />
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <StatCard title="Products" value={stats?.products ?? "—"} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <StatCard title="Orders" value={stats?.orders ?? "—"} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <StatCard title="Users" value={stats?.users ?? "—"} />
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
}