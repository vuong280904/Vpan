// components/FacebookSDK.tsx
import { useEffect } from "react";
import { Platform } from "react-native";

export default function FacebookSDK() {
  useEffect(() => {
    // CHỈ load Facebook SDK trên web
    if (Platform.OS !== "web") {
      return; // Không làm gì trên Android/iOS → tránh lỗi document/window
    }

    // Nếu đã load rồi thì không load lại
    if ((window as any).FB) {
      return;
    }

    // Tạo script tag để load FB SDK
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      (window as any).FB.init({
        appId: "1501472567745202",
        cookie: true,
        xfbml: true,
        version: "v20.0", // cập nhật lên version mới nhất hiện tại (tháng 12/2025)
      });
      console.log("FB SDK loaded successfully");
    };

    script.onerror = () => {
      console.error("Failed to load Facebook SDK");
    };

    document.body.appendChild(script);

    // Cleanup khi component unmount (chỉ trên web)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}