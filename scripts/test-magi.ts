const PROJECT_URL = "http://localhost:3000";

async function testMagi() {
  console.log("Testing MAGI API...");
  try {
    const response = await fetch(`${PROJECT_URL}/api/magi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Should AI replace humans in creative work?",
        includeDetails: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("--- MAGI Response ---");
    console.log("Decision:", data.decision);
    console.log("Sync Rate:", data.syncRate);
    console.log("Final Response:", data.response);
    
    if (data.agents) {
      console.log("\n--- Agent Perspectives ---");
      data.agents.forEach((agent: any) => {
        console.log(`[${agent.role}]: ${agent.content.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error("Test Failed:", error);
  }
}

testMagi();
