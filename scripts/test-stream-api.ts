// Native fetch in Node 18+

async function testStreamApi() {
  console.log("Testing MAGI Stream API...");
  
  try {
    const response = await fetch("http://localhost:3000/api/magi/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Should we use nuclear energy?" }),
    });

    if (!response.ok) {
      console.error("API Error:", response.status, await response.text());
      return;
    }

    if (!response.body) {
      console.error("No response body");
      return;
    }

    // Node.js fetch response.body is a ReadableStream (web standard) in recent versions
    // but might differ slightly.
    
    // @ts-ignore
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    console.log("--- Stream Started ---");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('0:')) {
           const text = JSON.parse(line.substring(2));
           process.stdout.write(text);
        } else if (line.startsWith('2:')) {
           console.log("\n[DATA DETECTED]");
           const data = JSON.parse(line.substring(2));
           console.log(JSON.stringify(data, null, 2));
           console.log("-----------------");
        } else if (line.startsWith('e:')) {
            console.error("\n[ERROR]", line);
        }
      }
    }
    
    console.log("\n--- Stream Ended ---");

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testStreamApi();
