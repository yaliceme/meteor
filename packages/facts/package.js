Package.describe({
  summary: "Publish internal and custom app statistics"
});

Package.on_use(function (api) {
  api.use(['livedata', 'underscore'], ['client', 'server']);
  api.use(['templating'], ['client']);

  api.add_files('facts.html', ['client']);
  api.add_files('facts.js', ['client', 'server']);
});
