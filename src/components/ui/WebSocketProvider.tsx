"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import toast from "react-hot-toast";

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001");

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
      
      // Authenticate WebSocket connection
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];
      
      if (token) {
        ws.send(JSON.stringify({ type: "auth", token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        
        // Handle different message types
        switch (message.type) {
          case "attendance_update":
            toast.success(`${message.data.employeeName} ${message.data.action}`);
            break;
          case "leave_request":
            toast(`New leave request from ${message.data.employeeName}`, { icon: "📅" });
            break;
          case "announcement":
            toast(`📢 ${message.data.title}`, { duration: 5000 });
            break;
          case "system_notification":
            toast(message.data.message, { 
              icon: message.data.priority === "HIGH" ? "⚠️" : "ℹ️" 
            });
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
      
      // Don't auto-reload the page - just show disconnected status
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected");
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage }}>
      {children}
      
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}></div>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>
    </WebSocketContext.Provider>
  );
}
