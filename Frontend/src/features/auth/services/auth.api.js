import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

export const registerUser = async ({ username, email, password }) => {
  const response = await API.post("/auth/register", {
    username,
    email,
    password,
  });

  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const completeGoogleSignup = async ({ token, username, password }) => {
  const response = await API.post("/auth/google/complete-signup", {
    token,
    username,
    password,
  });

  return response.data;
};

export const logoutUser = async () => {
  const response = await API.post("/auth/logout");

  return response.data;
};

export const getMe = async () => {
  const response = await API.get("/auth/me");

  return response.data;
};
