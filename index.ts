import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});