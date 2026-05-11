import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId, token, deviceInfo } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: userId, token" },
        { status: 400 }
      );
    }

    const { data: existingToken, error: fetchError } = await supabase
      .from("fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing token:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing token" },
        { status: 500 }
      );
    }

    if (existingToken) {
      const { error: updateError } = await supabase
        .from("fcm_tokens")
        .update({
          device_info: deviceInfo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingToken.id);

      if (updateError) {
        console.error("Error updating token:", updateError);
        return NextResponse.json(
          { error: "Failed to update token" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Token updated successfully",
      });
    }

    const { error: insertError } = await supabase
      .from("fcm_tokens")
      .insert({
        user_id: userId,
        token,
        device_info: deviceInfo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      return NextResponse.json(
        { error: "Failed to save token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token saved successfully",
    });
  } catch (error: any) {
    console.error("Error in FCM token route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: userId, token" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("fcm_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);

    if (error) {
      console.error("Error deleting token:", error);
      return NextResponse.json(
        { error: "Failed to delete token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token deleted successfully",
    });
  } catch (error: any) {
    console.error("Error in FCM token delete route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tokens:", error);
      return NextResponse.json(
        { error: "Failed to fetch tokens" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tokens: tokens || [],
      count: tokens?.length || 0,
    });
  } catch (error: any) {
    console.error("Error in FCM token get route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
