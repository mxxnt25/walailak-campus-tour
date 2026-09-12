import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "jsr:@supabase/server@^1"

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (req, ctx) => {
      try {
        // รับ id ของผู้ใช้ที่ Admin ต้องการลบ
        const { userId } = await req.json()

        if (!userId) {
          return Response.json(
            {
              success: false,
              error: "userId is required",
            },
            { status: 400 }
          )
        }

        // id ของคนที่กำลังกด Delete
        const callerId = ctx.userClaims?.id

        if (!callerId) {
          return Response.json(
            {
              success: false,
              error: "Unauthorized",
            },
            { status: 401 }
          )
        }

        // เช็กว่า caller เป็น ADMIN จริงหรือไม่
        const { data: profile, error: profileError } =
          await ctx.supabase
            .from("profiles")
            .select("role")
            .eq("id", callerId)
            .single()

        if (profileError) {
          return Response.json(
            {
              success: false,
              error: profileError.message,
            },
            { status: 400 }
          )
        }

        if (profile?.role !== "ADMIN") {
          return Response.json(
            {
              success: false,
              error: "Admin only",
            },
            { status: 403 }
          )
        }

        // ป้องกัน Admin ลบบัญชีตัวเอง
        if (userId === callerId) {
          return Response.json(
            {
              success: false,
              error: "ไม่สามารถลบบัญชีตัวเองได้",
            },
            { status: 400 }
          )
        }

        // ลบบัญชีออกจาก Supabase Authentication จริง
        const { error: deleteError } =
          await ctx.supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          return Response.json(
            {
              success: false,
              error: deleteError.message,
            },
            { status: 400 }
          )
        }

        return Response.json({
          success: true,
          message: "ลบผู้ใช้เรียบร้อยแล้ว",
        })
      } catch (error) {
        console.error("Delete user error:", error)

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Delete user failed",
          },
          { status: 500 }
        )
      }
    }
  ),
}