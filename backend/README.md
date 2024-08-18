1. 20240518
# Migrate to mongodb 6.0.15
## download mongodb
## dump data from the old version
## download mongosh to connect to database
## download database tools, which includes mongodump, mongoresotre,...
## restore using mongorestore: mongorestore -u fog9999 -p fog9999 -h localhost --port 27018  --db my-money-lover --dir "..."
## start the DB by using Services - Windows
2. 20240818
# Middleware mappingRoleActions
## In dev mode, run in application level. In prod mode, run in a Lambda function
## Run after a change is made in permission, action, role, module tables, query: updateMany, save