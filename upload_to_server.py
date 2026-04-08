import paramiko
import sys

host = '204.168.227.113'
user = 'root'
password = r"c7?VPhjuYt'IyduJ,P+J"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {host}...")
try:
    client.connect(host, username=user, password=password, timeout=30)
    print("Connected!")
    
    sftp = client.open_sftp()
    print("SFTP opened, uploading...")
    sftp.put('main_v5.py', '/root/oda_olcum_api/main.py')
    print("File uploaded!")
    sftp.close()
    
    # Restart the service
    print("Restarting API service...")
    stdin, stdout, stderr = client.exec_command("cd /root/oda_olcum_api && pkill -f 'uvicorn.*main' ; sleep 1 ; source venv/bin/activate && nohup python main.py > app.log 2>&1 &")
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print("STDOUT:", out)
    if err: print("STDERR:", err)
    
    import time
    time.sleep(3)
    
    # Verify it's running
    stdin2, stdout2, stderr2 = client.exec_command("curl -s http://localhost:9000/saglik")
    health = stdout2.read().decode()
    print("Health check:", health)
    
    print("DONE! API updated and restarted.")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    client.close()
