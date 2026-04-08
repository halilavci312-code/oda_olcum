import paramiko
import base64
import time

host = '204.168.227.113'
user = 'root'
password = r"c7?VPhjuYt'IyduJ,P+J"

# Yerel dosyayı oku ve base64'e çevir
with open('main_v6.py', 'rb') as f:
    content = f.read()
    
b64_content = base64.b64encode(content).decode('ascii')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"[{time.strftime('%H:%M:%S')}] Connecting via SSH to {host}...")
    client.connect(host, username=user, password=password, timeout=15)
    
    # 1. Base64 verisini sunucuya gönder ve çözüp main.py'ye yazdır (öncesinde yedeğini al)
    print(f"[{time.strftime('%H:%M:%S')}] Uploading fixed Python file...")
    cmd = (
        "cd /root/oda_olcum_api && "
        "cp main.py main_v4.bak && "
        f"echo '{b64_content}' | base64 -d > main.py"
    )
    
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        print(f"[{time.strftime('%H:%M:%S')}] Upload SUCCESS!")
    else:
        print("Upload Error:", stderr.read().decode())
        
    # 2. Arka planda çalışan eski uvicorn servisini bulup öldür ve yenisini başlat
    print(f"[{time.strftime('%H:%M:%S')}] Restarting API Service (Uvicorn)...")
    restart_cmd = (
        "cd /root/oda_olcum_api && "
        "pkill -f 'uvicorn.*main' ; "
        "sleep 1 ; "
        "source venv/bin/activate && "
        "nohup python main.py > app.log 2>&1 & "
        "sleep 2 ; "
        "curl -s http://localhost:9000/saglik"
    )
    
    stdin, stdout, stderr = client.exec_command(restart_cmd)
    out = stdout.read().decode().strip()
    
    print(f"[{time.strftime('%H:%M:%S')}] API Restart Output:")
    print("---------------------------------")
    print(out if out else "No output.")
    print("---------------------------------")
    
    if "aktif" in out.lower() or "versiyon" in out.lower():
        print(f"[{time.strftime('%H:%M:%S')}] API is healthy and running!")
    else:
        print("API Health Check Failed or no response.")
        
finally:
    client.close()
