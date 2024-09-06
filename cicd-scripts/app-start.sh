# MOST IMPORTANT LINE - INCUDE ALL PATHs (ENVIRONMENTs) FOR USER
source /home/ec2-user/.bash_profile
# restart nginx
echo "restart nginx"
sudo service nginx restart

# restart pm2
echo "restart pm2"
pm2 restart my-ml