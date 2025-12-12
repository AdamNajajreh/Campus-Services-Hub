import axios from "axios";

test("frontend health check - status 200", async () => {
  const response = await axios.get("http://localhost:3000");
  expect(response.status).toBe(200);
});

