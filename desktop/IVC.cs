using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Directory.SetCurrentDirectory(AppDomain.CurrentDomain.BaseDirectory);
        foreach (var key in new[] { "WEBVIEW2_USER_DATA_FOLDER", "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "WEBVIEW2_BROWSER_EXECUTABLE_FOLDER" })
            Environment.SetEnvironmentVariable(key, null, EnvironmentVariableTarget.Process);
        CoreWebView2Environment.SetLoaderDllFolderPath(AppDomain.CurrentDomain.BaseDirectory);
        var sid = System.Security.Principal.WindowsIdentity.GetCurrent().User.Value;
        bool first;
        using (var mutex = new Mutex(true, @"Local\IVC.Desktop." + sid, out first))
        using (var wake = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\IVC.Desktop.Open." + sid))
        {
            if (!first) { wake.Set(); return; }
            try { Application.Run(new CalculatorWindow(wake)); }
            catch { MessageBox.Show("IVC를 시작하지 못했습니다. 압축을 모두 푼 뒤 IVC.exe를 실행하세요.", "IVC", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            finally { mutex.ReleaseMutex(); }
        }
    }
}

internal sealed class CalculatorWindow : Form
{
    private readonly string root = AppDomain.CurrentDomain.BaseDirectory;
    private readonly string dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "IVC", "Desktop");
    private readonly Label status = new Label();
    private readonly Panel splash = new Panel();
    private readonly WebView2 browser = new WebView2();
    private readonly JavaScriptSerializer json = new JavaScriptSerializer();
    private readonly System.Windows.Forms.Timer wakeTimer = new System.Windows.Forms.Timer();
    private Process backend;
    private SetupDialog setup;
    private string origin;
    private bool closing, mayClose, failed;

    public CalculatorWindow(EventWaitHandle wake)
    {
        Text = "IVC · Interaction Visual Calculator";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1360, 920);
        MinimumSize = new Size(850, 620);
        AutoScaleMode = AutoScaleMode.Dpi;
        BackColor = Color.FromArgb(245, 248, 245);
        try { Icon = Icon.ExtractAssociatedIcon(Path.Combine(root, "IVC.exe")); } catch { }
        browser.Dock = DockStyle.Fill;
        browser.Visible = false;
        Controls.Add(browser);
        splash.Dock = DockStyle.Fill;
        splash.Padding = new Padding(48);
        var title = new Label { Text = "IVC", Font = new Font("Segoe UI", 38, FontStyle.Bold), ForeColor = Color.FromArgb(44, 79, 70), AutoSize = true, Location = new Point(48, 60) };
        var subtitle = new Label { Text = "Interaction Visual Calculator", Font = new Font("Segoe UI", 18), AutoSize = true, Location = new Point(52, 148) };
        status.Text = "개인용 계산기를 준비하고 있습니다…";
        status.Font = new Font("Segoe UI", 12);
        status.Location = new Point(54, 210);
        status.Size = new Size(680, 160);
        var footer = new Label { Text = "Think in relationships.\n\nCodespaces 없이 이 컴퓨터에서 실행합니다.\n창을 닫으면 계산기도 함께 종료됩니다.", Font = new Font("Segoe UI", 11), AutoSize = true, Location = new Point(54, 400) };
        splash.Controls.AddRange(new Control[] { title, subtitle, status, footer });
        Controls.Add(splash);
        var menu = new MenuStrip();
        var appMenu = new ToolStripMenuItem("IVC");
        appMenu.DropDownItems.Add("바탕 화면 바로가기 만들기", null, delegate { CreateShortcut(); });
        appMenu.DropDownItems.Add("개인 데이터 폴더 열기", null, delegate { try { Process.Start(new ProcessStartInfo("explorer.exe", Quote(dataRoot)) { UseShellExecute = true }); } catch { } });
        appMenu.DropDownItems.Add("종료", null, delegate { Close(); });
        menu.Items.Add(appMenu); MainMenuStrip = menu; Controls.Add(menu);
        wakeTimer.Interval = 200;
        wakeTimer.Tick += delegate {
            if (!wake.WaitOne(0)) return;
            if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
            Show(); BringToFront(); Activate();
        };
        wakeTimer.Start();
        Shown += delegate { StartBackend(); };
        FormClosing += CloseWindow;
    }

    private static string Quote(string value)
    {
        // Windows command-line quoting, including trailing backslashes.
        var text = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value)
        {
            if (c == '\\') { slashes++; continue; }
            text.Append('\\', c == '"' ? slashes * 2 + 1 : slashes);
            text.Append(c); slashes = 0;
        }
        return text.Append('\\', slashes * 2).Append('"').ToString();
    }

    private void CreateShortcut()
    {
        object shell = null, link = null;
        try
        {
            shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            link = shell.GetType().InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "IVC.lnk") });
            var type = link.GetType();
            type.InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { Path.Combine(root, "IVC.exe") });
            type.InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { root });
            type.InvokeMember("IconLocation", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { Path.Combine(root, "IVC.exe") + ",0" });
            type.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, link, null);
            MessageBox.Show(this, "바탕 화면에 IVC 바로가기를 만들었습니다. 앱 폴더를 이동하면 바로가기를 다시 만드세요.", "IVC");
        }
        catch { MessageBox.Show(this, "바로가기를 만들지 못했습니다. IVC.exe를 직접 실행할 수 있습니다.", "IVC"); }
        finally
        {
            if (link != null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(link);
            if (shell != null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(shell);
        }
    }

    private void OnUi(Action action)
    {
        if (IsDisposed || !IsHandleCreated) return;
        try { BeginInvoke(action); } catch (InvalidOperationException) { }
    }

    private void StartBackend()
    {
        try
        {
            Directory.CreateDirectory(dataRoot);
            var info = new ProcessStartInfo {
                FileName = Path.Combine(root, "runtime", "node.exe"),
                Arguments = Quote(Path.Combine(root, "app", "desktop", "backend.mjs")) + " --data-dir " + Quote(Path.Combine(dataRoot, "Data")) + " --dist " + Quote(Path.Combine(root, "app", "dist")),
                WorkingDirectory = Path.Combine(root, "app"),
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8
            };
            // No setup credentials or sharing configuration in the environment.
            info.EnvironmentVariables.Remove("IVC_ADMIN_PASSWORD");
            info.EnvironmentVariables.Remove("NODE_OPTIONS");
            info.EnvironmentVariables.Remove("NODE_PATH");
            backend = new Process { StartInfo = info, EnableRaisingEvents = true };
            backend.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) {
                if (e.Data == null || !e.Data.StartsWith("IVC_DESKTOP ", StringComparison.Ordinal)) return;
                var message = e.Data.Substring("IVC_DESKTOP ".Length);
                OnUi(delegate { Receive(message); });
            };
            // Drain stderr without persisting passwords, request bodies or logs.
            backend.ErrorDataReceived += delegate { };
            backend.Exited += delegate { OnUi(delegate { if (!closing) Fail("계산 프로세스가 종료됐습니다. 이 창을 닫고 IVC를 다시 실행하세요. 기존 데이터는 유지됩니다."); }); };
            backend.Start();
            backend.BeginOutputReadLine(); backend.BeginErrorReadLine();
        }
        catch { Fail("실행 파일을 찾지 못했습니다. ZIP 파일의 압축을 모두 푼 뒤 IVC.exe를 실행하세요."); }
    }

    private void Send(object command)
    {
        // ASCII JSON avoids Windows console-codepage changes to Unicode passwords.
        var encoded = json.Serialize(command);
        var ascii = new StringBuilder();
        foreach (char c in encoded) ascii.Append(c > 127 ? "\\u" + ((int)c).ToString("x4") : c.ToString());
        backend.StandardInput.WriteLine(ascii.ToString());
        backend.StandardInput.Flush();
    }

    private async void Receive(string message)
    {
        if (closing) return;
        try
        {
            var data = json.Deserialize<Dictionary<string, object>>(message);
            var type = data["type"] as string;
            if (type == "setup-required")
            {
                status.Text = "처음 한 번, 이 컴퓨터에서 사용할 계정을 설정합니다.";
                setup = new SetupDialog(delegate(string email, string password) {
                    try { Send(new { type = "setup", email, password }); }
                    catch { Fail("계정 설정 요청을 보내지 못했습니다. 앱을 다시 실행하세요."); }
                });
                setup.FormClosed += delegate { if (setup != null && !closing) Close(); };
                setup.Show(this);
            }
            else if (type == "setup-error")
            {
                if (setup != null) setup.ShowError(data["message"] as string);
            }
            else if (type == "ready")
            {
                if (setup != null) { var dialog = setup; setup = null; dialog.ClearPasswords(); dialog.Close(); }
                origin = data["origin"] as string;
                Uri entry;
                if (origin != "http://127.0.0.1:53173" || !Uri.TryCreate(data["entryUrl"] as string, UriKind.Absolute, out entry) || entry.GetLeftPart(UriPartial.Authority) != origin || entry.AbsolutePath != "/" || entry.UserInfo.Length != 0)
                    throw new InvalidOperationException();
                status.Text = "계산기 화면을 열고 있습니다…";
                // A valid persisted login opens the workspace directly. The
                // existing server redirects expired/anonymous sessions to login.
                await OpenCalculator(new Uri(origin + "/calculator"));
            }
            else if (type == "fatal") Fail(data["message"] as string);
        }
        catch { Fail("IVC 창을 준비하지 못했습니다. 앱을 다시 실행하세요."); }
    }

    private async Task OpenCalculator(Uri entry)
    {
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(dataRoot, "Browser"));
            if (closing) return;
            await browser.EnsureCoreWebView2Async(environment);
            if (closing) return;
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e) {
                Uri uri;
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) && uri.Scheme == "http" && uri.GetLeftPart(UriPartial.Authority) == origin && uri.UserInfo.Length == 0) return;
                e.Cancel = true;
                if (e.IsUserInitiated) OpenExternal(e.Uri);
            };
            browser.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e) {
                e.Handled = true;
                if (e.IsUserInitiated) OpenExternal(e.Uri);
            };
            browser.CoreWebView2.PermissionRequested += delegate(object sender, CoreWebView2PermissionRequestedEventArgs e) { e.State = CoreWebView2PermissionState.Deny; };
            browser.CoreWebView2.DownloadStarting += delegate(object sender, CoreWebView2DownloadStartingEventArgs e) {
                if (closing) { e.Cancel = true; return; }
                // Return from the WebView2 callback before showing a modal UI.
                // The deferral keeps the download alive without reentrancy.
                var deferral = e.GetDeferral();
                BeginInvoke(new Action(delegate {
                    try
                    {
                        if (closing) { e.Cancel = true; return; }
                        using (var save = new SaveFileDialog { FileName = Path.GetFileName(e.ResultFilePath), Title = "IVC 파일 저장", OverwritePrompt = true, Filter = "All files (*.*)|*.*" })
                        {
                            if (save.ShowDialog(this) != DialogResult.OK) { e.Cancel = true; return; }
                            e.ResultFilePath = save.FileName;
                            e.Handled = true;
                        }
                    }
                    catch { e.Cancel = true; }
                    finally { deferral.Complete(); }
                }));
            };
            browser.CoreWebView2.NavigationCompleted += delegate(object sender, CoreWebView2NavigationCompletedEventArgs e) {
                if (closing) return;
                if (!e.IsSuccess && e.WebErrorStatus == CoreWebView2WebErrorStatus.OperationCanceled) return;
                if (!e.IsSuccess) { Fail("계산기 화면을 열지 못했습니다. 앱을 닫고 다시 실행하세요."); return; }
                browser.Visible = true; splash.Visible = false;
            };
            browser.CoreWebView2.Navigate(entry.AbsoluteUri);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            Fail("Microsoft Edge WebView2 Runtime이 필요합니다. 한 번 설치한 뒤 IVC를 다시 실행하세요.");
            if (MessageBox.Show(this, "Microsoft 공식 WebView2 설치 페이지를 열까요?", "IVC", MessageBoxButtons.YesNo, MessageBoxIcon.Information) == DialogResult.Yes)
                OpenExternal("https://developer.microsoft.com/microsoft-edge/webview2/");
        }
    }

    private static void OpenExternal(string value)
    {
        Uri uri;
        if (!Uri.TryCreate(value, UriKind.Absolute, out uri) || (uri.Scheme != "https" && uri.Scheme != "http") || uri.UserInfo.Length != 0) return;
        try { Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }); } catch { }
    }

    private void Fail(string message)
    {
        if (closing || failed) return;
        failed = true;
        if (setup != null) { var dialog = setup; setup = null; dialog.ClearPasswords(); dialog.Close(); }
        browser.Visible = false; splash.Visible = true;
        status.Text = message ?? "IVC를 실행하지 못했습니다.";
        status.ForeColor = Color.FromArgb(143, 63, 45);
    }

    private async void CloseWindow(object sender, FormClosingEventArgs e)
    {
        if (mayClose) return;
        e.Cancel = true;
        if (closing) return;
        closing = true;
        wakeTimer.Stop();
        try
        {
            if (browser.CoreWebView2 != null)
            {
                var flush = browser.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new Event('pagehide'));");
                await Task.WhenAny(flush, Task.Delay(1500));
            }
        }
        catch { }
        browser.Dispose();
        if (setup != null) { setup.ClearPasswords(); setup.Close(); setup = null; }
        await Task.Run(delegate {
            try
            {
                if (backend != null && !backend.HasExited)
                {
                    Send(new { type = "stop" });
                    backend.StandardInput.Close();
                    if (!backend.WaitForExit(5000)) backend.Kill();
                }
            }
            catch { }
        });
        if (backend != null) backend.Dispose();
        wakeTimer.Dispose();
        mayClose = true;
        Close();
    }
}

internal sealed class SetupDialog : Form
{
    private readonly TextBox email = new TextBox { MaxLength = 254 };
    private readonly TextBox password = new TextBox { UseSystemPasswordChar = true, MaxLength = 128 };
    private readonly TextBox confirm = new TextBox { UseSystemPasswordChar = true, MaxLength = 128 };
    private readonly Label feedback = new Label();
    private readonly Button submit = new Button();

    public SetupDialog(Action<string, string> create)
    {
        Text = "IVC · 이 컴퓨터의 첫 계정";
        Size = new Size(560, 490);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterParent;
        Font = new Font("Segoe UI", 10);
        var note = new Label { Text = "처음 한 번만 설정합니다. 공유 사이트 계정과 별개의\n개인용 계정입니다. 비밀번호는 해시로만 저장합니다.", Location = new Point(28, 24), Size = new Size(490, 56) };
        Controls.Add(note);
        AddField("이메일", email, 92);
        AddField("비밀번호 (12~128자)", password, 168);
        AddField("비밀번호 확인", confirm, 244);
        feedback.Location = new Point(28, 320); feedback.Size = new Size(490, 48); feedback.ForeColor = Color.Maroon;
        submit.Text = "개인용 계정 만들기"; submit.Location = new Point(28, 374); submit.Size = new Size(490, 44);
        submit.Click += delegate {
            if (password.Text.Length < 12) { ShowError("비밀번호는 12자 이상으로 설정하세요."); return; }
            if (password.Text != confirm.Text) { ShowError("비밀번호 확인이 일치하지 않습니다."); return; }
            submit.Enabled = false; feedback.Text = "계정을 준비하고 있습니다…";
            create(email.Text.Trim(), password.Text);
        };
        Controls.Add(feedback); Controls.Add(submit); AcceptButton = submit;
    }
    private void AddField(string label, TextBox box, int top)
    {
        Controls.Add(new Label { Text = label, Location = new Point(28, top), AutoSize = true });
        box.Location = new Point(28, top + 26); box.Size = new Size(490, 28); Controls.Add(box);
    }
    public void ShowError(string text) { feedback.Text = text; submit.Enabled = true; }
    public void ClearPasswords() { password.Clear(); confirm.Clear(); }
}
