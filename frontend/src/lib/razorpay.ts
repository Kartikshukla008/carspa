"use client";

import { api } from "./api";
import { RazorpayOrderData, BookingResponse } from "@/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Dynamically loads the official Razorpay Checkout SDK script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface LaunchRazorpayOptions {
  orderData: RazorpayOrderData;
  onSuccess: (booking: BookingResponse, payment: any) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

/**
 * Launches the official Razorpay checkout modal configured for Indian payment methods:
 * - UPI: Google Pay, PhonePe, Paytm, BHIM, UPI QR, Intent
 * - Cards: Visa, MasterCard, RuPay, Maestro
 * - NetBanking: All major Indian banks
 * - Wallets: Paytm, PhonePe, etc.
 */
export async function launchRazorpayCheckout({
  orderData,
  onSuccess,
  onFailure,
  onDismiss,
}: LaunchRazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error(
      "Razorpay payment gateway failed to load. Please check your internet connection and try again."
    );
  }

  const options = {
    key: orderData.key_id,
    amount: orderData.amount, // in paise
    currency: orderData.currency || "INR",
    name: "CARSPA Detailing",
    description: `${orderData.service_name || "Car Wash"} • ${orderData.vehicle_name || "Vehicle"}`,
    image: "/favicon.ico",
    order_id: orderData.order_id,
    prefill: {
      name: orderData.customer_name || "",
      email: orderData.customer_email || "",
      contact: orderData.customer_phone || "",
    },
    notes: {
      booking_reference: orderData.booking_reference,
      service: orderData.service_name || "",
      vehicle: orderData.vehicle_name || "",
    },
    theme: {
      color: "#06B6D4", // Electric cyan accent
      backdrop_color: "rgba(5, 8, 17, 0.85)",
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
      confirm_close: true,
      animation: true,
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        // Step: Always verify cryptographic signature server-side before treating as paid
        const verifyResult = await api.verifyRazorpayPayment({
          booking_reference: orderData.booking_reference,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        if (verifyResult.success) {
          onSuccess(verifyResult.booking, verifyResult.payment);
        } else {
          throw new Error(verifyResult.message || "Payment verification failed on server.");
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        if (onFailure) {
          onFailure(err);
        }
      }
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on("payment.failed", (response: any) => {
    console.error("Razorpay payment failed:", response.error);

    // Notify server of failure for tracking and safe retry
    api.reportRazorpayPaymentFailed({
      booking_reference: orderData.booking_reference,
      razorpay_order_id: orderData.order_id,
      error_code: response.error?.code,
      error_description: response.error?.description,
      error_metadata: response.error?.metadata,
    }).catch(() => {});

    if (onFailure) {
      onFailure(response.error);
    }
  });

  rzp.open();
}
