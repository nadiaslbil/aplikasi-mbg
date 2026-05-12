const app = require('./api/index');
const dotenv = require('dotenv');

dotenv.config();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
  console.log(`🚀 CORS allowed origin: ${process.env.FRONTEND_URL || 'https://aplikasi-mbg-theta.vercel.app'}`);
});
