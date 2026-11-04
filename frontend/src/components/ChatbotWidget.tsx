"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  Phone,
  CreditCard,
  CheckCircle2,
  Calendar,
  Clock,
  Car,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import { launchRazorpayCheckout } from "@/lib/razorpay";

interface Message {
  id: string;
  sender: "USER" | "BOT";
  text: string;
  timestamp: string;
  intent?: string;
  quickReplies?: Array<{ label: string; action: string }>;
  action?: {
    type: string;
    payload?: any;
  } | null;
}

const DEFAULT_QUICK_REPLIES = [
  { label: "Book a car wash", action: "book" },
  { label: "Explore services", action: "services" },
  { label: "Check prices", action: "pricing" },
  { label: "Current offers", action: "offers" },
  { label: "Track my booking", action: "track" },
  { label: "Talk to support", action: "support" },
];

const WELCOME_MESSAGE = "Hey! Welcome to CARSPA. Looking to give your car some care?";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [hasUnread, setHasUnread] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or restore session and message history
  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedSessionId = localStorage.getItem("carspa_chat_session_id");
    if (!savedSessionId) {
      savedSessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("carspa_chat_session_id", savedSessionId);
    }
    setSessionId(savedSessionId);

    // Fetch user profile if logged in
    api.getChatProfile()
      .then((data) => {
        if (data?.authenticated) setUserProfile(data);
      })
      .catch(() => {});

    const savedHistory = localStorage.getItem("carspa_chat_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // Default welcome message
    const initialMsg: Message = {
      id: "welcome_1",
      sender: "BOT",
      text: WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickReplies: DEFAULT_QUICK_REPLIES,
    };
    setMessages([initialMsg]);
  }, []);

  // Save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("carspa_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when messages update or typing occurs
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (
    textToSend?: string,
    actionName?: string,
    paymentData?: any
  ) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text && !actionName) return;
    if (isTyping) return;

    setInput("");

    if (text) {
      const userMessage: Message = {
        id: `u_${Date.now()}`,
        sender: "USER",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsTyping(true);

    try {
      const res = await api.sendChatMessage({
        message: text,
        session_id: sessionId,
        action: actionName,
        payment_data: paymentData,
      });

      const botMessage: Message = {
        id: `b_${Date.now()}`,
        sender: "BOT",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        intent: res.intent,
        quickReplies: res.quick_replies?.length ? res.quick_replies : DEFAULT_QUICK_REPLIES,
        action: res.action || null,
      };

      setMessages((prev) => [...prev, botMessage]);
      if (!isOpen) setHasUnread(true);

      // Auto-launch Razorpay Checkout if action requires it
      if (res.action?.type === "LAUNCH_RAZORPAY" && res.action.payload) {
        handleTriggerRazorpay(res.action.payload);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "BOT",
        text: "I'm having a brief connection hiccup. Our doorstep services are operating normally! Feel free to book online or message our WhatsApp helpline at +91 70878 11881.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickReplies: [
          { label: "Book a car wash", action: "book" },
          { label: "Talk to support", action: "support" },
        ],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTriggerRazorpay = async (orderData: any) => {
    if (!orderData || !orderData.order_id) return;
    setIsPaying(true);

    try {
      await launchRazorpayCheckout({
        orderData,
        onSuccess: async (verifiedBooking, paymentRecord) => {
          await handleSendMessage("", "PAYMENT_SUCCESS", {
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: paymentRecord?.payment_id || paymentRecord?.id || "pay_success",
            razorpay_signature: paymentRecord?.signature || "sig_verified",
            booking_reference: orderData.booking_reference,
            amount: orderData.amount,
          });
        },
        onFailure: async (error) => {
          await handleSendMessage("", "PAYMENT_FAILED", {
            booking_reference: orderData.booking_reference,
            error: error?.description || "Payment failed",
          });
        },
        onDismiss: () => {
          // Closed by user without paying
        },
      });
    } catch (err) {
      console.error("Razorpay launcher error:", err);
    } finally {
      setIsPaying(false);
    }
  };

  const handleQuickReply = (qr: { label: string; action: string }) => {
    if (qr.action === "whatsapp") {
      window.open("https://wa.me/917087811881", "_blank");
      return;
    }
    // Clean leading emoji symbols so the user's bubble shows a natural, clean human reply
    const cleanLabel = qr.label.replace(/^[^\w\d(]+/, "").trim() || qr.label;
    handleSendMessage(cleanLabel, qr.action);
  };

  const handleResetChat = () => {
    const newSessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem("carspa_chat_session_id", newSessionId);

    const welcomeMsg: Message = {
      id: `w_${Date.now()}`,
      sender: "BOT",
      text: WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickReplies: DEFAULT_QUICK_REPLIES,
    };
    setMessages([welcomeMsg]);
    localStorage.setItem("carspa_chat_history", JSON.stringify([welcomeMsg]));
  };

  // Helper to render Markdown tables, bold text, bullet points, and headers
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    const elements: JSX.Element[] = [];
    let tableRows: string[] = [];

    const flushTable = (keyIndex: number) => {
      if (tableRows.length === 0) return;
      const parsedRows = tableRows.map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
      );

      // Filter out divider lines (like :--- | :---)
      const dataRows = parsedRows.filter(
        (r) => !r.every((c) => c.startsWith(":") || c.startsWith("-"))
      );

      if (dataRows.length > 0) {
        const headerRow = dataRows[0];
        const bodyRows = dataRows.slice(1);

        elements.push(
          <div key={`table_${keyIndex}`} className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#0B1220]/80 shadow-md">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-cyan-950/50 border-b border-white/10 text-cyan-300 font-bold">
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`px-3 py-1.5 ${cIdx === 0 ? "font-semibold text-slate-300" : "text-white"}`}>
                        {cell.replace(/\*\*/g, "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableRows = [];
    };

    lines.forEach((line, i) => {
      // Check if line is part of a markdown table
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        tableRows.push(line.trim());
        return;
      } else {
        flushTable(i);
      }

      // Check for headings (### )
      if (line.trim().startsWith("### ")) {
        elements.push(
          <h4 key={i} className="text-xs font-bold text-cyan-300 mt-2 mb-1 flex items-center gap-1.5">
            {line.replace("### ", "")}
          </h4>
        );
        return;
      }

      // Bold rendering regex (**word**)
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("✓")) {
        elements.push(
          <div key={i} className="flex items-start gap-1.5 my-0.5 text-xs text-slate-200">
            <span className="text-cyan-400 font-bold shrink-0">•</span>
            <span>{renderedLine}</span>
          </div>
        );
        return;
      }

      if (!line.trim()) {
        elements.push(<div key={i} className="h-1.5" />);
        return;
      }

      elements.push(
        <p key={i} className="text-xs text-slate-200 leading-relaxed">
          {renderedLine}
        </p>
      );
    });

    flushTable(lines.length);
    return elements;
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans select-none">
      {/* 1. Floating Chat Toggle Button */}
      {!isOpen && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse" />

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open CARSPA Support Chat"
            className="relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-[#0B1220] border border-cyan-500/40 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white animate-spin-slow" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1220]" />
            </div>

            <div className="hidden sm:flex flex-col text-left pr-1">
              <span className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                CARSPA Concierge
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                  AI
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Instant Prices &amp; Booking</span>
            </div>

            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-[#0B1220] rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* 2. Expandable Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[410px] h-[590px] max-h-[85vh] flex flex-col bg-[#0B1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#060A14] to-[#0F1B30] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-cyan-400/20 border border-cyan-500/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0B1220]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white tracking-tight">CARSPA Assistant</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {userProfile?.authenticated
                    ? `Logged in as ${userProfile.full_name || "Customer"}`
                    : "Doorstep Detailing • Chandigarh Tricity"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart Conversation"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "BOT" && (
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}

                <div className={`max-w-[88%] space-y-2 ${m.sender === "USER" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs ${
                      m.sender === "USER"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md"
                        : "bg-[#060A14] border border-white/10 text-slate-200 rounded-tl-none shadow-sm space-y-1"
                    }`}
                  >
                    {m.sender === "USER" ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    ) : (
                      <div>{renderFormattedText(m.text)}</div>
                    )}
                    <span
                      className={`text-[9px] block text-right mt-1 ${
                        m.sender === "USER" ? "text-cyan-200/80" : "text-slate-500"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Dynamic Action Trigger / Cards */}
                  {m.action && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {m.action.type === "LAUNCH_RAZORPAY" && m.action.payload && (
                        <button
                          type="button"
                          onClick={() => handleTriggerRazorpay(m.action?.payload)}
                          disabled={isPaying}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>
                            {isPaying ? "Launching Razorpay..." : `Pay ₹${(m.action.payload.amount / 100).toFixed(0)} via Razorpay`}
                          </span>
                        </button>
                      )}

                      {m.action.type === "BOOKING_CONFIRMED" && (
                        <Link
                          href={`/track?ref=${m.action.payload?.booking_reference || ""}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/80 shadow-md transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Track Appointment Live</span>
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                        </Link>
                      )}

                      {m.action.type === "NAVIGATE_TRACK" && (
                        <Link
                          href={`/track${m.action.payload?.reference ? `?ref=${m.action.payload.reference}` : ""}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
                        >
                          <span>Open Live Tracker</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </Link>
                      )}

                      {m.action.type === "NAVIGATE_SERVICES" && (
                        <Link
                          href="/services"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
                        >
                          <span>View Full Services Catalog</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </Link>
                      )}

                      {m.action.type === "OPEN_SUPPORT" && (
                        <a
                          href="https://wa.me/917087811881"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Chat on WhatsApp (+91 70878 11881)</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Quick Reply Pills */}
                  {m.quickReplies && m.quickReplies.length > 0 && m.id === messages[messages.length - 1]?.id && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {m.quickReplies.map((qr, qrIdx) => (
                        <button
                          key={qrIdx}
                          type="button"
                          onClick={() => handleQuickReply(qr)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-[#060A14] border border-white/10 rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div className="p-3 bg-[#060A14] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask prices, book wash, track van..."
                disabled={isTyping}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send Message"
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md shadow-cyan-500/25"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 text-center">
              <span className="text-[10px] text-slate-500">
                Doorstep Booking Engine • 100% Self-Powered Vans
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
