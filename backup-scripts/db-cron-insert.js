db = connect("mongodb://fog99999:fog99999@localhost:27017/my-money-lover");

var cates = [
"63cecda8f93be3379cb820a4",
"63cfe1f5c5d4801be8af3d9d",
"63d27c0ca4c6e74bd026c9c9",
"63d27c9aa4c6e74bd026c9ca",
"63d27caba4c6e74bd026c9cb",
"63d27cd3a4c6e74bd026c9cc",
"63d27cdea4c6e74bd026c9cd",
"63d27d78a4c6e74bd026c9ce",
"63d27da2a4c6e74bd026c9cf",
"63d27dbea4c6e74bd026c9d0",
"63d27e02a4c6e74bd026c9d1",
"63d27e22a4c6e74bd026c9d2",
"63d27e8ea4c6e74bd026c9d3",
"63d27e9ca4c6e74bd026c9d4",
"63d28005a4c6e74bd026c9d7",
"63d2805ffdd54e10a819bc6a",
"63d28077fdd54e10a819bc6b",
"63d2808cfdd54e10a819bc6c",
"63d2809dfdd54e10a819bc6d",
"63d280acfdd54e10a819bc6e",
];

var wallets = [
"63d50169be5a4236eceab3e0",
"640d3ca622957f316c3b3d9c",
"644e2bdf7e3ea531b8d3429a",
"644e2dc27e3ea531b8d3429b",
"644e33387e3ea531b8d3429e",
"64560c4792e21647387356e5",
"64560c6192e21647387356e6",
];

var cateId = cates[Math.floor(Math.random()*cates.length)];
var walletId = wallets[Math.floor(Math.random()*wallets.length)];
var userId = "63d40c6184a8c142b8fde5bd";

var collection = db.getSiblingDB("my-money-lover").getCollection("transactions");
var newTransaction = {
	amount: Math.round(Math.random()*1000)*1000,
	category: ObjectId(cateId),
	wallet: ObjectId(walletId),
	note: new Date().toISOString(),
	user: ObjectId(userId),
	dateCreated: new Date(),
	dateUpdated: new Date(),
	isDelete: false
};
printjson(newTransaction);
collection.insert(newTransaction);
