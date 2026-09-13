import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "jsr:@supabase/server@^1"

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (req, ctx) => {
      try {
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

        // =====================================================
        // 1. ห้ามจัดการบัญชีตัวเอง
        // =====================================================

        if (callerId === userId) {
          return Response.json(
            {
              success: false,
              error: "ไม่สามารถจัดการบัญชีตัวเองได้",
            },
            { status: 400 }
          )
        }

        // =====================================================
        // 2. ตรวจ role ของผู้สั่ง
        // =====================================================

        const {
          data: callerProfile,
          error: callerError,
        } = await ctx.supabaseAdmin
          .from("profiles")
          .select("role, is_active")
          .eq("id", callerId)
          .single()

        if (callerError || !callerProfile) {
          return Response.json(
            {
              success: false,
              error: "ไม่พบข้อมูลผู้ใช้งานปัจจุบัน",
            },
            { status: 403 }
          )
        }

        if (!callerProfile.is_active) {
          return Response.json(
            {
              success: false,
              error: "บัญชีนี้ถูกปิดการใช้งานแล้ว",
            },
            { status: 403 }
          )
        }

        if (
          !["ADMIN", "SUPER_ADMIN"].includes(
            callerProfile.role
          )
        ) {
          return Response.json(
            {
              success: false,
              error: "Admin only",
            },
            { status: 403 }
          )
        }

        // =====================================================
        // 3. อ่านบัญชีเป้าหมาย
        // =====================================================

        const {
          data: targetProfile,
          error: targetError,
        } = await ctx.supabaseAdmin
          .from("profiles")
          .select(
            "id, email, full_name, role, is_active"
          )
          .eq("id", userId)
          .single()

        if (targetError || !targetProfile) {
          return Response.json(
            {
              success: false,
              error: "ไม่พบบัญชีผู้ใช้",
            },
            { status: 404 }
          )
        }

        if (!targetProfile.is_active) {
          return Response.json(
            {
              success: false,
              error: "บัญชีนี้ถูกปิดการใช้งานอยู่แล้ว",
            },
            { status: 409 }
          )
        }

        // =====================================================
        // 4. ADMIN จัดการได้เฉพาะ MEMBER / GUIDE
        // =====================================================

        if (
          callerProfile.role === "ADMIN" &&
          !["MEMBER", "GUIDE"].includes(
            targetProfile.role
          )
        ) {
          return Response.json(
            {
              success: false,
              error:
                "ADMIN ไม่มีสิทธิ์จัดการ ADMIN หรือ SUPER_ADMIN",
            },
            { status: 403 }
          )
        }

        // =====================================================
        // 5. ป้องกัน SUPER_ADMIN คนสุดท้าย
        // =====================================================

        if (targetProfile.role === "SUPER_ADMIN") {
          if (callerProfile.role !== "SUPER_ADMIN") {
            return Response.json(
              {
                success: false,
                error:
                  "เฉพาะ SUPER_ADMIN เท่านั้นที่จัดการ SUPER_ADMIN ได้",
              },
              { status: 403 }
            )
          }

          const {
            count: superAdminCount,
            error: countError,
          } = await ctx.supabaseAdmin
            .from("profiles")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("role", "SUPER_ADMIN")
            .eq("is_active", true)

          if (countError) {
            throw countError
          }

          if ((superAdminCount ?? 0) <= 1) {
            return Response.json(
              {
                success: false,
                error:
                  "ระบบต้องมี SUPER_ADMIN ที่ใช้งานอยู่อย่างน้อย 1 บัญชี",
              },
              { status: 400 }
            )
          }
        }

        // =====================================================
        // 6. ตรวจ Operational History
        // =====================================================

        const [
          bookingsResult,
          assignmentsResult,
          incidentsResult,
          reviewsResult,
        ] = await Promise.all([
          ctx.supabaseAdmin
            .from("bookings")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("user_id", userId),

          ctx.supabaseAdmin
            .from("guide_assignments")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("guide_id", userId),

          ctx.supabaseAdmin
            .from("incidents")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("reported_by", userId),

          ctx.supabaseAdmin
            .from("reviews")
            .select("id", {
              count: "exact",
              head: true,
            })
            .or(
              `user_id.eq.${userId},guide_id.eq.${userId}`
            ),
        ])

        const historyError =
          bookingsResult.error ||
          assignmentsResult.error ||
          incidentsResult.error ||
          reviewsResult.error

        if (historyError) {
          throw historyError
        }

        const hasHistory =
          (bookingsResult.count ?? 0) > 0 ||
          (assignmentsResult.count ?? 0) > 0 ||
          (incidentsResult.count ?? 0) > 0 ||
          (reviewsResult.count ?? 0) > 0

        // =====================================================
        // 7A. มี History -> DEACTIVATE
        // =====================================================

        if (hasHistory) {
          const now = new Date().toISOString()

          const {
            error: deactivateError,
          } = await ctx.supabaseAdmin
            .from("profiles")
            .update({
              is_active: false,
              deactivated_at: now,
              updated_at: now,
            })
            .eq("id", userId)

          if (deactivateError) {
            throw deactivateError
          }

          // Ban Auth account เป็นเวลา 100 ปี
          const {
            error: banError,
          } =
            await ctx.supabaseAdmin.auth.admin.updateUserById(
              userId,
              {
                ban_duration: "876000h",
              }
            )

          if (banError) {
            // rollback profile ถ้า ban ไม่สำเร็จ
            await ctx.supabaseAdmin
              .from("profiles")
              .update({
                is_active: true,
                deactivated_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId)

            throw banError
          }

          const { error: auditError } =
            await ctx.supabaseAdmin
              .from("audit_logs")
              .insert({
                actor_id: callerId,
                action: "USER_DEACTIVATED",
                target_type: "PROFILE",
                target_id: userId,
                old_data: {
                  role: targetProfile.role,
                  is_active: true,
                },
                new_data: {
                  role: targetProfile.role,
                  is_active: false,
                },
              })

          if (auditError) {
            console.error(
              "Audit insert failed:",
              auditError
            )
          }

          return Response.json({
            success: true,
            action: "DEACTIVATED",
            message:
              "บัญชีมีประวัติการใช้งาน จึงปิดการใช้งานแทนการลบ",
          })
        }

        // =====================================================
        // 7B. ไม่มี History -> HARD DELETE
        // =====================================================

        // ลบ avatar ก่อน เผื่อ Storage ownership กัน Auth delete
        const {
          data: avatarFiles,
          error: avatarListError,
        } = await ctx.supabaseAdmin.storage
          .from("avatars")
          .list(userId)

        if (!avatarListError && avatarFiles?.length) {
          const paths = avatarFiles.map(
            (file) => `${userId}/${file.name}`
          )

          const { error: avatarDeleteError } =
            await ctx.supabaseAdmin.storage
              .from("avatars")
              .remove(paths)

          if (avatarDeleteError) {
            console.error(
              "Avatar cleanup failed:",
              avatarDeleteError
            )
          }
        }

        const {
          error: deleteError,
        } =
          await ctx.supabaseAdmin.auth.admin.deleteUser(
            userId
          )

        if (deleteError) {
          throw deleteError
        }

        const { error: auditError } =
          await ctx.supabaseAdmin
            .from("audit_logs")
            .insert({
              actor_id: callerId,
              action: "USER_DELETED",
              target_type: "PROFILE",
              target_id: userId,
              old_data: {
                role: targetProfile.role,
                email: targetProfile.email,
              },
              new_data: null,
            })

        if (auditError) {
          console.error(
            "Audit insert failed:",
            auditError
          )
        }

        return Response.json({
          success: true,
          action: "DELETED",
          message: "ลบบัญชีผู้ใช้เรียบร้อยแล้ว",
        })
      } catch (error) {
        console.error(
          "Delete/deactivate user error:",
          error
        )

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Delete/deactivate user failed",
          },
          { status: 500 }
        )
      }
    }
  ),
}