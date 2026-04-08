import paramiko
import sys

host = '204.168.227.113'
user = 'root'
password = r"c7?VPhjuYt'IyduJ,P+J"
command = sys.argv[1]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command)
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    if out:
        print("STDOUT:", out)
    if err:
        print("STDERR:", err)
        
finally:
    client.close()
