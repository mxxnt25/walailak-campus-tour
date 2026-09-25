import { useEffect, useState } from "react";

import {
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from "react-router-dom";

import { Mail } from "lucide-react";

import { signIn } from "../../services/authService";
import { getProfile } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

import Button from "../../components/common/Button";
import PasswordField from "../../components/common/PasswordField";
import LoadingState from "../../components/common/LoadingState";
import campusBg from "../../assets/campus-bg.jpg";

import PublicLayout from "../../layouts/PublicLayout";

function getRoleHome(role) {
  switch (role) {
    case "GUIDE":
      return "/guide";

    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";

    case "MEMBER":
    default:
      return "/";
  }
}

function getSafeReturnTo(from) {
  if (!from || typeof from.pathname !== "string") {
    return null;
  }

  if (!from.pathname.startsWith("/") || from.pathname.startsWith("//")) {
    return null;
  }

  return [from.pathname, from.search || "", from.hash || ""].join("");
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { session, profile, loading: authLoading, profileLoading } = useAuth();

  const returnToFromState = getSafeReturnTo(location.state?.from);

  const returnToFromQuery = (() => {
    const value = searchParams.get("returnTo");

    if (!value) return null;
    if (!value.startsWith("/") || value.startsWith("//")) return null;

    return value;
  })();

  const returnTo = returnToFromState || returnToFromQuery;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading) {
      return;
    }

    if (session && profile) {
      navigate(returnTo || getRoleHome(profile.role), {
        replace: true,
      });
    }
  }, [session, profile, authLoading, profileLoading, navigate, returnTo]);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn(form);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      const userId = result.data?.user?.id || result.data?.session?.user?.id;

      if (!userId) {
        setError("ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้");
        return;
      }

      const profileResult = await getProfile(userId);

      if (!profileResult.success) {
        setError(
          profileResult.error?.message || "ไม่สามารถโหลดข้อมูลสิทธิ์ผู้ใช้ได้",
        );
        return;
      }

      navigate(returnTo || getRoleHome(profileResult.data?.role), {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (
    authLoading ||
    (session && profileLoading) ||
    (session && profile)
  ) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center bg-background">
        <LoadingState />
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="relative min-h-[calc(100vh-6rem)] overflow-hidden bg-background">
        {/* Shared public navbar is visible and interactive on auth pages too. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: `url(${campusBg})` }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white/60" />

      {/* =======================================================
          LOGIN CARD
      ======================================================= */}
      <div
        className="
          relative
          z-20
          min-h-[calc(100vh-6rem)]
          flex
          items-center
          justify-center
          px-4
          py-6
          sm:px-6
          sm:py-8
        "
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            w-full
            max-w-md
            min-w-0
            rounded-card
            border
            border-border
            bg-surface
            shadow-2xl
            cursor-default
            lg:flex
            lg:h-[560px]
            lg:w-[25cm]
            lg:max-w-[calc(100vw-80px)]
            lg:overflow-hidden
          "
        >
          {/* ===================================================
              ฝั่งซ้าย - รูปภาพ
          =================================================== */}
          <div
            className="
              relative
              hidden
              lg:flex
              lg:w-1/2
              lg:self-stretch
              bg-cover
              bg-center
              flex-col
              items-center
              justify-end
              p-8
            "
            style={{
              backgroundImage: `url(${campusBg})`,
            }}
          >
            <div
              className="
                absolute
                inset-0
                bg-gradient-to-t
                from-primary/90
                via-primary/50
                to-primary/20
              "
            />

            <div
              className="
                relative
                text-white
                text-center
                mb-[2cm]
              "
            >
              <h1
                className="
                  text-4xl
                  font-bold
                  leading-tight
                "
              >
                ยินดีต้อนรับกลับมา!
              </h1>

              <p
                className="
                  text-white/80
                  text-lg
                  mt-3
                "
              >
                เข้าสู่ระบบเพื่อจองทัวร์มหาวิทยาลัยวลัยลักษณ์
              </p>
            </div>
          </div>

          {/* ===================================================
              ฝั่งขวา - Login Form
          =================================================== */}
          <div
            className="
              w-full
              min-w-0
              flex
              items-center
              justify-center
              p-5
              sm:p-8
              lg:w-1/2
              lg:self-stretch
              lg:p-10
              lg:overflow-y-auto
            "
          >
            <div className="w-full min-w-0 max-w-sm">
              <h2
                className="
                  text-2xl
                  font-bold
                  text-textPrimary
                  mb-5
                "
              >
                เข้าสู่ระบบ
              </h2>
              <p className="mb-5 text-sm text-textSecondary lg:hidden">
                เข้าสู่ระบบเพื่อจองทัวร์และจัดการงานของคุณ
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Email */}
                <div className="relative">
                  <Mail
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-textSecondary
                    "
                    size={18}
                  />

                  <input
                    name="email"
                    type="email"
                    placeholder="อีเมล"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="
                      w-full
                      rounded-full
                      border
                      border-border
                      pl-11
                      pr-4
                      py-2.5
                      text-base
                      bg-background
                      text-textPrimary
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary
                    "
                  />
                </div>

                {/* Password */}
                <PasswordField
                  compact
                  leadingIcon
                  label="รหัสผ่าน"
                  name="password"
                  placeholder="รหัสผ่าน"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    onClick={(e) => e.stopPropagation()}
                    className="
                      text-sm
                      text-primary
                      font-medium
                      hover:underline
                    "
                  >
                    ลืมรหัสผ่าน?
                  </Link>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="
                      bg-danger/10
                      border
                      border-danger/30
                      text-danger
                      text-sm
                      rounded-input
                      px-3
                      py-2
                    "
                  >
                    {error}
                  </div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  size="md"
                  disabled={loading}
                  className="!rounded-full mt-2 w-full"
                >
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
              </form>

              {/* Register */}
              <p
                className="
                  text-center
                  text-sm
                  text-textSecondary
                  mt-5
                "
              >
                ยังไม่มีบัญชี?{" "}
                <Link
                  to="/register"
                  onClick={(e) => e.stopPropagation()}
                  className="
                    text-primary
                    font-medium
                    hover:underline
                  "
                >
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </PublicLayout>
  );
}
