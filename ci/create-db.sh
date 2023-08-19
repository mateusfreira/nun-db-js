nun-db -h http://localhost:9092 -u mateus -p mateus create-db -d sample -t sample-pwd && nun-db -h http://localhost:9092 -u mateus -p mateus exec 'use sample sample-pwd; create-user server server-pwd;create-user client client-pwd; use sample sample-pwd; set-permissions client r *|rwx client-*; use sample sample-pwd; set-permissions server rwx *; create-user test-uset test-user-pwd'

