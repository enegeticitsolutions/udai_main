import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiClient, AUTH_TOKEN_KEY } from "../lib/api";
import type { AuthResponse, AuthUser, Order, UserAddress } from "../types/api";
import { getCart, saveCart, type CartItem } from "../lib/cart";

type SignupInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

type LoginInput = {
  identifier: string;
  password?: string;
  otp?: string;
};

type AddressInput = {
  fullName: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  orders: Order[];
  addresses: UserAddress[];
  cart: CartItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  verifySignupOtp: (input: { email: string; otp: string }) => Promise<void>;
  sendOtp: (identifier: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (input: { email: string; otp: string; password: string }) => Promise<void>;
  syncCart: (items?: CartItem[]) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  addAddress: (input: AddressInput) => Promise<UserAddress>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setOrders([]);
    setAddresses([]);
    setCart(getCart());
  }, []);

  const refreshUserData = useCallback(async () => {
    const [profileResponse, ordersResponse, addressesResponse, cartResponse] = await Promise.all([
      apiClient.get<{ success: true; data: AuthUser }>("/user/profile"),
      apiClient.get<{ success: true; data: Order[] }>("/user/orders"),
      apiClient.get<{ success: true; data: UserAddress[] }>("/user/addresses"),
      apiClient.get<{ success: true; data: { items: CartItem[] } }>("/user/cart"),
    ]);

    setUser(profileResponse.data.data);
    setOrders(ordersResponse.data.data);
    setAddresses(addressesResponse.data.data);
    saveCart(cartResponse.data.data.items, { notify: false });
    setCart(getCart());
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      setCart(getCart());
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshUserData();
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [clearSession, refreshUserData]);

  useEffect(() => {
    function handleExpiredToken() {
      clearSession();
      toast.error("Session expired. Please sign in again.");
    }

    window.addEventListener("udai-auth-expired", handleExpiredToken);
    return () => window.removeEventListener("udai-auth-expired", handleExpiredToken);
  }, [clearSession]);

  const syncCart = useCallback(async (items = getCart()) => {
    if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) return;
    const response = await apiClient.put<{ success: true; data: { items: CartItem[] } }>("/user/cart", { items });
    saveCart(response.data.data.items, { notify: false });
    setCart(getCart());
  }, []);

  useEffect(() => {
    let syncTimer: ReturnType<typeof window.setTimeout> | undefined;

    function handleCartChanged() {
      setCart(getCart());
      if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) return;
      if (syncTimer) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        syncCart().catch(() => {
          toast.error("Unable to save cart. Please try again.");
        });
      }, 300);
    }

    window.addEventListener("udai-cart-changed", handleCartChanged);
    return () => {
      if (syncTimer) window.clearTimeout(syncTimer);
      window.removeEventListener("udai-cart-changed", handleCartChanged);
    };
  }, [syncCart]);

  async function mergeLocalCart() {
    const localCart = getCart();
    const response = await apiClient.post<{ success: true; data: { items: CartItem[] } }>("/user/cart/merge", {
      items: localCart,
    });
    saveCart(response.data.data.items, { notify: false });
    setCart(getCart());
  }

  async function login(input: LoginInput) {
    const response = await apiClient.post<{ success: true; data: AuthResponse }>("/auth/login", input);
    window.localStorage.setItem(AUTH_TOKEN_KEY, response.data.data.token);
    await mergeLocalCart();
    await refreshUserData();
  }

  async function signup(input: SignupInput) {
    await apiClient.post("/auth/signup", input);
  }

  async function verifySignupOtp(input: { email: string; otp: string }) {
    const response = await apiClient.post<{ success: true; data: AuthResponse }>("/auth/signup/verify", input);
    window.localStorage.setItem(AUTH_TOKEN_KEY, response.data.data.token);
    await mergeLocalCart();
    await refreshUserData();
  }

  async function sendOtp(identifier: string) {
    await apiClient.post("/auth/send-otp", { identifier });
  }

  async function requestPasswordReset(email: string) {
    await apiClient.post("/auth/forgot-password", { email });
  }

  async function resetPassword(input: { email: string; otp: string; password: string }) {
    await apiClient.post("/auth/reset-password", input);
  }

  function logout() {
    clearSession();
    toast.success("Signed out.");
  }

  async function addAddress(input: AddressInput) {
    const response = await apiClient.post<{ success: true; data: UserAddress }>("/user/address", input);
    setAddresses((current) => [response.data.data, ...current]);
    return response.data.data;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      orders,
      addresses,
      cart,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      verifySignupOtp,
      sendOtp,
      requestPasswordReset,
      resetPassword,
      syncCart,
      logout,
      refreshUserData,
      addAddress,
    }),
    [addresses, cart, isLoading, orders, refreshUserData, syncCart, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
