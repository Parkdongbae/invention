// 발명 도우미 교사용 로컬 서버 — dist를 내장 리소스로 서빙하는 단독 실행 파일
// .NET Framework 4 (Windows 기본 내장) csc로 컴파일. 외부 의존성 없음.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Reflection;
using System.Text;

static class Embedded
{
    public static string Read(string virtualPath)
    {
        for (int i = 0; i < Paths.Length; i++)
        {
            if (string.Equals(Paths[i], virtualPath, StringComparison.OrdinalIgnoreCase))
            {
                var asm = Assembly.GetExecutingAssembly();
                using (var s = asm.GetManifestResourceStream(Names[i]))
                {
                    if (s == null) return null;
                    using (var ms = new System.IO.MemoryStream())
                    {
                        s.CopyTo(ms);
                        return Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        }
        return null;
    }

    public static readonly string[] Names = EmbeddedNames.Values;
    public static readonly string[] Paths = EmbeddedPaths.Values;
}

static class Program
{
    static string MimeOf(string path)
    {
        string lower = path.ToLowerInvariant();
        if (lower.EndsWith(".html") || lower.EndsWith(".htm")) return "text/html; charset=utf-8";
        if (lower.EndsWith(".js")) return "application/javascript; charset=utf-8";
        if (lower.EndsWith(".css")) return "text/css; charset=utf-8";
        if (lower.EndsWith(".svg")) return "image/svg+xml";
        if (lower.EndsWith(".json")) return "application/json; charset=utf-8";
        if (lower.EndsWith(".png")) return "image/png";
        if (lower.EndsWith(".jpg") || lower.EndsWith(".jpeg")) return "image/jpeg";
        if (lower.EndsWith(".gif")) return "image/gif";
        if (lower.EndsWith(".ico")) return "image/x-icon";
        if (lower.EndsWith(".webmanifest")) return "application/manifest+json";
        if (lower.EndsWith(".woff2")) return "font/woff2";
        if (lower.EndsWith(".woff")) return "font/woff";
        if (lower.EndsWith(".txt")) return "text/plain; charset=utf-8";
        if (lower.EndsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    static void OpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception)
        {
            Console.WriteLine("브라우저 자동 열기에 실패했어요. 위 주소를 직접 열어 주세요.");
        }
    }

    static void Main()
    {
        try { Console.OutputEncoding = Encoding.UTF8; } catch (Exception) { }

        HttpListener listener = null;
        int port = 4174;
        for (; port < 4185; port++)
        {
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            try
            {
                listener.Start();
                break;
            }
            catch (Exception)
            {
                listener = null;
            }
        }
        if (listener == null)
        {
            Console.WriteLine("사용할 수 있는 포트가 없습니다 (4174~4184).");
            Console.WriteLine("아무 키나 누르면 종료합니다...");
            Console.ReadKey();
            return;
        }

        string url = "http://127.0.0.1:" + port + "/";
        Console.WriteLine("==================================================");
        Console.WriteLine("  발명 도우미 - 교사용 로컬 서버");
        Console.WriteLine("  주소   : " + url);
        Console.WriteLine("  종료   : 이 창을 닫거나 Ctrl+C를 누르세요");
        Console.WriteLine("==================================================");
        Console.WriteLine("브라우저를 여는 중...");

        OpenBrowser(url);

        while (true)
        {
            HttpListenerContext ctx;
            try
            {
                ctx = listener.GetContext();
            }
            catch (Exception)
            {
                break;
            }
            try
            {
                Handle(ctx);
            }
            catch (Exception)
            {
                try { ctx.Response.StatusCode = 500; ctx.Response.Close(); }
                catch (Exception) { }
            }
        }
    }

    static void Handle(HttpListenerContext ctx)
    {
        string raw = ctx.Request.Url.AbsolutePath;
        if (raw == "/" || raw.EndsWith("/")) raw = raw + "index.html";
        string virtualPath = raw.TrimStart('/');

        string b64 = Embedded.Read(virtualPath);
        if (b64 == null && !virtualPath.Contains("."))
        {
            virtualPath = "index.html";
            b64 = Embedded.Read(virtualPath);
        }

        if (b64 == null)
        {
            ctx.Response.StatusCode = 404;
            byte[] nf = Encoding.UTF8.GetBytes("404 Not Found");
            ctx.Response.ContentType = "text/plain; charset=utf-8";
            ctx.Response.ContentLength64 = nf.Length;
            ctx.Response.OutputStream.Write(nf, 0, nf.Length);
            ctx.Response.Close();
            return;
        }

        byte[] body = Convert.FromBase64String(b64);
        ctx.Response.StatusCode = 200;
        ctx.Response.ContentType = MimeOf(virtualPath);
        ctx.Response.ContentLength64 = body.Length;
        ctx.Response.AddHeader("Cache-Control", "no-cache");
        ctx.Response.OutputStream.Write(body, 0, body.Length);
        ctx.Response.Close();
    }
}
