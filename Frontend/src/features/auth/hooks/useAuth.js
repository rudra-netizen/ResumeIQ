import { useContext, useEffect } from "react";

import { AuthContext } from "../auth.context";

import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  const { user, setUser, loading, setLoading } = context;

  async function handleLogin({ email, password }) {
    try {
      setLoading(true);

      const data = await login({
        email,
        password,
      });

      setUser(data.user);

      return data;
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister({ username, email, password }) {
    try {
      setLoading(true);

      const data = await register({
        username,
        email,
        password,
      });

      setUser(data.user);

      return data;
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoading(true);

      await logout();

      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function restoreUser() {
      try {
        const data = await getMe();

        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreUser();
  }, []);

  return {
    user,

    loading,

    handleRegister,

    handleLogin,

    handleLogout,
  };
};
