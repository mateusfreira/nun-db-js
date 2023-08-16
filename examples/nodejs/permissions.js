const NunDb = require('../../index.js');
async function run() {
	const nunDb = new NunDb({ url: "ws://localhost:3058", db: "sample", user: "client", token: "client-pwd"});
	nunDb._logger = console;
	const keys  = await nunDb.keys();
	const value = await nunDb.get("name");
	//console.log({ keys, value });
	try {
		await nunDb.set("name", "Jose");
		console.error('This should not happen!!');
		process.exit(1);
	} catch (e) {
		console.log(`This is correct`);
		process.exit(0);
	}
}
run();

