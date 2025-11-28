// This is the same file you requested, now saved under the correct name: RegisterPage.jsx

import React, { useState } from "react";
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Stack,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { register } from "../services/userService"; // API service
import { useNavigate } from "react-router-dom";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0d0d0d", paper: "#121212" },
    primary: { main: "#1E88E5" },
    text: { primary: "#E0E0E0", secondary: "#90CAF9" },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "Roboto, sans-serif" },
});

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    if (!name.trim()) return "Vui lòng nhập họ tên.";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "Email không hợp lệ.";
    if (password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
    if (password !== confirm) return "Mật khẩu xác nhận không khớp.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const payload = { name, email, phone, password, password_confirmation: confirm };
      console.log("Register payload:", payload); // debug
      const res = await register(payload);
      const token = res?.data?.access_token ?? res?.access_token ?? null;
      const user = res?.data?.user ?? res?.user ?? res?.data ?? null;

      if (token) localStorage.setItem("access_token", token);
      try { localStorage.setItem("user", JSON.stringify(user || {})); } catch (_) {}

      navigate("/trang-chu");
    } catch (err) {
           const respData = err?.response?.data;
      console.error("Register failed", err);
      const status = err?.response?.status;
 console.error("Validation error (422) response data:", respData);
      if (status === 422) {
        const messages = err?.response?.data?.errors;
        console.error("Validation error (422) response data:", respData);
        console.log("data", err?.response?.data);
        if (messages) {
          const first = Object.values(messages).flat()[0];
          setError(first || "Dữ liệu không hợp lệ.");
        } else setError("Dữ liệu không hợp lệ.");
      } else if (status === 409) {
        setError("Email đã tồn tại.");
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d0d0d 40%, #1E3A5F 100%)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Container maxWidth="xs">
          <Paper elevation={6} sx={{ p: 4, backgroundColor: "#121212", border: "1px solid #1E88E5", boxShadow: "0px 0px 20px rgba(30,136,229,0.2)" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Avatar sx={{ m: 1, bgcolor: "#1E88E5" }}>
                <PersonAddIcon />
              </Avatar>
              <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                Tạo tài khoản
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                <Stack spacing={1}>
                  <TextField margin="normal" required fullWidth id="name" label="Họ và tên" variant="outlined" value={name} onChange={(e) => setName(e.target.value)} InputLabelProps={{ style: { color: "#90CAF9" } }} InputProps={{ style: { color: "white" } }} />

                  <TextField margin="normal" required fullWidth id="email" label="Email" variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} InputLabelProps={{ style: { color: "#90CAF9" } }} InputProps={{ style: { color: "white" } }} />

                  <TextField margin="normal" fullWidth id="phone" label="Số điện thoại (tùy chọn)" variant="outlined" value={phone} onChange={(e) => setPhone(e.target.value)} InputLabelProps={{ style: { color: "#90CAF9" } }} InputProps={{ style: { color: "white" } }} />

                  <TextField margin="normal" required fullWidth name="password" label="Mật khẩu" type="password" variant="outlined" value={password} onChange={(e) => setPassword(e.target.value)} InputLabelProps={{ style: { color: "#90CAF9" } }} InputProps={{ style: { color: "white" } }} />

                  <TextField margin="normal" required fullWidth name="confirm" label="Xác nhận mật khẩu" type="password" variant="outlined" value={confirm} onChange={(e) => setConfirm(e.target.value)} InputLabelProps={{ style: { color: "#90CAF9" } }} InputProps={{ style: { color: "white" } }} />

                  {error && <Typography variant="body2" sx={{ color: "#ef5350", mt: 1, textAlign: "center" }}>{error}</Typography>}

                  <FormControlLabel control={<Checkbox value="agree" color="primary" />} label={<Typography variant="body2" sx={{ color: "#90CAF9" }}>Tôi đồng ý với <Link href="#" sx={{ color: "#64B5F6" }}>Điều khoản & Điều kiện</Link></Typography>} />

                  <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 1, py: 1.2, fontWeight: "bold", backgroundColor: "#1E88E5", "&:hover": { backgroundColor: "#1565C0" } }}>
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Tạo tài khoản"}
                  </Button>

                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Link href="/login" variant="body2" sx={{ color: "#64B5F6" }}>Đã có tài khoản? Đăng nhập</Link>
                    <Link href="/" variant="body2" sx={{ color: "#64B5F6" }}>Quay về trang chủ</Link>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}