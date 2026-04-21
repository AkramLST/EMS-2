const { default: fetch } = await import("node-fetch");

async function cookieTest() {
  try {
    console.log("=== Cookie Test ===");

    // Step 1: Login
    console.log("\n1. Logging in...");
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@ems.com",
        password: "admin123",
      }),
      credentials: "include",
    });

    console.log("Login response status:", loginResponse.status);
    console.log("Login response headers:", [
      ...loginResponse.headers.entries(),
    ]);

    const loginData = await loginResponse.json();
    console.log("Login successful:", loginData.message);

    if (!loginResponse.ok) {
      console.log("❌ Login failed");
      return;
    }

    // Step 2: Test auth/me endpoint
    console.log("\n2. Testing auth/me endpoint...");
    const meResponse = await fetch("http://localhost:3000/api/auth/me", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Me response status:", meResponse.status);
    console.log("Me response headers:", [...meResponse.headers.entries()]);

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log("✅ Auth check successful:", meData.user?.email);
    } else {
      console.log("❌ Auth check failed");
      const errorData = await meResponse.text();
      console.log("Error data:", errorData);
    }
  } catch (error) {
    console.error("Error during cookie test:", error);
  }
}

cookieTest();
