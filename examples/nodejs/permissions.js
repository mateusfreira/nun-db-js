const NunDb = require('../../index.js');
async function run() {
	const nunDb = new NunDb({ url: "ws://localhost:3012", db: "sample", user: "client", token: "client-pwd"});
	nunDb._logger = console;
	const keys  = await nunDb.keys();
	const value = await nunDb.get("name");
	console.log({ keys, value });
	try {
		await nunDb.set("name", "Jose");
		console.error('This should not happen!!');
	} catch (e) {
		console.log(`You cannot do that!`);
	}
}
run();

