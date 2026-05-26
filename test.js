const http = require('http');

const data = JSON.stringify({
  data: ["M", "1", "334", "4", "B", "Z", "a", "7"],
  file_b64: "BASE_64_STRING"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/bfhl',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", JSON.stringify(JSON.parse(responseData), null, 2));
  });
});

req.on('error', (error) => {
  console.error("Error calling API:", error.message);
});

req.write(data);
req.end();
