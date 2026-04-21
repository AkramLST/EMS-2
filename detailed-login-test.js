const { default: fetch } = await import("node-fetch");

async function detailedLoginTest() {
  try {
    console.log("=== Detailed Admin Login Test ===");
    console.log("Testing admin login with admin@ems.com / admin123");

    // Step 1: Login
    console.log("\n1. Sending login request...");
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@ems.com",
        password: "admin123",
      }),
    });

    console.log("Login response status:", loginResponse.status);
    console.log("Login response headers:", [
      ...loginResponse.headers.entries(),
    ]);

    const loginData = await loginResponse.json();
    console.log("Login response data:", JSON.stringify(loginData, null, 2));

    if (!loginResponse.ok) {
      console.log("❌ Login failed");
      return;
    }

    console.log("✅ Login successful!");
    console.log("Token length:", loginData.token?.length);

    // Step 2: Test setting cookie (simulate what happens in browser)
    console.log("\n2. Simulating cookie setting...");
    console.log(
      "In browser, this would set: auth-token=" +
        (loginData.token?.substring(0, 20) + "...")
    );

    // Step 3: Test dashboard access with token
    console.log("\n3. Testing dashboard access with token...");
    const dashboardResponse = await fetch(
      "http://localhost:3000/api/dashboard/stats",
      {
        headers: {
          Authorization: `Bearer ${loginData.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Dashboard response status:", dashboardResponse.status);
    console.log("Dashboard response headers:", [
      ...dashboardResponse.headers.entries(),
    ]);

    const dashboardData = await dashboardResponse.json();
    console.log("Dashboard data:", JSON.stringify(dashboardData, null, 2));

    if (dashboardResponse.ok) {
      console.log("✅ Dashboard access successful!");
    } else {
      console.log("❌ Dashboard access failed");
    }

    // Step 4: Test me endpoint
    console.log("\n4. Testing /api/auth/me endpoint...");
    const meResponse = await fetch("http://localhost:3000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Me response status:", meResponse.status);
    const meData = await meResponse.json();
    console.log("Me response data:", JSON.stringify(meData, null, 2));
  } catch (error) {
    console.error("Error during detailed login test:", error);
  }
}

detailedLoginTest();
