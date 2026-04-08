import paramiko

host = '204.168.227.113'
user = 'root'
password = r"c7?VPhjuYt'IyduJ,P+J"
local_path = 'fixed_main.py'
remote_path = '/root/oda_olcum_api/main.py'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password, timeout=10)
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    print("Yükleme basarili!")
    
    # Restart the application
    stdin, stdout, stderr = client.exec_command("pkill -f uvicorn")
    print("Uvicorn durduruldu:", stdout.read().decode())
    
    stdin, stdout, stderr = client.exec_command("cd /root/oda_olcum_api && nohup /root/oda_olcum_api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 9000 > app.log 2>&1 &")
    print("Uvicorn yeniden baslatildi.")
    
finally:
    client.close()
