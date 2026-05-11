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

    const { data: existingSubscription, error: fetchError } = await supabase
      .from("fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing subscription:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing subscription" },
        { status: 500 }
      );
    }

    if (existingSubscription) {
      return NextResponse.json({
        success: true,
        message: "Already subscribed",
        subscription: existingSubscription,
      });
    }

    const { data: newSubscription, error: insertError } = await supabase
      .from("fcm_tokens")
      .insert({
        user_id: userId,
        token,
        device_info: deviceInfo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating subscription:", insertError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to notifications",
      subscription: newSubscription,
    });
  } catch (error: any) {
    console.error("Error in subscribe route:", error);
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
      console.error("Error unsubscribing:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from notifications",
    });
  } catch (error: any) {
    console.error("Error in unsubscribe route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
