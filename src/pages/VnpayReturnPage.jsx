import React, { useEffect, useRef, useState } from "react";
import { Box, Container, Paper, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

function pickLaravelError(body) {
  if (!body) return null;
  if (typeof body === "string") return body;
  if (body.message) return body.message;
  if (body.errors && typeof body.errors === "object") {
    const firstKey = Object.keys(body.errors)[0];
    const firstMsg = Array.isArray(body.errors[firstKey]) ? body.errors[firstKey][0] : body.errors[firstKey];
    return firstMsg || "Validation failed";
  }
  return "Validation failed";
}

export default function VnpayReturnPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | success | fail
  const [msg, setMsg] = useState("");

  const ranRef = useRef(false); // ✅ chặn chạy 2 lần trong dev StrictMode

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("vnp_ResponseCode"); // '00' là thành công

      if (code !== "00") {
        setStatus("fail");
        setMsg("Thanh toán không thành công hoặc bạn đã hủy giao dịch.");
        return;
      }

      const draftRaw = localStorage.getItem("pending_checkout");
      if (!draftRaw) {
        setStatus("fail");
        setMsg("Không tìm thấy dữ liệu đơn hàng tạm. Vui lòng quay lại thanh toán.");
        return;
      }

      const draft = JSON.parse(draftRaw);

      try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("access_token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // ✅ Gửi đúng payload như PaymentPage cũ (đừng thêm field lạ)
        const orderRes = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer: draft.customer,
            items: draft.items,
            payment: draft.payment, // { method: "Banking" }
            totals: draft.totals,
          }),
        });

        const body = await orderRes.json().catch(() => null);

        if (!orderRes.ok) {
          throw new Error(pickLaravelError(body) || `HTTP ${orderRes.status}`);
        }

        localStorage.removeItem("pending_checkout");
        localStorage.removeItem("cart");

        setStatus("success");
        setMsg("Thanh toán thành công! Đang chuyển đến đơn hàng...");
        navigate(`/order/${body.id}`);
      } catch (e) {
        setStatus("fail");
        setMsg(e.message || "Có lỗi khi tạo đơn sau thanh toán");
      }
    };

    run();
  }, [navigate]);

  return (
    <Box sx={{ minHeight: "80vh", py: 6, background: "#fff" }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 3, borderRadius: 0, boxShadow: "none", border: "1px solid #e5e5e5" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            KẾT QUẢ THANH TOÁN
          </Typography>

          {status === "checking" ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={22} />
              <Typography>Đang xác nhận...</Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ mb: 3 }}>{msg}</Typography>

              {status === "fail" && (
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button variant="outlined" sx={{ borderRadius: 0 }} onClick={() => navigate("/payment")}>
                    Quay lại thanh toán
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ borderRadius: 0, backgroundColor: "#DD002A", "&:hover": { backgroundColor: "#c10023" } }}
                    onClick={() => navigate("/cart")}
                  >
                    Về giỏ hàng
                  </Button>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
