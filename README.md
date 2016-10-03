# fliplet-widget-data-directory

When update handlebars templates you need:
Install handlebars package
```
npm install handlebars -g
```

Precompile templates
```
handlebars templates/build/*.handlebars -m -f js/build-templates.js
handlebars templates/interface/*.handlebars -m -f js/interface-templates.js
```

---

To develop widgets, please follow our [widget development guide](https://github.com/Fliplet/fliplet-cli).

---

Install dependencies:

```
$ npm install fliplet-cli -g
```

---


Clone and run for development:

```
$ git clone https://github.com/Fliplet/fliplet-widget-data-directory.git
$ cd fliplet-widget-data-directory

$ fliplet run-widget
```
