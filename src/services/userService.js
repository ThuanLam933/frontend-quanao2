import api from "./api";

export const login = (email, password) =>
  api.post("/login", { email, password });

export const register = (data) =>
  api.post("/register", data, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

