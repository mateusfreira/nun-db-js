# Site analytics with Nun-db

The main goal for this analytics is to track visits to your website, respecting users' privacy, and simply using only Js and Nun-db.

## Goals

* count visits on a given day

* count visits online in real-time

* count return visitors

* page views

## Return visitors

I don't want this to add cookies to users machines (of course), so I will do this in the simplest way possible using storage when the user accesses the page; if it is the first time, I will give it a unique id to be used in the future accesses.

```js

//I concat Date.now() with an random big number to reduce the colision probability... this is not totally safe... but you know... in respect to users privacy I am ok with it :)

const userId = localStorage.getItem("userId") ---- `${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0]}`;

localStorage.setItem("userId", userId);//Store it on localStorage so it will repeat on all visits

```

Then I increment this user's visits.

```js

  nun.increment(userId);

```

Then I will increment all visits keys,

```js

 const dateStr = new Date().toISOString();

 nun.increment('visits');//Total visits

 nun.increment(`date_${dateStr.substr(0,10)}`);//today visits

 nun.increment(`page_${document.location.pathname}`);//Page visits

```

Done...

Now if you want to check the values here are some tricks...

```js
nun.keys().then(keys => {
  return Promise.all(keys.map(key => nun.getValue(key)
  .then((value) => ({
  value,
  key
  }))
  )
  )
})

.then(console.log)

```
