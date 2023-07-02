# Step to implement
- [x] Add this behind a feature flag called toogle-all
[examples/react/src/components/MainSection.js:13]
[examples/react/src/components/Footer.js:32]

## Hows
- [x] There will be a key in nun-db, user-feature 
```javascript
{
// [featureName]: true,
  toogleAll: true,
  clearAll: false,
}
```
-[x] Use `document.querySelectorAll('.feature-toogleAll').forEach(element => element.style.display= 'block')` hide or show.
- [x] Has to have a initial value ... with the default feature flags if nun-db is down
- [x] Create an atribute `data-feature="fearureName"`
- [x] Nun-db used here
[examples/react/src/nun.js:5 ]
- [x] Use useLayoutEffect to re-process on re-render disclaimer of performance.
- [x] Create nun-db effect
* Create 2 users ... one can read keys other than read and write ...
