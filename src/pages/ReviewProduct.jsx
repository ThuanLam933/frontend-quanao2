import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Pagination,
  Divider,
  Rating,
} from "@mui/material";

const API_BASE = "http://127.0.0.1:8000";

function getAuthHeaders() {
  // Tuỳ bạn lưu token thế nào (Sanctum Bearer token / JWT)
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ReviewProduct({ productId }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    avg_rating: 0,
    review_count: 0,
  });

  const [page, setPage] = useState(1);
  const [snack, setSnack] = useState(null);

  const [myReview, setMyReview] = useState(null);
  const isLoggedIn = !!localStorage.getItem("access_token");



  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const fetchReviews = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/products/${productId}/reviews?page=${pageToLoad}&per_page=6`
      );
      if (!res.ok) throw new Error(`Fetch reviews failed: ${res.status}`);
      const json = await res.json();

      setReviews(Array.isArray(json.data) ? json.data : []);
      setMeta(json.meta || {});
    } catch (e) {
      setSnack({ severity: "error", message: "Không thể tải đánh giá." });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchMyReview = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/my-review`, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });

      // Nếu API không tồn tại hoặc 401 thì bỏ qua
      if (!res.ok) return;

      const json = await res.json();
      setMyReview(json.data || null);

      if (json.data) {
        setRating(Number(json.data.rating) || 5);
        setComment(json.data.comment || "");
      }
    } catch {
      // ignore
    }
  }, [isLoggedIn, productId]);

  useEffect(() => {
    setPage(1);
    fetchReviews(1);
    fetchMyReview();
  }, [fetchReviews, fetchMyReview]);

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      setSnack({ severity: "warning", message: "Vui lòng đăng nhập để đánh giá." });
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setSnack({ severity: "warning", message: "Rating phải từ 1 đến 5." });
      return;
    }

    setSubmitting(true);
    try {
      const isUpdate = !!myReview?.id;
      const url = isUpdate
        ? `${API_BASE}/api/reviews/${myReview.id}`
        : `${API_BASE}/api/products/${productId}/reviews`;

      const method = isUpdate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (res.status === 401) {
        setSnack({ severity: "error", message: "Phiên đăng nhập hết hạn." });
        return;
      }
      

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 409: đã review rồi
        setSnack({
          severity: "error",
          message: json?.message || "Không thể gửi đánh giá.",
        });
        return;
      }

      setSnack({
        severity: "success",
        message: json?.message || (isUpdate ? "Cập nhật thành công." : "Tạo đánh giá thành công."),
      });

      // refresh list + myReview
      await fetchReviews(page);
      await fetchMyReview();
    } catch (e) {
      setSnack({ severity: "error", message: "Có lỗi khi gửi đánh giá." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview?.id) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${myReview.id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSnack({ severity: "error", message: json?.message || "Không thể xoá đánh giá." });
        return;
      }

      setSnack({ severity: "success", message: json?.message || "Đã xoá đánh giá." });
      setMyReview(null);
      setRating(5);
      setComment("");

      await fetchReviews(1);
      setPage(1);
    } catch {
      setSnack({ severity: "error", message: "Có lỗi khi xoá đánh giá." });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = async (_, value) => {
    setPage(value);
    await fetchReviews(value);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Đánh giá
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Rating value={Number(meta.avg_rating || 0)} precision={0.1} readOnly />
          <Typography sx={{ fontSize: 14, color: "#666" }}>
            {Number(meta.avg_rating || 0).toFixed(1)} ({meta.review_count || 0})
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Form */}
      <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 0, p: 2, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {myReview ? "Cập nhật đánh giá của bạn" : "Viết đánh giá"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 14, minWidth: 60 }}>Rating</Typography>
          <Rating value={rating} onChange={(_, v) => setRating(v || 1)} />
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ cảm nhận của bạn..."
        />

        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            disabled={submitting}
            sx={{ borderRadius: 0, textTransform: "none", bgcolor: "#111", "&:hover": { bgcolor: "#000" } }}
            onClick={handleSubmit}
          >
            {submitting ? <CircularProgress size={18} /> : (myReview ? "Cập nhật" : "Gửi đánh giá")}
          </Button>

          {myReview && (
            <Button
              variant="outlined"
              disabled={submitting}
              sx={{ borderRadius: 0, textTransform: "none", borderColor: "#111", color: "#111" }}
              onClick={handleDelete}
            >
              Xoá
            </Button>
          )}

          {!isLoggedIn && (
            <Typography sx={{ ml: 1, fontSize: 13, color: "#666", alignSelf: "center" }}>
              (Bạn cần đăng nhập để gửi đánh giá)
            </Typography>
          )}
        </Box>
      </Paper>

      {/* List */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Typography sx={{ color: "#666" }}>Chưa có đánh giá nào.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {reviews.map((r) => (
            <Paper
              key={r.id}
              elevation={0}
              sx={{ border: "1px solid #e0e0e0", borderRadius: 0, p: 2 }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {r.user?.name || "Người dùng"}
                  </Typography>
                  <Rating value={Number(r.rating || 0)} readOnly size="small" />
                </Box>

                <Typography sx={{ fontSize: 12, color: "#777" }}>
                  {r.Date_time_comment ? new Date(r.Date_time_comment).toLocaleString("vi-VN") : ""}
                </Typography>
              </Box>

              {r.comment && (
                <Typography sx={{ mt: 1, fontSize: 14, color: "#333", whiteSpace: "pre-wrap" }}>
                  {r.comment}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={Math.max(1, Number(meta.last_page || 1))}
          page={page}
          onChange={handlePageChange}
        />
      </Box>

      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
        {snack ? (
          <Alert onClose={() => setSnack(null)} severity={snack.severity}>
            {snack.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}
