//const nun = new NunDb('wss://ws.nundb.org', "analitcs-blog", "analitcs-blog-2903uyi9ewrj");
const nun = new NunDb('ws://localhost:3058', "analitcs-blog", "analitcs-blog-2903uyi9ewrj");
//const nun = new NunDb('ws://localhost:3058', "vue", "vue-pwd");
const dateStr = new Date().toISOString();
const userId = localStorage.getItem("userId") || `${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0]}`;
localStorage.setItem("userId", userId);
//nun.increment('visits');
//nun.increment(`user_${userId}`);
//nun.increment(`date_${dateStr.substr(0,10)}`); //Date
//nun.increment(`page_${document.location.pathname}`); //Page
//nun.increment(`lang_${navigator.language}`); //Langage

//const city = (new Date()).toString().split('(')[1].split(" ")[0].toUpperCase();
//nun.increment(`location_${city}`); //Location

