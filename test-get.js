const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/bfhl',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", JSON.parse(responseData));
  });
});

req.on('error', (error) => {
  console.error("Error calling API:", error.message);
});

req.end();
