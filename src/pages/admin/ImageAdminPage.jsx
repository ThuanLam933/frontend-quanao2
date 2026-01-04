import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Stack,
    TextField,
    MenuItem,
    Button,
    Grid,
    Paper,
    Typography,
} from "@mui/material";

const API_BASE = "http://127.0.0.1:8000";

export default function ImageAdminPage({ setSnack }) {
    const [productDetailId, setProductDetailId] = useState("");
    const [details, setDetails] = useState([]);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchDetails = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/product-details`);
            if (!res.ok) throw new Error("fetch details failed");
            const data = await res.json();
            setDetails(Array.isArray(data) ? data : (data.data ?? []));
        } catch (err) {
            console.warn(err);
            setDetails([]);
        }
    }, []);

    const fetchImages = useCallback(async (id) => {
        if (!id) { setImages([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/image-products?product_detail_id=${encodeURIComponent(id)}`);
            if (!res.ok) throw new Error("fetch images failed");
            const data = await res.json();
            const items = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
            const norm = items.map(it => {
                let url = it.full_url ?? it.url ?? null;
                if (!url && it.url_image) {
                    if (/^https?:\/\//i.test(it.url_image)) url = it.url_image;
                    else url = `${API_BASE}/storage/${String(it.url_image).replace(/^\/+/, "")}`;
                }
                return { id: it.id, url, desc: it.description ?? "" };
            });
            setImages(norm);
        } catch (err) {
            console.error(err);
            setImages([]);
            setSnack?.({ severity: "error", message: "Không tải ảnh" });
        } finally { setLoading(false); }
    }, [setSnack]);

    useEffect(() => { fetchDetails(); }, [fetchDetails]);
    useEffect(() => { if (productDetailId) fetchImages(productDetailId); else setImages([]); }, [productDetailId, fetchImages]);

    return (
        <Box>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                    select
                    label="Product detail"
                    value={productDetailId}
                    onChange={(e) => setProductDetailId(e.target.value)}
                    sx={{ minWidth: 320 }}
                >
                    <MenuItem value="">-- select --</MenuItem>
                    {details.map(d => (
                        <MenuItem key={d.id} value={d.id}>
                            {d.product?.name ?? d.id} #{d.id}
                        </MenuItem>
                    ))}
                </TextField>
                <Button variant="outlined" onClick={() => fetchImages(productDetailId)} disabled={!productDetailId || loading}>
                    Refresh
                </Button>
            </Stack>

            <Grid container spacing={2}>
                {images.map(img => (
                    <Grid item key={img.id}>
                        <Paper sx={{ width: 180, height: 160, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {img.url ? (
                                <img src={img.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                            ) : (
                                <Typography>No URL</Typography>
                            )}
                        </Paper>
                    </Grid>
                ))}
                {images.length === 0 && productDetailId && !loading && (
                    <Grid item xs={12}>
                        <Typography color="text.secondary">Không có ảnh cho product detail này.</Typography>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
