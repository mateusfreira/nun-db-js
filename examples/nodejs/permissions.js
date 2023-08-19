const NunDb = require('../../index.js');
async function run() {
	const nunDb = new NunDb({ url: "ws://localhost:3058", db: "sample", user: "server", token: "server-pwd"});
	const keys  = await nunDb.keys();
	const value = await nunDb.get("name");
	console.log({ keys, value });
	try {
		await nunDb.set("name", "Jose");
		console.log(`This is correct`);
		process.exit(0);
	} catch (e) {
		console.error('This should not happen!!');
		process.exit(1);
	}
}
run();

