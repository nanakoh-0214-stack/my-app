import http from "node:http";

// Render などの本番環境では PORT という環境変数が与えられるので、それを使うようにしておくぞ
const PORT = process.env.PORT || 8888;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // 日本語が文字化けしないよう UTF-8 を指定するのじゃ
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (url.pathname === "/") {
    console.log("GET / にアクセスがあったぞ");
    res.writeHead(200);
    res.end("こんにちは！");
  } else if (url.pathname === "/ask") {
    console.log("GET /ask にアクセスがあったぞ");
    const q = url.searchParams.get("q") ?? "質問がありません";
    res.writeHead(200);
    res.end(`お主の質問は '${q}' じゃな？`);
  } else {
    res.writeHead(404);
    res.end("ページが見つからんぞ");
  }
});

server.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
